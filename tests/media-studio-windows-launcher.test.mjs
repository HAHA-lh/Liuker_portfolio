import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const start = await readFile(new URL("../tools/media-studio/windows/Start-MediaStudio.ps1", import.meta.url), "utf8");
const stop = await readFile(new URL("../tools/media-studio/windows/Stop-MediaStudio.ps1", import.meta.url), "utf8");
const install = await readFile(new URL("../tools/media-studio/windows/Install-MediaStudio.ps1", import.meta.url), "utf8");
const uninstall = await readFile(new URL("../tools/media-studio/windows/Uninstall-MediaStudio.ps1", import.meta.url), "utf8");

test("launcher remains local-only and rejects unrelated port occupants", () => {
  assert.match(start, /127\.0\.0\.1/);
  assert.match(start, /Test-MediaStudioPage/);
  assert.match(start, /already used by another application/);
  assert.doesNotMatch(start, /0\.0\.0\.0/);
});

test("launcher performs the required media tool and Node preflight", () => {
  assert.match(start, /22\.13\.0/);
  assert.match(start, /FFMPEG_PATH/);
  assert.match(start, /FFPROBE_PATH/);
  assert.match(start, /Resolve-Executable/);
});

test("launcher state and logs are isolated under .media-studio", () => {
  assert.match(start, /\.media-studio/);
  assert.match(start, /media-studio\.pid\.json/);
  assert.match(start, /media-studio\.log/);
  assert.match(stop, /media-studio\.pid\.json/);
  assert.match(stop, /launcher-managed/);
});

test("launcher prefers browser app mode and falls back to the default browser", () => {
  assert.match(start, /--app=\$Url/);
  assert.match(start, /msedge\.exe/);
  assert.match(start, /chrome\.exe/);
  assert.match(start, /Start-Process -FilePath \$Url/);
});

test("installer is per-user, idempotent, and never enables startup", () => {
  assert.match(install, /GetFolderPath\("Desktop"\)/);
  assert.match(install, /GetFolderPath\("Programs"\)/);
  assert.match(install, /Copy-Item[\s\S]*-Force/);
  assert.match(install, /LIUKER Media Studio\.cmd/);
  assert.doesNotMatch(install, /CurrentVersion\\Run|Startup|schtasks/i);
});

test("uninstaller keeps website and media data", () => {
  assert.match(uninstall, /website, source files, videos, CSV and job data were kept/);
  assert.doesNotMatch(uninstall, /public\\media|content\\projects\.csv/);
  assert.match(uninstall, /\.media-studio\\runtime/);
});

test("all lifecycle scripts support non-mutating dry runs", () => {
  for (const source of [start, stop, install, uninstall]) assert.match(source, /\[switch\]\$DryRun/);
});
