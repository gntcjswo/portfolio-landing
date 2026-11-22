"use client";
import { useEffect } from "react";
import { scrollEngine } from "@/lib/scroll";

/**
 * Starts the single Lenis + rAF loop once for the whole page, and the one-shot reveal observer:
 * any `[data-rv]` element gets `data-rv-in` the first time it enters the viewport (chrome.css).
 */
export function ScrollRoot() {
  useEffect(() => {
    scrollEngine.start();
    return () => scrollEngine.stop();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-rv-in", "");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    let queued = 0;
    const scan = () => {
      queued = 0;
      document.querySelectorAll("[data-rv]:not([data-rv-in])").forEach((el) => io.observe(el));
    };
    scan();
    root.setAttribute("data-rv-ready", "");
    const mo = new MutationObserver(() => {
      if (!queued) queued = requestAnimationFrame(scan);
    });
    mo.observe(document.getElementById("main")!, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      cancelAnimationFrame(queued);
      root.removeAttribute("data-rv-ready");
    };
  }, []);
  return null;
}
