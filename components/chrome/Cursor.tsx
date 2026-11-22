"use client";
import { useEffect, useRef, useState } from "react";
import { scrollEngine } from "@/lib/scroll";

type CursorState = "default" | "view" | "drag" | "open" | "text";
const labels: Partial<Record<CursorState, string>> = { view: "보기", drag: "끌기 ⟷", open: "↗" };

/**
 * Dot (immediate) + ring (lerp 0.18) cursor, fine pointers only, off for reduced motion.
 * State comes from `data-cursor` via pointerover delegation; position from pointermove only.
 */
export function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const ok =
      window.matchMedia("(pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEnabled(ok);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add("has-cursor");
    const target = { x: -100, y: -100 };
    const pos = { x: -100, y: -100 };
    let visible = false;
    let state: CursorState = "default";

    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      target.x = e.clientX;
      target.y = e.clientY;
      if (!visible) {
        visible = true;
        pos.x = target.x;
        pos.y = target.y;
        ring.current?.classList.add("is-on");
        dot.current?.classList.add("is-on");
      }
      dot.current!.style.transform = `translate3d(${target.x}px,${target.y}px,0)`;
    };
    const over = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest?.("[data-cursor]") as HTMLElement | null;
      const next = ((el?.dataset.cursor as CursorState) || "default") as CursorState;
      if (next === state) return;
      state = next;
      ring.current!.dataset.state = state;
      label.current!.textContent = labels[state] ?? "";
    };
    const leave = () => {
      visible = false;
      ring.current?.classList.remove("is-on");
      dot.current?.classList.remove("is-on");
    };

    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerover", over, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    const off = scrollEngine.onFrame(() => {
      if (!visible) return;
      pos.x += (target.x - pos.x) * 0.18;
      pos.y += (target.y - pos.y) * 0.18;
      ring.current!.style.transform = `translate3d(${pos.x.toFixed(1)}px,${pos.y.toFixed(1)}px,0)`;
    });
    return () => {
      off();
      document.documentElement.classList.remove("has-cursor");
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerover", over);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div className="cursor" aria-hidden="true">
      <div ref={ring} className="cursor-ring" data-state="default">
        <span ref={label} className="cursor-label" />
      </div>
      <div ref={dot} className="cursor-dot" />
    </div>
  );
}
