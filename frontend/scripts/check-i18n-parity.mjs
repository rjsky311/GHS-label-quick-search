import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, "..");
const srcRoot = path.join(frontendRoot, "src");
const localeDir = path.join(srcRoot, "i18n", "locales");
const localeFiles = {
  "zh-TW": path.join(localeDir, "zh-TW.json"),
  en: path.join(localeDir, "en.json"),
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function walkFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "build" || entry.name === "node_modules") continue;
      walkFiles(fullPath, files);
      continue;
    }

    if (/\.[jt]sx?$/.test(entry.name)) files.push(fullPath);
  }
  return files;
}

function collectStaticKeys() {
  const keys = new Set();
  const sourceFiles = walkFiles(srcRoot);
  const callPattern = /\b(?:t|tx)\(\s*["'`]([^"'`]+)["'`]/g;
  const keyPropertyPattern =
    /\b(?:labelKey|descKey|tipKey|placeholderKey|nameKey)\s*:\s*["'`]([^"'`]+)["'`]/g;

  for (const file of sourceFiles) {
    const source = fs.readFileSync(file, "utf8");
    for (const pattern of [callPattern, keyPropertyPattern]) {
      let match;
      while ((match = pattern.exec(source))) {
        keys.add(match[1]);
      }
    }
  }

  return [...keys].sort();
}

const locales = Object.fromEntries(
  Object.entries(localeFiles).map(([locale, file]) => [locale, readJson(file)])
);
const localeKeys = Object.fromEntries(
  Object.entries(locales).map(([locale, messages]) => [locale, new Set(Object.keys(messages))])
);
const staticKeys = collectStaticKeys();
const failures = [];

for (const [locale, keys] of Object.entries(localeKeys)) {
  const missing = staticKeys.filter((key) => !keys.has(key));
  if (missing.length > 0) {
    failures.push(`${locale} is missing ${missing.length} referenced key(s):\n${missing.join("\n")}`);
  }
}

const [baseLocale, ...otherLocales] = Object.keys(localeKeys);
for (const locale of otherLocales) {
  const onlyBase = [...localeKeys[baseLocale]].filter((key) => !localeKeys[locale].has(key)).sort();
  const onlyOther = [...localeKeys[locale]].filter((key) => !localeKeys[baseLocale].has(key)).sort();
  if (onlyBase.length > 0) {
    failures.push(`${locale} is missing ${onlyBase.length} key(s) present in ${baseLocale}:\n${onlyBase.join("\n")}`);
  }
  if (onlyOther.length > 0) {
    failures.push(`${baseLocale} is missing ${onlyOther.length} key(s) present in ${locale}:\n${onlyOther.join("\n")}`);
  }
}

const cjkPattern = /[\u3400-\u9fff\uf900-\ufaff]/u;
const englishCjk = Object.entries(locales.en)
  .filter(([, value]) => typeof value === "string" && cjkPattern.test(value))
  .map(([key, value]) => `${key}: ${value}`);
if (englishCjk.length > 0) {
  failures.push(`en contains CJK text in ${englishCjk.length} value(s):\n${englishCjk.join("\n")}`);
}

if (failures.length > 0) {
  console.error(failures.join("\n\n"));
  process.exit(1);
}

console.log(
  `i18n parity OK: ${staticKeys.length} referenced keys, ` +
    `${localeKeys["zh-TW"].size} zh-TW keys, ${localeKeys.en.size} en keys.`
);
