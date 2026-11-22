// Smoke test against a running static server: page + every referenced local asset must be 200.
// usage: node scripts/smoke-fetch.mjs [baseUrl]   (default http://127.0.0.1:18784/)
const base = process.argv[2] || "http://127.0.0.1:18784/";

const res = await fetch(base);
const html = await res.text();
console.log(`${res.status} ${base} (${html.length} bytes)`);
if (res.status !== 200) process.exit(1);
if (/(["'(\s])\/(_next|media|fonts)\//.test(html)) {
  console.error("absolute root path found in HTML");
  process.exit(1);
}

const urls = new Set();
for (const m of html.matchAll(/(?:src|href|poster|content)="(\.\/[^"#?]+)"/g)) urls.add(m[1]);
for (const m of html.matchAll(/url\((\.\/[^)]+)\)/g)) urls.add(m[1]);
const extra = ["./media/atlas/pf-atlas-96.jpg", "./media/atlas/pf-atlas.json", "./media/data/portfolio.json", "./media/video/pf/p-131.mp4", "./media/img/pf16/p-000.jpg", "./media/img/portfolio/pf-168.jpg"];
extra.forEach((u) => urls.add(u));

let bad = 0;
const cssUrls = [];
for (const u of urls) {
  const full = new URL(u, base).href;
  const r = await fetch(full);
  if (r.status !== 200) bad++;
  const body = await r.text();
  if (u.endsWith(".css")) {
    const css = body;
    for (const m of css.matchAll(/url\(([^)]+)\)/g)) {
      const v = m[1].replace(/["']/g, "");
      if (!v.startsWith("data:")) cssUrls.push(new URL(v, full).href);
    }
  }
  if (r.status !== 200 || process.env.VERBOSE) console.log(`${r.status} ${u}`);
}
for (const u of cssUrls) {
  const r = await fetch(u);
  await r.arrayBuffer();
  if (r.status !== 200) {
    bad++;
    console.log(`${r.status} (css) ${u}`);
  }
}
console.log(`${urls.size} html refs + ${cssUrls.length} css refs checked, ${bad} failed`);
process.exit(bad ? 1 : 0);
