import assert from "node:assert/strict";
import test from "node:test";

// Use a production build, not a dev server. Each allowed video probe reads
// only 1 KB; never download the portfolio or flood it to test the rate limit.
const origin = process.env.PORTFOLIO_TEST_ORIGIN || "http://127.0.0.1:3020";
const video = "/media/projects/pv-full.mp4";
const browser = "Mozilla/5.0 AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15";
const request = (path, headers = {}, method = "GET") => fetch(new URL(path, origin), {
  method,
  headers: { "user-agent": browser, ...headers },
  signal: AbortSignal.timeout(15000),
});

test("public pages retain rendering and baseline browser security headers", async () => {
  for (const path of ["/", "/work", "/work/afterglow"]) {
    const response = await request(path);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), "SAMEORIGIN");
    assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
    assert.match(response.headers.get("permissions-policy"), /camera=\(\)/);
    assert.match(response.headers.get("content-security-policy"), /frame-ancestors 'self'/);
    assert.equal(response.headers.get("x-powered-by"), null);
    await response.body.cancel();
  }
});

test("real middleware blocks unaffiliated, hotlinked and scraper video requests", async () => {
  for (const headers of [
    {},
    { referer: "https://example.org/" },
    { referer: `${origin}/`, origin: "https://example.org" },
    { referer: `${origin}/`, "user-agent": "python-requests/2.32" },
    { referer: `${origin}/`, "user-agent": "GPTBot/1.0" },
  ]) {
    const response = await request(video, { range: "bytes=0-1023", ...headers });
    assert.equal(response.status, 403);
    assert.match(response.headers.get("cache-control"), /no-store/);
    await response.body.cancel();
  }
});

test("legitimate Range playback survives a denied request and serves actual MP4 bytes", async () => {
  for (const headers of [{ referer: `${origin}/work/afterglow` }, { "sec-fetch-site": "same-origin" }]) {
    const response = await request(video, { ...headers, range: "bytes=0-1023" });
    assert.equal(response.status, 206);
    assert.match(response.headers.get("content-type"), /^video\/mp4/);
    assert.match(response.headers.get("content-range"), /^bytes 0-1023\//);
    assert.match(response.headers.get("x-robots-tag"), /noindex/);
    assert.equal(response.headers.get("cross-origin-resource-policy"), "same-origin");
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.length, 1024);
    assert.equal(bytes.subarray(4, 8).toString(), "ftyp");
  }
  const fullPreload = await request(video, { referer: `${origin}/` }, "HEAD");
  assert.equal(fullPreload.status, 200, "full hero preload must not require a Range header");
});

test("robots guidance is published without hiding the portfolio pages", async () => {
  const response = await request("/robots.txt");
  assert.equal(response.status, 200);
  const robots = await response.text();
  assert.match(robots, /User-agent: \*\s+Disallow: \/media\//);
  assert.match(robots, /User-agent: GPTBot/);
});

test("request-controlled forwarded hosts cannot poison home share metadata", async () => {
  const response = await request("/", { "x-forwarded-host": "example.org", "x-forwarded-proto": "http" });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /https:\/\/liuker\.space\/og/);
  assert.doesNotMatch(html, /https?:\/\/example\.org\/og/);
});
