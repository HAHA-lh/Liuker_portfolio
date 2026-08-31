import assert from "node:assert/strict";
import test from "node:test";

// Run against the retained local preview (or a production preview via env).
const origin = process.env.PORTFOLIO_TEST_ORIGIN || "http://localhost:3010";
async function page(path) {
  const response = await fetch(new URL(path, origin));
  assert.equal(response.status, 200, `${path} must render`);
  return response.text();
}

test("homepage preserves all sections, six projects, and click-only showreel", async () => {
  const html = await page("/");
  const main = html.split("</main>")[0];
  for (const id of ["top", "selected-work", "services", "about", "experience", "contact"]) {
    assert.match(main, new RegExp(`id="${id}"`));
  }
  assert.match(main, /TOOLS IN MOTION/);
  assert.match(main, /SHOW/);
  assert.match(main, /REEL/);
  assert.match(main, /THE NEXT/);
  assert.match(main, /FRAME\./);
  assert.match(main, /能力展示：能做什么/);
  assert.doesNotMatch(main, /我做什么/);
  assert.equal((main.match(/class="editorial-project-link"/g) || []).length, 6);
  const videos = main.match(/<video\b[^>]*>/g) || [];
  assert.equal(videos.length, 1, "showreel and project players must not mount on page load");
  assert.doesNotMatch(videos[0], /\bautoPlay\b|\bautoplay\b|\ssrc=/);
  assert.doesNotMatch(main, /contenteditable=/i);
});

test("archive retains the complete 20-project index", async () => {
  const main = (await page("/work")).split("</main>")[0];
  assert.equal((main.match(/class="editorial-index-project"/g) || []).length, 20);
  assert.match(main, /aria-label="Work filters"/);
});

test("featured work exposes a persistent, clearly labelled archive link", async () => {
  const main = (await page("/")).split("</main>")[0];
  const link = main.match(/<a\b[^>]*class="[^"]*\beditorial-all-work-link\b[^"]*"[^>]*>[\s\S]*?<\/a>/)?.[0];
  assert.ok(link, "the archive entry must remain a semantic link");
  assert.match(link, /href="\/work"/);
  assert.match(link, /查看全部作品/);
  assert.match(link, /20 个项目 · 完整作品索引/);
  assert.doesNotMatch(link, /motion-split/, "navigation text must not be hidden by the scroll mask");
  assert.match(link, /border-glow-card/);
  assert.match(link, /class="edge-light" aria-hidden="true"/);
});

test("glass menu preserves its button semantics and experience preserves its heading", async () => {
  const main = (await page("/")).split("</main>")[0];
  assert.match(main, /glass-surface--fallback sm-toggle-glass/);
  assert.match(main, /<button[^>]*class="sm-toggle"[^>]*aria-label="Open menu"[^>]*aria-expanded="false"[^>]*aria-controls="staggered-menu-panel"/);
  assert.match(main, /<h2 class="editorial-experience-heading">EXPERIENCE<\/h2>/);
  assert.match(main, /class="editorial-experience-track" aria-hidden="true"/);
});

test("capability heading has its own progressive fade without changing other headings", async () => {
  const main = (await page("/")).split("</main>")[0];
  const services = main.match(/<section\b[^>]*id="services"[^>]*>[\s\S]*?<\/section>/)?.[0];
  assert.ok(services);
  assert.match(services, /<h2><span class="motion-focus-heading"><span class="motion-split ">能力展示：能做什么<\/span><\/span><\/h2>/);
  assert.equal((main.match(/class="motion-focus-heading"/g) || []).length, 1);
  assert.doesNotMatch(services, /style="[^"]*(?:opacity:\s*0|visibility:\s*hidden)/);
});

for (const [slug, title] of [["afterglow", "百龄坛"], ["neon-pulse", "BMW"]]) {
  test(`${slug} retains its story, lazy player and project-specific share metadata`, async () => {
    const html = await page(`/work/${slug}`);
    assert.match(html, new RegExp(`<title>${title} — LIUKER</title>`));
    assert.match(html, new RegExp(`property="og:title" content="${title} — LIUKER"`));
    assert.match(html, /property="og:image" content="https:\/\/liuker-portfolio\.vercel\.app\/media\//);
    const main = html.split("</main>")[0];
    for (const label of ["CONCEPT", "PROCESS", "RESULT"]) assert.ok(main.includes(label));
    assert.doesNotMatch(main, /contenteditable=/i);
  });
}
