# Scripts

Local setup helpers and the optional demo-seed command land here starting
Phase 2, once there are entities to seed. Per the master spec: never seed
demo records in production — this must stay an explicit opt-in local flag.

## Supabase Storage bucket migration

`storage-migration/` contains the copy-first migration from the former shared
`sijill-app` bucket to `sijill-public` (attachments) and `sijill-private`
(database dumps). It preserves every object key and routes only `backups/`
objects to the private bucket.

1. Copy `storage-migration/migration.env.example` to
   `storage-migration/.env.migration.local` and fill it with the server-only
   S3 connection values from Supabase Storage configuration. The local file
   is ignored by Git; never commit or paste the keys into chat.
2. Install the pinned dependency with `npm install` in `storage-migration/`.
3. Run `npm run plan` and review the public/private counts.
   The plan blocks any non-backup object larger than the public bucket's
   2 MB limit before copying starts.
4. Run `npm run migrate`. The source is never deleted, existing matching
   destinations are verified and skipped, and mismatches stop safely.
5. Run `npm run verify`. A JSON manifest with per-object SHA-256 verification
   is written under ignored `infra/backups/`.

Do not update stored attachment URLs or delete the old bucket until the final
verification report has zero errors.
