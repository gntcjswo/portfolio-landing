"use client";
import { useEffect, useRef } from "react";
import { chapters, chapterById } from "@/content/chapters";
import { links } from "@/content/links";
import { scrollEngine, useActiveChapter } from "@/lib/scroll";
import { ui, useUI } from "@/lib/ui-store";

/** <1024px: bottom dock (progress ring + current chapter, 질문하기, 메뉴) and the full-screen menu sheet. */
export function MobileDock() {
  const active = useActiveChapter();
  const c = chapterById[active];
  const menu = useUI((s) => s.menu);
  const dlg = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (menu && !d.open) {
      d.showModal();
      scrollEngine.pause();
    } else if (!menu && d.open) d.close();
  }, [menu]);

  return (
    <>
      <div className="dock" data-tone={c.tone === "night" ? "night" : "paper"}>
        <a href={`#${c.id}`} className="dock-now" aria-label={`현재 챕터 ${c.no} ${c.name}`}>
          <svg viewBox="0 0 36 36" className="dock-ring" aria-hidden="true">
            <circle cx="18" cy="18" r="15" className="bg" />
            <circle cx="18" cy="18" r="15" className="fg" pathLength={1} />
          </svg>
          <span className="t-mono">{c.no}</span>
          <span className="dock-name">{c.name}</span>
        </a>
        <button type="button" className="dock-btn dock-ask" onClick={() => ui.set({ palette: true })} aria-haspopup="dialog">
          질문하기
        </button>
        <button type="button" className="dock-btn" onClick={() => ui.set({ menu: true })} aria-haspopup="dialog" aria-expanded={menu}>
          메뉴
        </button>
      </div>

      <dialog
        ref={dlg}
        className="sheet"
        aria-label="메뉴"
        onClose={() => {
          scrollEngine.resume();
          ui.set({ menu: false });
        }}
        data-lenis-prevent
      >
        <div className="sheet-head">
          <p className="t-mono">WOOSUNG · MENU</p>
          <button type="button" className="sheet-close" onClick={() => dlg.current?.close()} aria-label="메뉴 닫기">
            ×
          </button>
        </div>
        <ol className="sheet-list">
          {chapters.map((ch) => (
            <li key={ch.id}>
              <a
                href={`#${ch.id}`}
                aria-current={ch.id === active ? "location" : undefined}
                onClick={() => dlg.current?.close()}
              >
                <span className="t-mono">{ch.no}</span>
                {ch.name}
              </a>
            </li>
          ))}
        </ol>
        <div className="sheet-cta">
          <a className="btn btn-signal" href={links.github} target="_blank" rel="noopener noreferrer">
            GitHub 보기 <span aria-hidden="true">↗</span>
            <span className="sr-only"> (새 창)</span>
          </a>
          <a className="link-u link-u-on" href={links.portfolioReact} target="_blank" rel="noopener noreferrer">
            이전 포트폴리오 <span aria-hidden="true">↗</span>
            <span className="sr-only"> (새 창)</span>
          </a>
        </div>
      </dialog>
    </>
  );
}
