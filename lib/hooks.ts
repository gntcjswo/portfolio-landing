"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

function mediaStore(query: string) {
  return {
    subscribe: (cb: () => void) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    get: () => window.matchMedia(query).matches,
  };
}

/** SSR returns `serverValue`; hydrates to the real match without a mismatch warning. */
export function useMediaQuery(query: string, serverValue = false) {
  const store = useRef(typeof window === "undefined" ? null : mediaStore(query)).current;
  return useSyncExternalStore(
    store?.subscribe ?? (() => () => {}),
    store?.get ?? (() => serverValue),
    () => serverValue,
  );
}

export const useReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");
export const useDesktop = () => useMediaQuery("(min-width: 1024px)", true);

/** One-shot (or continuous) IntersectionObserver visibility. */
export function useInView<T extends Element>(opts: IntersectionObserverInit & { once?: boolean } = {}) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  const { once = true, root, rootMargin, threshold } = opts;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) setInView(false);
      },
      { root, rootMargin, threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once, root, rootMargin, threshold]);
  return [ref, inView] as const;
}

export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
