// Device tier. Decided once on the client; can only be downgraded at runtime.
export type Tier = "high" | "mid" | "low" | "none";

export type TierInfo = {
  tier: Tier;
  dpr: [number, number];
  particles: number;
  post: "all" | "basic" | "off";
  /** C04·C05 use the DOM implementation instead of GL */
  domHeavyChapters: boolean;
  reducedMotion: boolean;
  reason: string;
};

const presets: Record<Tier, Omit<TierInfo, "tier" | "reducedMotion" | "reason">> = {
  high: { dpr: [1, 1.75], particles: 36000, post: "all", domHeavyChapters: false },
  mid: { dpr: [1, 1.5], particles: 22000, post: "basic", domHeavyChapters: false },
  low: { dpr: [1, 1.25], particles: 12000, post: "off", domHeavyChapters: true },
  none: { dpr: [1, 1], particles: 0, post: "off", domHeavyChapters: true },
};

let cached: TierInfo | null = null;
const listeners = new Set<(t: TierInfo) => void>();

function probeWebGL(): { ok: boolean; maxTex: number } {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return { ok: false, maxTex: 0 };
    const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return { ok: true, maxTex };
  } catch {
    return { ok: false, maxTex: 0 };
  }
}

export function detectTier(): TierInfo {
  if (cached) return cached;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const forced = new URLSearchParams(location.search).get("tier") as Tier | null;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const { ok, maxTex } = probeWebGL();
  const w = window.innerWidth;

  let tier: Tier;
  let reason: string;
  if (forced && forced in presets) {
    tier = forced;
    reason = "forced by ?tier";
  } else if (!ok) {
    tier = "none";
    reason = "no WebGL";
  } else if (w < 768 || maxTex < 4096 || nav.connection?.saveData) {
    tier = "low";
    reason = w < 768 ? "mobile width" : maxTex < 4096 ? "small MAX_TEXTURE_SIZE" : "saveData";
  } else if (
    (nav.hardwareConcurrency ?? 4) >= 8 &&
    (nav.deviceMemory === undefined || nav.deviceMemory >= 8) &&
    maxTex >= 8192 &&
    w >= 1024
  ) {
    tier = "high";
    reason = "8+ cores, 8GB+, 8K textures";
  } else {
    tier = "mid";
    reason = "desktop default";
  }
  cached = { tier, ...presets[tier], reducedMotion, reason };
  return cached;
}

/** Runtime downgrade (PerformanceMonitor decline x2, context loss). Never upgrades. */
export function downgradeTier(reason: string) {
  const cur = detectTier();
  const order: Tier[] = ["high", "mid", "low", "none"];
  const next = order[Math.min(order.indexOf(cur.tier) + 1, order.length - 1)];
  if (next === cur.tier) return;
  cached = { ...cur, tier: next, ...presets[next], reason };
  listeners.forEach((l) => l(cached!));
}

export function onTierChange(fn: (t: TierInfo) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
