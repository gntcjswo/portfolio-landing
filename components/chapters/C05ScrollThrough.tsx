"use client";
import { useEffect, useRef } from "react";
import { PinSection } from "@/components/ui/Section";
import { projectCount, showcase } from "@/content/portfolio";
import { asset } from "@/lib/asset";
import { useScrollFrame } from "@/lib/scroll";

const N = showcase.length;

/**
 * C05 · #scroll-through 끝까지 보기. DOM scrub on all widths:
 * each capture scrolls top→bottom inside a sticky frame, works cross-fade at q 0.8–1. The orange
 * NEXT disc (progress ring = chapter progress) grows into C06's orange background at the very end.
 * Reduced motion: five keyboard-scrollable boxes. Desktop GL: the Showcase scene draws the captures.
 */
export function C05ScrollThrough() {
  const root = useRef<HTMLDivElement>(null);
  const imgs = useRef<(HTMLImageElement | null)[]>([]);
  const items = useRef<(HTMLLIElement | null)[]>([]);
  const frameSize = useRef({ w: 1, h: 1 });
  const state = useRef({ k: -1, text: -1 });

  useEffect(() => {
    const el = root.current?.querySelector<HTMLElement>(".c05-frame");
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      frameSize.current = { w: e.contentRect.width, h: e.contentRect.height };
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useScrollFrame((s) => {
    const r = root.current;
    if (!r || (s.activeId !== "scroll-through" && s.activeId !== "pipeline")) return;
    const p = s.progress("scroll-through");
    const x = Math.min(p * N, N - 1e-4);
    const k = Math.floor(x);
    const q = x - k;
    const off = Math.min(1, q / 0.8);
    const fade = q < 0.8 ? 0 : (q - 0.8) / 0.2;
    const { w, h } = frameSize.current;
    showcase.forEach((sc, i) => {
      const img = imgs.current[i];
      if (!img) return;
      const imgH = w * (sc.h / sc.w);
      const travel = Math.max(0, imgH - h);
      const o = i < k ? 1 : i === k ? off : 0;
      img.style.transform = `translate3d(0, ${(-o * travel).toFixed(1)}px, 0)`;
    });
    r.style.setProperty("--fade", fade.toFixed(3));
    // the NEXT disc grows into C06's background over the last work's final 30%
    const end = k === N - 1 ? Math.min(1, Math.max(0, (q - 0.7) / 0.3)) : 0;
    r.parentElement?.style.setProperty("--end", (end * end * (3 - 2 * end)).toFixed(4));
    r.parentElement?.style.setProperty("--c05p", p.toFixed(4));
    const t = q >= 0.9 && k < N - 1 ? k + 1 : k;
    if (k !== state.current.k || t !== state.current.text) {
      state.current.k = k;
      state.current.text = t;
      r.dataset.k = String(k);
      items.current.forEach((li, i) => {
        if (!li) return;
        li.dataset.on = i === k ? "cur" : i === k + 1 ? "next" : "off";
        li.dataset.text = i === t ? "1" : "0";
      });
    }
  });

  return (
    <PinSection id="scroll-through" hd={520} hm={600} className="c05" stageClassName="c05-stage">
      <div ref={root} className="wrap c05-inner" data-k="0" data-text="0">
        <div className="c05-left">
          <p className="fig t-mono">
            <span>
              <b>FIG. 04</b> — SCROLL-THROUGH
            </span>
          </p>
          <h2 id="scroll-through-title" className="t-h2 c05-h2">
            첫 화면만 보지 마세요.
            <br />
            끝까지 내려가 보세요.
          </h2>
          <p className="t-meta fg-3 c05-end-note">
            작업 {projectCount}건 중 다섯 개를 끝까지 보여 드립니다. <span className="label-b">1920px 풀페이지 캡처</span>
          </p>
        </div>

        <ol className="c05-works">
          {showcase.map((sc, i) => (
            <li
              key={sc.id}
              ref={(el) => void (items.current[i] = el)}
              className="c05-work"
              data-i={i}
              data-on={i === 0 ? "cur" : i === 1 ? "next" : "off"}
              data-text={i === 0 ? "1" : "0"}
            >
              <div className="c05-info">
                <p className="t-mono c05-count">
                  <span className="c05-count-now">{String(i + 1).padStart(2, "0")}</span> / {String(N).padStart(2, "0")}
                </p>
                <h3 className="t-h2 c05-name">{sc.work.name}</h3>
                <p className="t-body fg-2">
                  {sc.work.client} · {sc.work.category.filter((c) => c !== "기타").join(" · ")}
                </p>
                <p className="t-meta c05-links">
                  <span className="fg-3">전체 페이지 캡처</span>
                  {sc.work.url ? (
                    <a href={sc.work.url} target="_blank" rel="noopener noreferrer" className="link-u" data-cursor="open">
                      사이트 보기 <span aria-hidden="true">↗</span>
                      <span className="sr-only"> (새 창)</span>
                    </a>
                  ) : null}
                </p>
              </div>
              <div
                className="c05-frame"
                tabIndex={0}
                role="region"
                aria-label={`${sc.work.name} 전체 페이지 캡처`}
                data-lenis-prevent
              >
                <img
                  ref={(el) => void (imgs.current[i] = el)}
                  src={asset(`media/img/showcase/${sc.file}.webp`)}
                  width={sc.w}
                  height={sc.h}
                  alt={`${sc.work.name}(${sc.work.client}) 퍼블리싱 사이트 전체 페이지 캡처`}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </li>
          ))}
        </ol>

        <div className="c05-progress" aria-hidden="true">
          {showcase.map((sc, i) => (
            <span key={sc.id} data-i={i} />
          ))}
        </div>
      </div>
      <div className="c05-orange" aria-hidden="true" />
      <a href="#pipeline" className="c05-disc" aria-label="다음 장: 작업 방식으로 이동">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="47" pathLength={1} />
        </svg>
        <span className="t-mono">NEXT 06</span>
        <b aria-hidden="true">↓</b>
      </a>
    </PinSection>
  );
}
