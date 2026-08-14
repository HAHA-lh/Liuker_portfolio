import assert from "node:assert/strict";
import test from "node:test";

import {
  PROJECT_HEADERS,
  parseCsv,
  serializeCsv,
  upsertProject,
  validateProjectMetadata,
} from "../tools/media-studio/projects-csv.mjs";

function project(overrides = {}) {
  return {
    order: "1",
    slug: "existing-project",
    template_slug: "afterglow",
    title_zh: "原中文标题",
    title_en: "Original title",
    category_zh: "品牌短片",
    category_en: "Brand Film",
    year: "2025",
    role_zh: "导演 / 后期",
    role_en: "Direction / Post",
    duration: "0:30",
    preview_video: "/media/projects/old-preview.mp4",
    full_video: "/media/projects/old-full.mp4",
    cover: "/media/projects/photo/old.webp",
    visual: "linear-gradient(#000,#111)",
    featured: "TRUE",
    enabled: "TRUE",
    ...overrides,
  };
}

function metadata(overrides = {}) {
  return {
    slug: "existing-project",
    templateSlug: "nocturne",
    titleZh: "不应覆盖",
    titleEn: "Must not replace",
    categoryZh: "广告",
    categoryEn: "Advertising",
    year: "2030",
    roleZh: "不应覆盖",
    roleEn: "Must not replace",
    featured: false,
    previewStart: 0,
    previewDuration: 8,
    ...overrides,
  };
}

const assets = {
  duration: "1:25",
  preview: "/media/projects/existing-project-preview.mp4",
  full: "/media/projects/existing-project-full.mp4",
  cover: "/media/projects/photo/existing-project.webp",
};

test("CSV round-trips Chinese, quotes, commas and Windows paths", () => {
  const source = project({
    title_zh: "中文，带逗号与\"引号\"",
    full_video: "I:\\工作室文件\\网站\\public\\media\\projects\\作品.mp4",
  });
  const serialized = serializeCsv(PROJECT_HEADERS, [source]);
  const [headers, values] = parseCsv(serialized);
  const restored = Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  assert.deepEqual(restored, source);
});

test("replacing an existing slug preserves editorial metadata by default", () => {
  const original = project();
  const before = structuredClone(original);
  const result = upsertProject([original], metadata(), assets);
  const updated = result.records[0];

  assert.equal(result.mode, "updated");
  assert.deepEqual(original, before, "input records must not be mutated");
  for (const field of [
    "order",
    "template_slug",
    "title_zh",
    "title_en",
    "category_zh",
    "category_en",
    "year",
    "role_zh",
    "role_en",
    "visual",
    "featured",
    "enabled",
  ]) {
    assert.equal(updated[field], original[field], `${field} should be preserved`);
  }
  assert.equal(updated.duration, assets.duration);
  assert.equal(updated.preview_video, assets.preview);
  assert.equal(updated.full_video, assets.full);
  assert.equal(updated.cover, assets.cover);
});

test("explicit metadata replacement updates editorial fields", () => {
  const result = upsertProject([project()], metadata({ updateExistingMetadata: true }), assets);
  assert.equal(result.records[0].title_zh, "不应覆盖");
  assert.equal(result.records[0].template_slug, "nocturne");
  assert.equal(result.records[0].year, "2030");
  assert.equal(result.records[0].featured, "FALSE");
});

test("a new slug is appended after the highest order", () => {
  const records = [project({ order: "2" }), project({ order: "7", slug: "another-project" })];
  const result = upsertProject(
    records,
    metadata({ slug: "new-project", titleZh: "新项目", titleEn: "New project" }),
    assets,
  );
  assert.equal(result.mode, "added");
  assert.equal(result.order, "8");
  assert.equal(result.records.at(-1).slug, "new-project");
});

test("invalid project metadata is rejected", () => {
  assert.throws(() => validateProjectMetadata(metadata({ slug: "../outside" })), /slug/);
  assert.throws(() => validateProjectMetadata(metadata({ templateSlug: "unknown" })), /模板/);
  assert.throws(() => validateProjectMetadata(metadata({ previewDuration: 0 })), /预览时长/);
});
