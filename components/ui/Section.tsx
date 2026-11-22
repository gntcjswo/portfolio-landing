"use client";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { scrollEngine } from "@/lib/scroll";
import { chapterById, type ChapterId } from "@/content/chapters";

type Common = {
  id: ChapterId;
  className?: string;
  children: ReactNode;
  /** override chapter tone (e.g. sub-blocks) */
  tone?: string;
};

/** Free-height chapter. Progress = viewport pass (top enters bottom → bottom leaves top). */
export function FlowSection({ id, className = "", children, tone }: Common) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    scrollEngine.register(id, ref.current!, "flow");
    return () => scrollEngine.unregister(id);
  }, [id]);
  return (
    <section
      ref={ref}
      id={id}
      aria-labelledby={`${id}-title`}
      data-tone={tone ?? chapterById[id].tone}
      className={`chapter ${className}`}
    >
      {children}
    </section>
  );
}

/**
 * Pinned chapter: section of height H (svh) with a sticky 100svh stage, S = H − 100svh.
 * Writes `--p` (0..1) on the section every frame it changes. `hm = null` → not pinned below 1024px.
 * prefers-reduced-motion collapses to auto height (globals.css).
 */
export function PinSection({
  id,
  className = "",
  stageClassName = "",
  children,
  tone,
  hd,
  hm,
  after,
}: Common & { stageClassName?: string; hd?: number; hm?: number | null; after?: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const c = chapterById[id];
  useEffect(() => {
    scrollEngine.register(id, ref.current!, "pin");
    return () => scrollEngine.unregister(id);
  }, [id]);
  const style = { "--hd": hd ?? c.H ?? 100, "--hm": hm ?? 100, "--p": 0 } as CSSProperties;
  return (
    <section
      ref={ref}
      id={id}
      aria-labelledby={`${id}-title`}
      data-tone={tone ?? c.tone}
      data-pin-mobile={hm === null ? "off" : "on"}
      className={`chapter pin ${className}`}
      style={style}
    >
      <div className={`pin-stage ${stageClassName}`}>{children}</div>
      {after}
    </section>
  );
}

export function Fig({ no, children, className = "" }: { no: string; children: ReactNode; className?: string }) {
  return (
    <p className={`fig t-mono ${className}`}>
      <span>
        <b>FIG. {no}</b> — {children}
      </span>
    </p>
  );
}

export function ExtLink({
  href,
  children,
  className = "link-u",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} data-cursor="open">
      {children}
      <span aria-hidden="true"> ↗</span>
      <span className="sr-only"> (새 창)</span>
    </a>
  );
}
