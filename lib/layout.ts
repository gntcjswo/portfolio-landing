// Layout helpers for GL ↔ DOM alignment. Offsets come from the offsetParent chain (layout boxes,
// transform-agnostic) and are only read on re-measure — never per frame.

export type Box = { x: number; y: number; w: number; h: number };

/** Box of `el` relative to `ancestor` (must be in its offsetParent chain); `null` ancestor = document. */
export function offsetWithin(el: HTMLElement, ancestor: HTMLElement | null): Box {
  let x = 0;
  let y = 0;
  let n: HTMLElement | null = el;
  while (n && n !== ancestor) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

/**
 * Viewport top (px) of a PinSection's sticky stage for a given scroll: it scrolls in, sticks at 0 for
 * S px, then scrolls out. When the section is not pinned (reduced motion / mobile flow) it just scrolls.
 */
export function stageTop(sec: { top: number; S: number }, scroll: number, pinned: boolean) {
  if (!pinned || scroll < sec.top) return sec.top - scroll;
  if (scroll <= sec.top + sec.S) return 0;
  return sec.top + sec.S - scroll;
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const range = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
