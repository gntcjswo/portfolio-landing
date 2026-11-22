// postbuild check: no absolute root asset paths, forbidden strings, external CDNs,
// every chapter h2 present in the SSR HTML, exactly one h1, 169-work data, personal JSON-LD.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const out = resolve(dirname(fileURLToPath(import.meta.url)), "..", "out");
const walk = (d, acc = []) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    statSync(p).isDirectory() ? walk(p, acc) : acc.push(p);
  }
  return acc;
};

const problems = [];
const files = walk(out).filter((f) => /\.(html|txt|css|js|json)$/.test(f));

const absRe = /(["'`(\s,=]|\\")\/(_next|media|fonts)\//;
// Forbidden strings: exaggeration words, outsourcing / sales tone, and mail contact (applications go
// through job sites).
const forbidden =
  /최고|1위|압도적|독보적|무조건|견적|의뢰|맡기|맡길|함께할 작업|협업 제안|범위 문의|비용은 공개|귀사|랜딩페이지|mailto|메일 보내기|메일로|팀 생산성|API 연동|본인 기재|예시 화면|예시 연출|근거 ·|출처:|출처 ·|근무표|wb-schedule|ScrollMagic/;
const cdn =
  /(src|href)=["']https?:\/\/(?!github\.com|[a-z0-9-]+\.github\.io|[a-z0-9.-]+\.woobi\.co\.kr|[a-z0-9-]+\.netlify\.app|[a-z0-9.-]+\.web12\.kr|schema\.org)[^"']+\.(js|css|woff2?|mp4|webp|jpg|png)/i;

for (const f of files) {
  const s = readFileSync(f, "utf8");
  const rel = relative(out, f);
  const m = s.match(absRe);
  if (m && !f.endsWith(".json")) problems.push(`absolute path in ${rel}: …${s.slice(Math.max(0, m.index - 30), m.index + 40)}…`);
  const fb = s.match(forbidden);
  if (fb && !/node_modules/.test(rel)) problems.push(`forbidden "${fb[0]}" in ${rel}`);
  if (/\.html$/.test(f) && cdn.test(s)) problems.push(`external asset in ${rel}`);
}

const html = readFileSync(join(out, "index.html"), "utf8");
const h1 = (html.match(/<h1[\s>]/g) || []).length;
if (h1 !== 1) problems.push(`expected exactly 1 <h1>, found ${h1}`);

const h2s = [
  'id="shift-title"',
  "검색엔진과 AI가",
  "대표작",
  "첫 화면만 보지 마세요.",
  "다리를 놓습니다.",
  "AI가 쓴 코드는 검증합니다.",
  "기록으로.",
  "역할을 넓혀 왔습니다.",
  "무엇이 궁금하세요?",
  "<em>당신의 팀</em>에서",
];
const h1Text = "그려진 시안을,";
const missing = [h1Text, ...h2s].filter((t) => !t.split("|").some((x) => html.includes(x)));
if (missing.length) problems.push(`missing SSR copy: ${missing.join(" / ")}`);

const ids = ["q", "shift", "layers", "index", "scroll-through", "pipeline", "ai-dev", "proof", "start", "ask", "contact"];
const missingIds = ids.filter((id) => !html.includes(`id="${id}"`));
if (missingIds.length) problems.push(`missing chapter sections: ${missingIds.join(", ")}`);

for (const p of [
  "media/atlas/pf-atlas-96.jpg",
  "media/atlas/pf-atlas-192.jpg",
  "fonts/Paperlogy-7Bold.woff2",
  "media/data/portfolio.json",
  "media/img/og/woosung_og.png",
  "media/img/logo.svg",
  "media/img/favicon.ico",
  "media/img/sns/ico_github.svg",
  "media/video/reel/mobile-01.mp4",
]) {
  if (!existsSync(join(out, p))) problems.push(`missing asset ${p}`);
}

// 169 works, ids 0..168 (Boot TOTAL, 13×13 atlas, Hall/Index N, media p-000..168 all depend on it), and the
// shipped copy equals the bundled content/portfolio.json
const pfOut = join(out, "media/data/portfolio.json");
if (existsSync(pfOut)) {
  const shipped = JSON.parse(readFileSync(pfOut, "utf8"));
  const bundled = JSON.parse(readFileSync(resolve(out, "..", "content", "portfolio.json"), "utf8"));
  if (!Array.isArray(shipped) || shipped.length !== 169) problems.push(`portfolio.json: expected 169 works, found ${shipped.length}`);
  else if (!shipped.every((w, i) => w.id === i)) problems.push("portfolio.json: ids are not 0..168 in order");
  if (JSON.stringify(shipped) !== JSON.stringify(bundled)) problems.push("out/media/data/portfolio.json differs from content/portfolio.json");
  const projects = new Set(shipped.map((w) => w.project)).size;
  if (projects !== 134) problems.push(`portfolio.json: expected 134 unique projects, found ${projects}`);
}

// JSON-LD: personal schema only (no Organization / LocalBusiness, no phone / address)
const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("");
for (const t of ["Person", "WebSite", "ProfilePage", "FAQPage"]) if (!ld.includes(`"@type":"${t}"`)) problems.push(`JSON-LD missing ${t}`);
for (const t of ["Organization", "LocalBusiness", "telephone", "PostalAddress", "taxID", "email"]) if (ld.includes(t)) problems.push(`JSON-LD still has ${t}`);
for (const t of ['"name":"SEO·AEO·GEO는 무엇을 개선했나요?"', '"name":"AI로 개발 속도가 얼마나 달라졌나요?"', '"dateModified":"']) if (!ld.includes(t)) problems.push(`JSON-LD missing ${t}`);

// required copy
for (const t of ["WOOSUNG", "github.com/gntcjswo", "끝까지 봐 주셔서 감사합니다.", "5~7일 걸리던 업무를 1~2일로 줄였습니다", "No.170", "다음 화면은,", "만들겠습니다.", "견고한 마크업 위에,", "SEO·AEO·GEO", "라온비엔피 퍼블리싱팀"]) {
  const plain = html.replace(/<!-- -->/g, "");
  if (!plain.includes(t)) problems.push(`missing copy "${t}"`);
}

if (problems.length) {
  console.error("[verify-out] FAILED\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`[verify-out] OK — ${files.length} text files, 1 h1, 11 chapters, no absolute paths / forbidden strings`);
