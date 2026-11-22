// Copies the whitelisted assets from the source folders media/ and fonts/ into public/.
// media/ and fonts/ are only ever READ; every write lands inside public/.
import { copyFileSync, existsSync, mkdirSync, rmSync, statSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const project = resolve(here, "..");
const root = project;
const pub = join(project, "public");

const pad3 = (n) => String(n).padStart(3, "0");
const range169 = (fmt) => Array.from({ length: 169 }, (_, i) => fmt(pad3(i)));

// Whitelist (532 files).
const files = [
  ...["4Regular", "5Medium", "6SemiBold", "7Bold"].map((w) => `fonts/Paperlogy-${w}.woff2`),
  "media/img/logo.svg",
  "media/img/favicon.ico",
  "media/img/apple-touch-icon.png",
  "media/img/og/woosung_og.png",
  "media/img/sns/ico_github.svg",
  ...range169((n) => `media/img/pf16/p-${n}.jpg`),
  ...range169((n) => `media/img/portfolio/pf-${n}.jpg`),
  ...range169((n) => `media/video/pf/p-${n}.mp4`),
  ...["coasiacm", "klb", "saladdays", "thomas", "mir9"].map((n) => `media/img/showcase/${n}.webp`),
  "media/video/reel/mobile-01.mp4",
  "media/video/reel/mobile-01-poster.jpg",
  ...["thomas", "mir9", "klb", "jotech", "roopi", "coasia", "dkm", "mobiis"].map((n) => `media/video/hall/hall-${n}.mp4`),
  "media/data/portfolio.json",
];

let copied = 0;
let skipped = 0;
const missing = [];

for (const rel of files) {
  const src = join(root, rel);
  const dst = join(pub, rel);
  if (!dst.startsWith(pub + sep)) throw new Error(`refusing to write outside public/: ${dst}`);
  if (!existsSync(src)) {
    missing.push(rel);
    continue;
  }
  const s = statSync(src);
  if (existsSync(dst)) {
    const d = statSync(dst);
    if (d.size === s.size && d.mtimeMs >= s.mtimeMs) {
      skipped++;
      continue;
    }
  }
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
  copied++;
}

// Report stray files in public/media that are not on the whitelist (atlas output is generated, so allowed).
const allowed = new Set(files.map((f) => f.replaceAll("/", sep)));
const stray = [];
const walk = (dir) => {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else {
      const rel = relative(pub, p);
      if (!allowed.has(rel) && !rel.startsWith(join("media", "atlas"))) stray.push(rel);
    }
  }
};
walk(join(pub, "media"));
walk(join(pub, "fonts"));

// Stray files are stale copies from an earlier whitelist. public/ is a
// generated folder, so they are removed; otherwise they would ship in out/. Only public/ is touched.
const pruned = [];
for (const rel of stray) {
  const p = join(pub, rel);
  if (!p.startsWith(pub + sep)) continue;
  rmSync(p, { force: true });
  pruned.push(rel);
}
// folders left empty by the prune would otherwise ship as empty dirs in out/
const pruneEmpty = (dir) => {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) if (e.isDirectory()) pruneEmpty(join(dir, e.name));
  if (dir !== pub && dir.startsWith(pub + sep) && readdirSync(dir).length === 0) rmSync(dir, { recursive: true, force: true });
};
pruneEmpty(join(pub, "media"));

console.log(`[sync-media] copied ${copied}, up-to-date ${skipped}, missing ${missing.length}, removed ${pruned.length}`);
if (missing.length) console.warn("[sync-media] missing:\n  " + missing.join("\n  "));
if (pruned.length) console.warn("[sync-media] removed stale files not on the whitelist:\n  " + pruned.join("\n  "));
if (missing.length) process.exitCode = 1;
