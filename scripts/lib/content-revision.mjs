import { createHash } from "node:crypto";

function stableJson(source) {
  return JSON.stringify(JSON.parse(String(source)));
}

export function contentRevision({ projectsCsv, groupsJson, archiveJson }) {
  const normalized = [
    String(projectsCsv).replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim(),
    stableJson(groupsJson),
    stableJson(archiveJson),
  ].join("\n---\n");
  return createHash("sha256").update(normalized).digest("hex");
}
