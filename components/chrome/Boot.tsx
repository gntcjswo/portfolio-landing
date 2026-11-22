"use client";
import { useEffect, useRef } from "react";
import { boot } from "@/lib/boot";
import { detectTier } from "@/lib/tier";

const MIN_MS = 900;
const MAX_MS = 8000;
const TOTAL = 169; // = works.length; scripts/verify-out.mjs fails if they differ
/** frames the scene gets to draw under the cover once everything is ready, before it fades */
const SETTLE_FRAMES = 6;

/**
 * C00 · #boot preloader, shown on every visit. Server-rendered so it covers the first paint; a CSS
 * failsafe hides it after 9s if JS never runs. The counter 000 → 169 and the bar are bound to the
 * real task progress (fonts 2 + atlas + shader compile) / 4; once done, the scene draws a few frames
 * under the cover and the overlay fades out.
 */
export function Boot() {
  const root = useRef<HTMLDivElement>(null);
  const num = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    const html = document.documentElement;
    const fonts = document.fonts;
    fonts?.load('500 1em "Paperlogy"').finally(() => boot.mark("font5"));
    fonts?.load('700 1em "Paperlogy"').finally(() => boot.mark("font7"));
    if (!fonts) {
      boot.mark("font5");
      boot.mark("font7");
    }
    if (detectTier().tier === "none") {
      boot.mark("atlas");
      boot.mark("gl");
    }

    if (!el || html.dataset.boot === "skip") {
      boot.finish();
      return;
    }

    const t0 = performance.now();
    let shown = 0;
    let target = 0;
    let raf = 0;
    let lifted = false;
    let ready = false;
    let settle = 0;

    const lift = () => {
      if (lifted) return;
      lifted = true;
      el.classList.add("is-out");
      boot.finish();
      window.setTimeout(() => {
        cancelAnimationFrame(raf);
        el.hidden = true;
      }, 1000);
    };

    const tick = () => {
      shown += (target - shown) * 0.16;
      if (target - shown < 0.5) shown = target;
      if (num.current) num.current.textContent = String(Math.round(shown)).padStart(3, "0");
      el.style.setProperty("--boot", (shown / TOTAL).toFixed(3));
      if (ready && shown >= TOTAL && performance.now() - t0 >= MIN_MS && ++settle >= SETTLE_FRAMES) {
        lift();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const off = boot.onProgress((p) => {
      target = p * TOTAL;
      if (p >= 1) ready = true;
    });
    const cap = window.setTimeout(lift, MAX_MS);
    return () => {
      off();
      cancelAnimationFrame(raf);
      window.clearTimeout(cap);
    };
  }, []);

  return (
    <div ref={root} className="boot" aria-hidden="true">
      <div className="boot-dots" />
      <div className="boot-center">
        <p className="boot-brand t-mono">WOOSUNG</p>
        <span className="boot-bar">
          <i />
        </span>
        <p className="boot-status t-meta">
          작업 화면 {TOTAL}점을 불러오는 중{" "}
          <span ref={num} className="boot-num t-mono">
            000
          </span>
        </p>
      </div>
    </div>
  );
}
