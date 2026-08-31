import assert from "node:assert/strict";
import test from "node:test";
import { mediaRequestDecision } from "../app/security/media-policy.ts";

const video = new URL("https://liuker.space/media/projects/pv-full.mp4?v=1");
const browser = { "user-agent": "Mozilla/5.0 AppleWebKit/605.1.15 Safari/605.1.15" };
const decide = (headers = {}, url = video) => mediaRequestDecision(url, new Headers({ ...browser, ...headers }));

test("same-origin playback permits full preloads and Range seeks", () => {
  assert.equal(decide({ referer: "https://liuker.space/" }), "allow");
  assert.equal(decide({ referer: "https://liuker.space/work/pv", range: "bytes=1048576-" }), "allow");
  assert.equal(decide({ "sec-fetch-site": "same-origin" }), "allow");
});
test("local preview, official aliases and authenticated deployment previews still play", () => {
  assert.equal(decide({ referer: "http://localhost:3010/work/pv" }, new URL("http://localhost:3010/media/projects/pv-full.mp4")), "allow");
  assert.equal(decide({ referer: "http://127.0.0.1:3020/" }, new URL("http://localhost:3020/media/projects/pv-full.mp4")), "allow");
  assert.equal(decide({ referer: "http://127.0.0.1:3021/" }, new URL("http://localhost:3020/media/projects/pv-full.mp4")), "cross-site");
  assert.equal(decide({ referer: "http://127.0.0.1:3020/" }), "cross-site");
  assert.equal(decide({ referer: "https://liuker-portfolio.vercel.app/", "sec-fetch-site": "cross-site" }), "allow");
  const preview = new URL("https://liukerspace-preview-liuker.vercel.app/media/projects/pv-full.mp4");
  assert.equal(decide({ referer: `${preview.origin}/work/pv` }, preview), "allow");
});
test("no-context video links are denied, including browser address-bar navigation", () => {
  assert.equal(decide(), "direct-video");
  assert.equal(decide({ "sec-fetch-site": "none", "sec-fetch-dest": "document" }), "direct-video");
  assert.equal(decide({ origin: "https://liuker.space" }), "direct-video");
});
test("external, malformed, null and lookalike origins/referers are denied", () => {
  for (const value of ["https://example.org/", "https://liuker.space.example.org/", "https://liuker.space@example.org/", "null", "not a URL"]) {
    assert.equal(decide({ referer: value }), "cross-site");
    assert.equal(decide({ origin: value, referer: "https://liuker.space/" }), "cross-site");
  }
  assert.equal(decide({ "sec-fetch-site": "cross-site" }), "cross-site");
});
test("common download clients and AI crawlers cannot retrieve media", () => {
  for (const agent of ["curl/8", "Wget/1.2", "python-requests/2.32", "aiohttp/3", "Scrapy/2", "Go-http-client/1.1", "yt-dlp/2026", "GPTBot/1", "ClaudeBot/1", "Bytespider"]) {
    assert.equal(decide({ "user-agent": agent, referer: "https://liuker.space/", "sec-fetch-site": "same-origin" }), "automated-client");
  }
});
test("site pages and legitimate cover previews remain available", () => {
  assert.equal(decide({ "user-agent": "Googlebot" }, new URL("https://liuker.space/work")), "allow");
  assert.equal(decide({ "user-agent": "Twitterbot/1" }, new URL("https://liuker.space/media/projects/photo/pv.webp")), "allow");
  assert.equal(decide({}, new URL("https://liuker.space/media/publish-state.json")), "allow");
});
test("basic filtering explicitly does not claim to authenticate a spoofed browser", () => {
  assert.equal(decide({ referer: "https://liuker.space/", "sec-fetch-site": "same-origin" }), "allow");
});
