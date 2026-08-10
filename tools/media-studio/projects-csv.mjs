import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const PROJECT_HEADERS = [
  "order",
  "slug",
  "template_slug",
  "title_zh",
  "title_en",
  "category_zh",
  "category_en",
  "year",
  "role_zh",
  "role_en",
  "duration",
  "preview_video",
  "full_video",
  "cover",
  "visual",
  "featured",
  "enabled",
];

const TEMPLATE_SLUGS = new Set([
  "afterglow",
  "neon-pulse",
  "quiet-tides",
  "kinetic-type",
  "orbital-form",
  "nocturne",
]);

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  const source = String(text).replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
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

function escapeCsvCell(value) {
  const normalized = String(value ?? "");
  if (!/[",\r\n]/.test(normalized)) return normalized;
  return `"${normalized.replaceAll('"', '""')}"`;
}

export function serializeCsv(headers, records) {
  const lines = [headers.map(escapeCsvCell).join(",")];
  for (const record of records) {
    lines.push(headers.map((header) => escapeCsvCell(record[header])).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}

export async function readProjects(csvPath) {
  const csv = await fs.readFile(csvPath, "utf8");
  const [headerRow, ...dataRows] = parseCsv(csv);
  const headers = headerRow.map((header) => header.trim());
  for (const required of PROJECT_HEADERS) {
    if (!headers.includes(required)) throw new Error(`projects.csv 缺少字段：${required}`);
  }
  const records = dataRows.map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])),
  );
  return { csv, headers, records };
}

function clean(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

export function validateProjectMetadata(metadata) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metadata.slug || "")) {
    throw new Error("slug 只能包含小写字母、数字和连字符");
  }
  if (!TEMPLATE_SLUGS.has(metadata.templateSlug)) {
    throw new Error(`不支持的内容模板：${metadata.templateSlug}`);
  }
  if (!clean(metadata.titleZh) || !clean(metadata.titleEn)) {
    throw new Error("中文标题和英文标题不能为空");
  }
  for (const key of ["previewStart", "previewDuration", "posterTime"]) {
    if (metadata[key] === undefined) continue;
    const number = Number(metadata[key]);
    if (!Number.isFinite(number) || number < 0) throw new Error(`${key} 必须是非负数字`);
  }
  if (metadata.previewDuration !== undefined && Number(metadata.previewDuration) <= 0) {
    throw new Error("预览时长必须大于 0 秒");
  }
}

export function upsertProject(records, metadata, assets) {
  validateProjectMetadata(metadata);
  const existingIndex = records.findIndex((record) => record.slug.trim() === metadata.slug);
  const existing = existingIndex >= 0 ? records[existingIndex] : null;
  const replaceMetadata = !existing
    || metadata.updateExistingMetadata === true
    || String(metadata.updateExistingMetadata).toLowerCase() === "true";
  const maxOrder = records.reduce((max, record) => Math.max(max, Number.parseInt(record.order, 10) || 0), 0);
  const record = {
    order: existing?.order || String(maxOrder + 1),
    slug: metadata.slug,
    template_slug: replaceMetadata ? metadata.templateSlug : existing.template_slug,
    title_zh: replaceMetadata ? clean(metadata.titleZh, existing?.title_zh) : existing.title_zh,
    title_en: replaceMetadata ? clean(metadata.titleEn, existing?.title_en) : existing.title_en,
    category_zh: replaceMetadata ? clean(metadata.categoryZh, existing?.category_zh || "视频作品") : existing.category_zh,
    category_en: replaceMetadata ? clean(metadata.categoryEn, existing?.category_en || "Video Work") : existing.category_en,
    year: replaceMetadata ? clean(metadata.year, existing?.year || String(new Date().getFullYear())) : existing.year,
    role_zh: replaceMetadata ? clean(metadata.roleZh, existing?.role_zh || "创意 / 后期") : existing.role_zh,
    role_en: replaceMetadata ? clean(metadata.roleEn, existing?.role_en || "Concept / Post") : existing.role_en,
    duration: assets.duration,
    preview_video: assets.preview,
    full_video: assets.full,
    cover: assets.cover,
    visual: existing?.visual || "",
    featured: replaceMetadata
      ? metadata.featured === true || String(metadata.featured).toLowerCase() === "true" ? "TRUE" : "FALSE"
      : existing.featured,
    enabled: existing?.enabled || "TRUE",
  };

  const nextRecords = records.map((item) => ({ ...item }));
  if (existingIndex >= 0) nextRecords[existingIndex] = { ...existing, ...record };
  else nextRecords.push(record);
  return { records: nextRecords, mode: existing ? "updated" : "added", order: record.order };
}

export async function writeCsvAtomic(csvPath, headers, records) {
  await writeTextAtomic(csvPath, serializeCsv(headers, records));
}

export async function writeTextAtomic(filePath, contents) {
  const tempPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    await fs.writeFile(tempPath, contents, "utf8");
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
}
