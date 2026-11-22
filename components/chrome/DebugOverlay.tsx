"use client";
import { useEffect, useState } from "react";
import { scrollEngine } from "@/lib/scroll";
import { detectTier } from "@/lib/tier";
import { videoPool } from "@/lib/video-pool";
import { director } from "@/components/gl/director";

type Snap = {
  active: string;
  scene: string;
  gldbg: string;
  sections: { id: string; kind: string; p: number; S: number }[];
  loop: number;
  gl: number;
  rendered: number;
  tier: string;
  video: string;
};

/** `?debug`: live progress of every PinSection/FlowSection, active scene and render counters. */
export function DebugOverlay() {
  const [on, setOn] = useState(false);
  const [s, setS] = useState<Snap | null>(null);

  useEffect(() => {
    if (!new URLSearchParams(location.search).has("debug")) return;
    setOn(true);
    let lastR = director.rendered;
    let lastL = scrollEngine.stats.frames;
    const id = setInterval(() => {
      const t = detectTier();
      const v = videoPool.stats;
      const r = director.rendered;
      const l = scrollEngine.stats.frames;
      setS({
        active: scrollEngine.activeId,
        scene: director.visible.size ? [...director.visible].join(" + ") : "— (asleep)",
        gldbg: JSON.stringify({ fps: director.debug.fps, hall: director.debug.hall, layers: director.debug.layers }),
        sections: scrollEngine.sectionInfo().map(({ id, kind, p, S }) => ({ id, kind, p, S })),
        loop: (l - lastL) * 4,
        gl: scrollEngine.stats.glInvalidations,
        rendered: (r - lastR) * 4,
        tier: `${t.tier} (${t.reason})${t.reducedMotion ? " · reduced-motion" : ""}`,
        video: `playing ${v.playing} / src ${v.withSrc} / reg ${v.registered}`,
      });
      lastR = r;
      lastL = l;
    }, 250);
    return () => clearInterval(id);
  }, []);

  if (!on || !s) return null;
  return (
    <div className="debug t-mono" aria-hidden="true">
      <p>
        chapter <b>{s.active}</b> · scene <b>{s.scene}</b>
      </p>
      <p>
        loop {s.loop}fps · gl renders {s.rendered}/s · tier {s.tier}
      </p>
      <p>video {s.video}</p>
      <p style={{ wordBreak: "break-all" }}>{s.gldbg}</p>
      <ul>
        {s.sections.map((x) => (
          <li key={x.id} data-on={x.id === s.active ? "1" : "0"}>
            <span>{x.id}</span>
            <i>{x.kind}</i>
            <span className="debug-bar">
              <span style={{ width: `${x.p * 100}%` }} />
            </span>
            <span>{x.p.toFixed(3)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
