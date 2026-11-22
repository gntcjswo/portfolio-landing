// postbuild: make out/ portable (servable from any sub-folder).
//  - HTML / RSC .txt: "/_next/…", "/media/…", "/fonts/…" → "./_next/…" relative to the file's folder
//  - CSS: url(/fonts/…) → url(../../../fonts/…) relative to the CSS file
//  - JS: runtime chunk base "/_next/" → "./_next/" (resolved against the document, i.e. index.html's folder)
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const out = resolve(dirname(fileURLToPath(import.meta.url)), "..", "out");
const ROOTS = ["_next", "media", "fonts"];

const walk = (d, acc = []) => {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
};

const toPosix = (p) => p.split(sep).join("/");
const prefixFor = (file) => {
  const rel = toPosix(relative(dirname(file), out));
  return rel ? rel + "/" : "./";
};

// absolute root reference inside quotes / url() / srcset / JSON (optionally JSON-escaped "\/")
const rootRe = new RegExp(`(["'\`(\\s,=]|\\\\")\\/(${ROOTS.join("|")})\\/`, "g");

let changed = 0;
const report = [];
for (const file of walk(out)) {
  const ext = file.slice(file.lastIndexOf("."));
  if (![".html", ".txt", ".css", ".js"].includes(ext)) continue;
  const src = readFileSync(file, "utf8");
  let next = src;

  if (ext === ".js") {
    // webpack / turbopack public path + any literal "/_next/" chunk base
    next = next
      .replace(/(__webpack_require__|\w)\.p\s*=\s*"\/_next\/"/g, '$1.p="./_next/"')
      .replace(/(["'`])\/_next\//g, "$1./_next/");
  } else {
    const pre = ext === ".css" ? prefixFor(file) : prefixFor(file);
    next = next.replace(rootRe, (m, lead, root) => `${lead}${pre}${root}/`);
  }

  if (next !== src) {
    writeFileSync(file, next);
    changed++;
    report.push(toPosix(relative(out, file)));
  }
}
console.log(`[relativize] rewrote ${changed} file(s)`);
if (process.env.VERBOSE) console.log(report.join("\n"));
