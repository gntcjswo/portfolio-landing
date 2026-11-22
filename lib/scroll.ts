"use client";
// Single scroll engine:
//  - one Lenis instance, autoRaf:false, driven by the ONE requestAnimationFrame loop below
//  - section rects measured only on resize / fonts / load and cached
//  - per-frame work reads cached numbers + lenis.scroll/velocity, writes CSS vars / uniforms only
import Lenis from "lenis";
import { useEffect, useSyncExternalStore } from "react";
import { chapters, type ChapterId } from "@/content/chapters";

export type SectionKind = "pin" | "flow";
type Section = {
  id: string;
  el: HTMLElement;
  kind: SectionKind;
  top: number;
  height: number;
  /** scrub distance in px (pin: height - vh; flow: height + vh) */
  S: number;
  p: number;
  lastWritten: number;
  /** flow only: last written `--in` (first viewport of the pass) and `--out` (last viewport) */
  lastIn?: number;
  lastOut?: number;
};

export type FrameState = {
  time: number;
  dt: number;
  scroll: number;
  velocity: number;
  vh: number;
  vw: number;
  activeId: ChapterId;
  pageP: number;
  progress: (id: string) => number;
};

type FrameHandler = (s: FrameState) => void;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

class ScrollEngine {
  lenis: Lenis | null = null;
  private sections = new Map<string, Section>();
  private handlers = new Set<FrameHandler>();
  private chapterListeners = new Set<() => void>();
  private raf = 0;
  private lastTime = 0;
  private lastScroll = -1;
  private dirty = true;
  private ro: ResizeObserver | null = null;
  private vh = 800;
  private vw = 1280;
  private docH = 1;
  private started = false;
  reducedMotion = false;
  activeId: ChapterId = "q";
  pageP = 0;
  /** GL hook: Stage registers R3F's invalidate() here; called only when the canvas has work. */
  invalidate: (() => void) | null = null;
  glNeedsFrame: (() => boolean) | null = null;
  stats = { frames: 0, glInvalidations: 0 };

  start() {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.lenis = new Lenis({
      lerp: 0.085,
      smoothWheel: !this.reducedMotion,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.2,
      syncTouch: false,
      autoRaf: false,
      anchors: false,
    });
    this.ro = new ResizeObserver(() => this.markDirty());
    this.ro.observe(document.documentElement);
    window.addEventListener("resize", this.markDirty);
    window.addEventListener("load", this.markDirty);
    document.fonts?.ready.then(this.markDirty);
    document.addEventListener("click", this.onAnchorClick);
    if (/[?&]debug\b/.test(location.search)) (window as unknown as Record<string, unknown>).__wsScroll = this;
    this.raf = requestAnimationFrame(this.tick);
    if (location.hash) {
      const id = location.hash.slice(1);
      requestAnimationFrame(() => this.scrollTo("#" + id, { immediate: true }));
    }
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    window.removeEventListener("resize", this.markDirty);
    window.removeEventListener("load", this.markDirty);
    document.removeEventListener("click", this.onAnchorClick);
    this.lenis?.destroy();
    this.lenis = null;
    this.started = false;
  }

  markDirty = () => {
    this.dirty = true;
  };

  register(id: string, el: HTMLElement, kind: SectionKind) {
    this.sections.set(id, { id, el, kind, top: 0, height: 0, S: 1, p: -1, lastWritten: -1 });
    this.ro?.observe(el);
    this.dirty = true;
  }

  unregister(id: string) {
    const s = this.sections.get(id);
    if (s) this.ro?.unobserve(s.el);
    this.sections.delete(id);
  }

  onFrame(fn: FrameHandler) {
    this.handlers.add(fn);
    return () => {
      this.handlers.delete(fn);
    };
  }

  subscribeChapter = (fn: () => void) => {
    this.chapterListeners.add(fn);
    return () => {
      this.chapterListeners.delete(fn);
    };
  };

  progress = (id: string) => this.sections.get(id)?.p ?? 0;

  /** Cached geometry of one section (document px). `null` until registered. */
  section(id: string): { top: number; height: number; S: number; kind: SectionKind } | null {
    const s = this.sections.get(id);
    return s ? { top: s.top, height: s.height, S: s.S, kind: s.kind } : null;
  }

  /** Bumped after every re-measure so GL scenes can refresh their own cached DOM offsets. */
  layoutVersion = 0;

  sectionInfo() {
    return [...this.sections.values()].map(({ id, kind, top, height, S, p }) => ({ id, kind, top, height, S, p }));
  }

