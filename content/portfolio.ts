// Work index data: content/portfolio.json (169 screens, id 0..168). The bundle imports this file;
// scripts/verify-out.mjs checks that the shipped copy media/data/portfolio.json is identical.
// `project` groups screens of one work: 169 = 134 unique works + 35 extra screens ("· 화면 0N").
import raw from "./portfolio.json";

export type Work = {
  id: number;
  name: string;
  client: string;
  category: string[];
  url: string;
  /** same key for every screen of one project (unique projects = projectCount) */
  project: string;
};

/** JSON urls carry repeated "&amp;amp;…" residue — collapse to a plain "&". */
export const decodeUrl = (u: string) => u.replace(/&(amp;)+/g, "&");

export const works: Work[] = (
  raw as { id: number; name: string; client: string; category: string[]; url: string; project?: string }[]
).map((w) => ({
  id: w.id,
  name: w.name,
  client: w.client,
  category: w.category,
  url: decodeUrl(w.url || ""),
  project: w.project ?? `w${w.id}`,
}));

export const pad3 = (n: number) => String(n).padStart(3, "0");

/** unique works (extra screens of one work count once) = 134 */
export const projectCount = new Set(works.map((w) => w.project)).size;

/** unique works having any of the given categories */
export const projectsIn = (cats: readonly string[]) =>
  new Set(works.filter((w) => w.category.some((c) => cats.includes(c))).map((w) => w.project)).size;

/** Category chips: count desc, "기타" always last. Computed, never hard-coded. */
export const categories: { name: string; count: number }[] = (() => {
  const m = new Map<string, number>();
  for (const w of works) for (const c of w.category) m.set(c, (m.get(c) ?? 0) + 1);
  const list = [...m.entries()].map(([name, count]) => ({ name, count }));
  list.sort((a, b) => (a.name === "기타" ? 1 : b.name === "기타" ? -1 : b.count - a.count));
  return list;
})();

/**
 * C05 showcase works (order id 0·4·3·2·1).
 * id 0 = CoAsia CM (selected tile in C04 → first work in C05), id 1 = mir9 (last card in C02, C03 L0, C04 anchor).
 * w/h = real pixel size of media/img/showcase/{file}.webp (1920px full-page captures scaled to 480 wide).
 */
export const showcase = [
  { id: 0, file: "coasiacm", w: 480, h: 1379 },
  { id: 4, file: "klb", w: 480, h: 1599 },
  { id: 3, file: "saladdays", w: 480, h: 5052 },
  { id: 2, file: "thomas", w: 480, h: 1232 },
  { id: 1, file: "mir9", w: 480, h: 1394 },
].map((s) => ({ ...s, work: works.find((w) => w.id === s.id)! }));

/** Deterministic "similar works" (same first category, seeded shuffle). Other screens of the same project first. */
export function similarWorks(w: Work, n = 3): Work[] {
  const pool = works.filter((x) => x.id !== w.id && x.category[0] === w.category[0]);
  let s = w.id * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const a = [...pool];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  a.sort((x, y) => Number(y.project === w.project) - Number(x.project === w.project));
  return a.slice(0, n);
}
