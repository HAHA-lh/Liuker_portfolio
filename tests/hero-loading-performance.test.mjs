import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const heroMediaPath = new URL("../app/hero-media.ts", import.meta.url);
const loaderPath = new URL("../app/components/LoadingScreen.tsx", import.meta.url);
const homepagePath = new URL("../app/editorial-home.tsx", import.meta.url);
const configPath = new URL("../next.config.ts", import.meta.url);
const loaderVideoPath = new URL(
  "../public/media/loading/liuker-loading-v2.mp4",
  import.meta.url,
);

test("hero reveal no longer downloads the complete video into a Blob", async () => {
  const source = await readFile(heroMediaPath, "utf8");

  assert.doesNotMatch(source, /response\.body\.getReader/);
  assert.doesNotMatch(source, /URL\.createObjectURL/);
  assert.doesNotMatch(source, /new Blob\(/);
  assert.match(source, /objectUrl: source/);
  assert.match(source, /native ranged streaming/);
});

test("loader waits for a decoded hero frame without blocking on fonts", async () => {
  const [loader, homepage] = await Promise.all([
    readFile(loaderPath, "utf8"),
    readFile(homepagePath, "utf8"),
  ]);

  assert.match(loader, /void waitForFonts/);
  assert.match(loader, /heroFrameTask/);
  assert.match(loader, /MIN_REPEAT_VISIT_MS = 0/);
  assert.match(loader, /MAX_WAIT_MS = 2600/);
  assert.doesNotMatch(loader, /liuker-loading\.gif/);
  assert.match(loader, /liuker-loading-v2\.mp4\?v=20260901-fast/);
  assert.match(
    homepage,
    /preload=\{videoSource \? "metadata" : "none"\}/,
  );
});

test("loader animation is a lightweight, fast-start MP4", async () => {
  const [metadata, bytes] = await Promise.all([
    stat(loaderVideoPath),
    readFile(loaderVideoPath),
  ]);

  assert.ok(metadata.size < 120 * 1024, `loader is ${metadata.size} bytes`);
  assert.equal(bytes.subarray(4, 8).toString("ascii"), "ftyp");
});

test("versioned media receives a long immutable cache policy", async () => {
  const source = await readFile(configPath, "utf8");

  assert.match(source, /type: "query", key: "v", value: "\.\+"/);
  assert.match(source, /public, max-age=31536000, immutable/);
});
