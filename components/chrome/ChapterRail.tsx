"use client";
import { chapters, chapterById } from "@/content/chapters";
import { useState } from "react";
import { useActiveChapter, useScrollFrame } from "@/lib/scroll";
import { asset } from "@/lib/asset";
import { links } from "@/content/links";
import { ui } from "@/lib/ui-store";
import { useMounted } from "@/lib/hooks";

/** ≥1024px: left rail (01…11, active name, orange page-progress fill) + logo + top-right actions. */
export function ChapterRail() {
  const active = useActiveChapter();
  // C01 ends inside the paper-coloured opening: the chrome turns paper with it
  const [door, setDoor] = useState(false);
  useScrollFrame((s) => {
    const d = s.activeId === "q" && s.progress("q") > 0.86;
    setDoor((prev) => (prev === d ? prev : d));
  });
  const tone = chapterById[active].tone === "night" && !door ? "night" : "paper";
  const mounted = useMounted();
  const isMac = mounted && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <>
      <a href="#q" className="rail-logo" data-tone={tone} aria-label="우성 — 맨 위로">
        <span className="logo-mask" style={{ maskImage: `url(${asset("media/img/logo.svg")})`, WebkitMaskImage: `url(${asset("media/img/logo.svg")})` }} />
      </a>

      <nav className="rail" aria-label="챕터" data-tone={tone}>
        <span className="rail-track" aria-hidden="true">
          <i />
        </span>
        <ol>
          {chapters.map((c) => (
            <li key={c.id}>
              <a href={`#${c.id}`} aria-current={active === c.id ? "location" : undefined} className="rail-item">
                <span className="rail-no t-mono">{c.no}</span>
                <span className="rail-name">{c.name}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="top-actions" data-tone={tone}>
        <a href={links.github} target="_blank" rel="noopener noreferrer" className="link-u top-link" data-cursor="open">
          GitHub<span className="sr-only"> (새 창)</span>
        </a>
        <button type="button" className="top-ask" onClick={() => ui.set({ palette: true })} aria-haspopup="dialog">
          <kbd className="t-mono">{isMac ? "⌘K" : "Ctrl K"}</kbd>
          질문하기
        </button>
      </div>
    </>
  );
}
