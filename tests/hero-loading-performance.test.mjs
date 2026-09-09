import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const heroMediaPath = new URL("../app/hero-media.ts", import.meta.url);
const loaderPath = new URL("../app/components/LoadingScreen.tsx", import.meta.url);
const homepagePath = new URL("../app/editorial-home.tsx", import.meta.url);
const runtimePath = new URL("../app/media-runtime.ts", import.meta.url);
const configPath = new URL("../next.config.ts", import.meta.url);
const loaderVideoPath = new URL(
  "../public/media/loading/liuker-loading-v2.mp4",
  import.meta.url,
);
const heroPosterAvifPath = new URL(
  "../public/media/posters/home-hero-hq-v2.avif",
  import.meta.url,
);
const heroPosterWebpPath = new URL(
  "../public/media/posters/home-hero-hq-v2.webp",
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

test("hero starts immediately at high priority while the loader stays short", async () => {
  const [loader, homepage, runtime, heroMedia] = await Promise.all([
    readFile(loaderPath, "utf8"),
    readFile(homepagePath, "utf8"),
    readFile(runtimePath, "utf8"),
    readFile(heroMediaPath, "utf8"),
  ]);

  assert.match(loader, /void waitForFonts/);
  assert.match(loader, /MIN_REPEAT_VISIT_MS = 0/);
  assert.match(loader, /MAX_WAIT_MS = 900/);
  assert.doesNotMatch(loader, /requestIdleCallback/);
  assert.doesNotMatch(loader, /unlockMediaPriority/);
  assert.doesNotMatch(loader, /liuker-loading\.gif/);
  assert.match(loader, /liuker-loading-v2\.mp4/);
  assert.match(homepage, /autoPrimeHero\) requestVideo\(\);/);
  assert.match(
    homepage,
    /preload=\{videoSource \? "auto" : "none"\}/,
  );
  assert.match(homepage, /setAttribute\("fetchpriority", "high"\)/);
  assert.match(runtime, /mode: "constrained",\s*autoPrimeHero: true,[\s\S]*?heroQuality: "1080p"/);
  assert.match(heroMedia, /home-hero-hq-v2\.avif/);
  assert.match(heroMedia, /home-hero-hq-v2\.webp/);
});

test("hero fallback posters preserve the 1080p frame at useful quality", async () => {
  const [avif, webp] = await Promise.all([
    readFile(heroPosterAvifPath),
    readFile(heroPosterWebpPath),
  ]);

  assert.ok(avif.byteLength >= 18 * 1024 && avif.byteLength < 80 * 1024);
  assert.equal(avif.subarray(4, 8).toString("ascii"), "ftyp");
  assert.ok(webp.byteLength >= 30 * 1024 && webp.byteLength < 100 * 1024);
  assert.equal(webp.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(webp.subarray(8, 12).toString("ascii"), "WEBP");
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
