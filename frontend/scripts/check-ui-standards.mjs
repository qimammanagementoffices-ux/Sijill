import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = fileURLToPath(new URL("../src/", import.meta.url));

function sourceFiles(directory) {
  return readdirSync(directory)
    .flatMap((name) => {
      const path = join(directory, name);
      return statSync(path).isDirectory() ? sourceFiles(path) : [path];
    })
    .filter((path) => path.endsWith(".tsx"));
}

const files = sourceFiles(sourceRoot);
const failures = [];
let formFiles = 0;
let tableFiles = 0;
let appHeadings = 0;

for (const path of files) {
  const source = readFileSync(path, "utf8");
  const name = relative(sourceRoot, path).replaceAll("\\", "/");

  if (source.includes("<form")) formFiles += 1;

  if (source.includes("<table")) {
    tableFiles += 1;
    const hasStandardTableContainer = /className="[^"]*\btable-scroll\b/.test(source);
    const isSpecializedReport = /<table className="(?:ps-table|legacy-form-table)"/.test(source);
    if (!hasStandardTableContainer && !isSpecializedReport) {
      failures.push(`${name}: data table is missing the standard table-scroll container`);
    }
  }

  const usesStandaloneShell =
    name.startsWith("app/login/") ||
    name.startsWith("app/onboarding/") ||
    name.startsWith("app/public/") ||
    name === "components/AppShell.tsx" ||
    name === "components/ForcePinChange.tsx" ||
    name === "components/MaintenancePage.tsx";
  if (!usesStandaloneShell) {
    for (const line of source.split(/\r?\n/)) {
      if (line.includes("<h1")) {
        appHeadings += 1;
        if (!line.includes("section-title")) {
          failures.push(`${name}: application page heading is missing section-title`);
        }
      }
    }
  }

  const duplicatedControlStyle =
    /style=\{\{ border: "1\.5px solid var\(--line\)", borderRadius: (?:8|9), padding: "(?:6px 9px|8px 12px)"/;
  if (duplicatedControlStyle.test(source)) {
    failures.push(`${name}: form/table control duplicates the shared CSS standard inline`);
  }

  if (/className="panel-head" style=\{\{ justifyContent: "flex-end" \}\}/.test(source)) {
    failures.push(`${name}: action header must use panel-head-actions`);
  }
}

const css = readFileSync(join(sourceRoot, "app", "globals.css"), "utf8");
for (const selector of [
  '.field input:not([type])',
  '.table-input',
  '.table-actions',
  '.panel-head-actions',
  '.form-error-block',
]) {
  if (!css.includes(selector)) failures.push(`app/globals.css: missing shared standard ${selector}`);
}

if (failures.length > 0) {
  console.error("UI standards check failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(
  `UI standards check passed (${appHeadings} application headings, ${formFiles} form files, ${tableFiles} table files).`
);
