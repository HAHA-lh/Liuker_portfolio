import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(projectRoot, "content", "projects.csv");
const outputPath = path.join(projectRoot, "app", "project-rows.generated.ts");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (character === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  if (value || row.length) {
    row.push(value);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  }

  return rows;
}

function asBoolean(value, fallback = false) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "y", "是"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "否"].includes(normalized)) return false;
  return fallback;
}

function normalizeAsset(value) {
  let normalized = String(value ?? "")
    .trim()
    .replace(/^['"]+|['"]+$/g, "")
    .replaceAll("\\", "/");
  if (!normalized || /^(https?:|data:|blob:)/i.test(normalized)) return normalized;

  const publicDirectoryIndex = normalized.toLowerCase().lastIndexOf("/public");
  if (publicDirectoryIndex >= 0) {
    normalized = normalized.slice(publicDirectoryIndex + "/public".length);
  }

  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function normalizeCover(value) {
  return normalizeAsset(value).replace(/\.(?:jpe?g|png)$/i, ".webp");
}

const csvText = (await fs.readFile(sourcePath, "utf8")).replace(/^\uFEFF/, "");
const [headerRow, ...dataRows] = parseCsv(csvText);
const headers = headerRow.map((header) => header.trim());
const requiredHeaders = [
  "order",
  "slug",
  "template_slug",
  "title_zh",
  "title_en",
  "preview_video",
  "full_video",
  "cover",
  "enabled",
];
const templateSlugs = new Set([
  "afterglow",
  "neon-pulse",
  "quiet-tides",
  "kinetic-type",
  "orbital-form",
  "nocturne",
]);

for (const header of requiredHeaders) {
  if (!headers.includes(header)) {
    throw new Error(`projects.csv 缺少必填字段：${header}`);
  }
}

const records = dataRows.map((cells, rowIndex) => {
  const source = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  const slug = source.slug.trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`projects.csv 第 ${rowIndex + 2} 行 slug 无效：${slug || "（空）"}`);
  }
  const templateSlug = source.template_slug.trim() || "afterglow";
  if (!templateSlugs.has(templateSlug)) {
    throw new Error(`projects.csv 第 ${rowIndex + 2} 行 template_slug 无效：${templateSlug}`);
  }

  return {
    order: Number.parseInt(source.order, 10) || rowIndex + 1,
    slug,
    templateSlug,
    titleZh: source.title_zh.trim(),
    titleEn: source.title_en.trim(),
    categoryZh: source.category_zh.trim(),
    categoryEn: source.category_en.trim(),
    year: source.year.trim(),
    roleZh: source.role_zh.trim(),
    roleEn: source.role_en.trim(),
    duration: source.duration.trim(),
    previewVideo: normalizeAsset(source.preview_video),
    fullVideo: normalizeAsset(source.full_video),
    cover: normalizeCover(source.cover),
    visual: source.visual.trim(),
    featured: asBoolean(source.featured),
    enabled: asBoolean(source.enabled, true),
  };
});

const enabledRows = records
  .filter((record) => record.enabled)
  .sort((left, right) => left.order - right.order);
if (!enabledRows.length) {
  throw new Error("projects.csv 没有启用的作品，请至少保留一行 enabled=TRUE。");
}
const duplicateSlugs = enabledRows
  .map((record) => record.slug)
  .filter((slug, index, slugs) => slugs.indexOf(slug) !== index);

if (duplicateSlugs.length) {
  throw new Error(`projects.csv 存在重复 slug：${[...new Set(duplicateSlugs)].join(", ")}`);
}

const output = `// This file is generated from content/projects.csv. Do not edit it directly.\n\nexport const projectRows = ${JSON.stringify(enabledRows, null, 2)} as const;\n`;
await fs.writeFile(outputPath, output, "utf8");
console.log(`已同步 ${enabledRows.length} 个作品：content/projects.csv → app/project-rows.generated.ts`);