  scrollTo(target: string | number, opts: { immediate?: boolean; offset?: number } = {}) {
    const easeInOutExpo = (t: number) =>
      t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
    let el: HTMLElement | null = null;
    if (typeof target === "string") {
      el = document.querySelector<HTMLElement>(target.startsWith("#") ? `[id="${target.slice(1)}"]` : target);
      if (!el) return;
    }
    const dest = el ? el : (target as number);
    if (this.lenis) {
      this.lenis.scrollTo(dest, {
        offset: opts.offset ?? 0,
        immediate: opts.immediate || this.reducedMotion,
        duration: 1.4,
        easing: easeInOutExpo,
        force: true,
      });
    } else if (el) {
      el.scrollIntoView();
    } else {
      window.scrollTo(0, target as number);
    }
  }

  pause() {
    this.lenis?.stop();
  }

  resume() {
    this.lenis?.start();
  }

  private onAnchorClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const a = (e.target as HTMLElement).closest?.("a[href^='#']") as HTMLAnchorElement | null;
    if (!a) return;
    const hash = a.getAttribute("href")!;
    if (hash.length < 2) return;
    const target = document.querySelector(`[id="${hash.slice(1)}"]`);
    if (!target) return;
    e.preventDefault();
    history.replaceState(null, "", hash);
    this.scrollTo(hash);
    if (target instanceof HTMLElement) {
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
  };

  private measure() {
    this.vh = window.innerHeight;
    this.vw = window.innerWidth;
    this.docH = Math.max(1, document.documentElement.scrollHeight - this.vh);
    const y = window.scrollY;
    for (const s of this.sections.values()) {
      const r = s.el.getBoundingClientRect();
      s.top = r.top + y;
      s.height = r.height;
      s.S = s.kind === "pin" ? Math.max(1, r.height - this.vh) : r.height + this.vh;
      s.lastWritten = -1;
    }
    this.dirty = false;
    this.layoutVersion++;
  }

  private tick = (time: number) => {
    this.raf = requestAnimationFrame(this.tick);
    const dt = this.lastTime ? Math.min(0.1, (time - this.lastTime) / 1000) : 1 / 60;
    this.lastTime = time;
    this.lenis?.raf(time);
    if (this.dirty) this.measure();

    const scroll = this.lenis ? this.lenis.animatedScroll : window.scrollY;
    const velocity = this.lenis ? this.lenis.velocity : 0;
    const moved = scroll !== this.lastScroll;
    this.lastScroll = scroll;

    if (moved || this.stats.frames === 0) {
      for (const s of this.sections.values()) {
        const p =
          s.kind === "pin" ? clamp01((scroll - s.top) / s.S) : clamp01((scroll + this.vh - s.top) / s.S);
        s.p = p;
        if (Math.abs(p - s.lastWritten) > 0.0005) {
          s.el.style.setProperty("--p", p.toFixed(4));
          s.lastWritten = p;
        }
        if (s.kind === "flow") {
          const vin = clamp01((scroll + this.vh - s.top) / this.vh);
          const vout = clamp01((scroll - (s.top + s.height - this.vh)) / this.vh);
          if (vin !== s.lastIn) {
            s.el.style.setProperty("--in", vin.toFixed(4));
            s.lastIn = vin;
          }
          if (vout !== s.lastOut) {
            s.el.style.setProperty("--out", vout.toFixed(4));
            s.lastOut = vout;
          }
        }
      }
      this.pageP = clamp01(scroll / this.docH);
      document.documentElement.style.setProperty("--page-p", this.pageP.toFixed(4));

      const probe = scroll + this.vh * 0.4;
      let active: ChapterId = chapters[0].id;
      for (const c of chapters) {
        const s = this.sections.get(c.id);
        if (s && s.top <= probe) active = c.id;
      }
      if (active !== this.activeId) {
        this.activeId = active;
        this.chapterListeners.forEach((l) => l());
      }
    }

    const state: FrameState = {
      time,
      dt,
      scroll,
      velocity,
      vh: this.vh,
      vw: this.vw,
      activeId: this.activeId,
      pageP: this.pageP,
      progress: this.progress,
    };
    for (const h of this.handlers) h(state);

    if (this.invalidate && (moved || this.glNeedsFrame?.())) {
      this.stats.glInvalidations++;
      this.invalidate();
    }
    this.stats.frames++;
  };
}

export const scrollEngine = new ScrollEngine();

export function useActiveChapter(): ChapterId {
  return useSyncExternalStore(
    scrollEngine.subscribeChapter,
    () => scrollEngine.activeId,
    () => "q" as ChapterId,
  );
}

/** Register a per-frame callback on the shared loop (write-only work: styles, uniforms). */
export function useScrollFrame(fn: FrameHandler, deps: unknown[] = []) {
  useEffect(() => scrollEngine.onFrame(fn), deps); // eslint-disable-line react-hooks/exhaustive-deps
}
