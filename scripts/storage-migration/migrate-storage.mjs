import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const execute = process.argv.includes("--execute");
const verifyOnly = process.argv.includes("--verify-only");
const overwriteMismatch = process.argv.includes("--overwrite-mismatch");
const maxPublicObjectBytes = 2 * 1024 * 1024;

if (execute && verifyOnly) {
  throw new Error("Choose either --execute or --verify-only, not both");
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const endpoint = required("OBJECT_STORAGE_ENDPOINT").replace(/\/$/, "");
const region = required("OBJECT_STORAGE_REGION");
const sourceBucket = required("STORAGE_MIGRATION_SOURCE_BUCKET");
const publicBucket = required("OBJECT_STORAGE_BUCKET");
const privateBucket = required("OBJECT_STORAGE_BACKUP_BUCKET");

if (new Set([sourceBucket, publicBucket, privateBucket]).size !== 3) {
  throw new Error("Source, public, and private bucket names must all be different");
}

const client = new S3Client({
  endpoint,
  region,
  forcePathStyle: true,
  credentials: {
    accessKeyId: required("OBJECT_STORAGE_ACCESS_KEY"),
    secretAccessKey: required("OBJECT_STORAGE_SECRET_KEY"),
  },
});

function destinationFor(key) {
  return key === "backups" || key.startsWith("backups/") ? privateBucket : publicBucket;
}

async function listAll(bucket) {
  const objects = [];
  let continuationToken;
  do {
    const page = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: continuationToken })
    );
    for (const object of page.Contents ?? []) {
      if (object.Key) objects.push({ key: object.Key, size: Number(object.Size ?? 0) });
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);
  return objects;
}

async function head(bucket, key) {
  try {
    return await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode;
    if (status === 404 || error?.name === "NotFound" || error?.name === "NoSuchKey") return null;
    throw error;
  }
}

async function digest(bucket, key) {
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!response.Body) throw new Error(`Empty response body for s3://${bucket}/${key}`);
  const hash = createHash("sha256");
  for await (const chunk of response.Body) hash.update(chunk);
  return hash.digest("hex");
}

async function verifyPair(key, destinationBucket, expectedSize) {
  const destinationHead = await head(destinationBucket, key);
  if (!destinationHead) throw new Error(`Destination object is missing after copy`);
  // Supabase may omit Content-Length from HEAD for a zero-byte folder
  // placeholder. The subsequent SHA-256 comparison still proves equality.
  const destinationSize =
    destinationHead.ContentLength == null && expectedSize === 0
      ? 0
      : Number(destinationHead.ContentLength ?? -1);
  if (destinationSize !== expectedSize) {
    throw new Error(
      `Size mismatch: source=${expectedSize}, destination=${destinationHead.ContentLength ?? "unknown"}`
    );
  }
  const [sourceSha256, destinationSha256] = await Promise.all([
    digest(sourceBucket, key),
    digest(destinationBucket, key),
  ]);
  if (sourceSha256 !== destinationSha256) {
    throw new Error(`SHA-256 mismatch after copy`);
  }
  return sourceSha256;
}

async function copyOne(key, destinationBucket, expectedSize) {
  const source = await client.send(new GetObjectCommand({ Bucket: sourceBucket, Key: key }));
  if (!source.Body) throw new Error(`Empty source body`);
  await client.send(
    new PutObjectCommand({
      Bucket: destinationBucket,
      Key: key,
      Body: source.Body,
      ContentLength: source.ContentLength ?? expectedSize,
      ContentType: source.ContentType,
      CacheControl: source.CacheControl,
      ContentDisposition: source.ContentDisposition,
      ContentEncoding: source.ContentEncoding,
      ContentLanguage: source.ContentLanguage,
      Metadata: source.Metadata,
    })
  );
}

const startedAt = new Date();
const sourceObjects = await listAll(sourceBucket);
if (sourceObjects.length === 0) {
  throw new Error(`Source bucket ${sourceBucket} is empty; refusing to report a successful migration`);
}

const report = {
  startedAt: startedAt.toISOString(),
  mode: execute ? "execute" : verifyOnly ? "verify-only" : "plan",
  sourceBucket,
  publicBucket,
  privateBucket,
  publicObjectLimitBytes: maxPublicObjectBytes,
  totals: {
    sourceObjects: sourceObjects.length,
    sourceBytes: 0,
    publicObjects: 0,
    privateObjects: 0,
    overPublicLimit: 0,
  },
  results: [],
};

for (const object of sourceObjects) {
  const destinationBucket = destinationFor(object.key);
  report.totals.sourceBytes += object.size;
  if (destinationBucket === privateBucket) report.totals.privateObjects += 1;
  else report.totals.publicObjects += 1;

  const result = { key: object.key, size: object.size, destinationBucket };
  try {
    if (destinationBucket === publicBucket && object.size > maxPublicObjectBytes) {
      report.totals.overPublicLimit += 1;
      throw new Error(`Public object exceeds the 2 MB bucket limit`);
    }
    if (!execute && !verifyOnly) {
      result.status = "planned";
    } else {
      const existing = await head(destinationBucket, object.key);
      if (verifyOnly && !existing) throw new Error("Destination object is missing");

      if (existing) {
        const existingSize =
          existing.ContentLength == null && object.size === 0 ? 0 : Number(existing.ContentLength ?? -1);
        if (existingSize !== object.size && !overwriteMismatch) {
          throw new Error(
            `Destination exists with a different size (${existingSize}); use --overwrite-mismatch only after review`
          );
        }
        if (existingSize === object.size) {
          result.sha256 = await verifyPair(object.key, destinationBucket, object.size);
          result.status = "verified-existing";
          console.log(`verified  ${destinationBucket}/${object.key}`);
          report.results.push(result);
          continue;
        }
      }

      if (verifyOnly) throw new Error("Destination object does not match source");
      await copyOne(object.key, destinationBucket, object.size);
      result.sha256 = await verifyPair(object.key, destinationBucket, object.size);
      result.status = "copied-and-verified";
      console.log(`copied    ${destinationBucket}/${object.key}`);
    }
  } catch (error) {
    result.status = "error";
    result.error = error instanceof Error ? error.message : String(error);
    console.error(`failed    ${destinationBucket}/${object.key}: ${result.error}`);
  }
  report.results.push(result);
}

report.completedAt = new Date().toISOString();
report.totals.errors = report.results.filter((item) => item.status === "error").length;
report.totals.verified = report.results.filter((item) => item.status?.includes("verified")).length;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const reportDir = path.resolve(scriptDir, "../../infra/backups");
await mkdir(reportDir, { recursive: true });
const stamp = report.completedAt.replace(/[:.]/g, "-");
const reportPath = path.join(reportDir, `storage-migration-${stamp}.json`);
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");

console.log(`\nSource objects: ${report.totals.sourceObjects}`);
console.log(`Public target:  ${report.totals.publicObjects}`);
console.log(`Private target: ${report.totals.privateObjects}`);
console.log(`Over 2 MB:      ${report.totals.overPublicLimit}`);
console.log(`Errors:         ${report.totals.errors}`);
console.log(`Report:         ${reportPath}`);

if (report.totals.errors > 0) process.exitCode = 1;
