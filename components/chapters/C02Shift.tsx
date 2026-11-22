"use client";
import { useRef, type CSSProperties } from "react";
import { PinSection } from "@/components/ui/Section";
import { scrollEngine, useScrollFrame } from "@/lib/scroll";
import { asset, pfImage } from "@/lib/asset";

/** portfolio works dealt onto the deck while the declaration is read; the last card is C03's page */
const DECK = [21, 7, 14, 29, 2, 40, 99, 9, 24, 77, 3, 15, 98, 46, 25, 12];
const DECK_TILT = DECK.map((_, k) => ((k * 37) % 13) - 6);

type Token = { t: string; u?: "seo" | "aeo" | "geo"; fn?: 1 | 2 | 3 };

const sentences: Token[][] = [
  "디자인의 마지막 한 조각을 코드로 완성합니다.".split(" ").map((t) => ({ t })),
  [
    { t: "마크업으로", u: "seo" },
    ..."구조를 세우고,".split(" ").map((t) => ({ t })),
    { t: "스타일로", u: "aeo" },
    ..."모든 화면에 맞추고,".split(" ").map((t) => ({ t })),
    { t: "인터랙션으로", u: "geo" },
    ..."움직임을 더합니다.".split(" ").map((t) => ({ t })),
  ],
  "2015년부터 웹 에이전시와 기업 프로젝트에서 11년 넘게 다듬어 온 방식입니다.".split(" ").map((t) => ({ t })),
];
sentences[0][sentences[0].length - 1].fn = 1;
sentences[1][sentences[1].length - 1].fn = 2;
sentences[2][sentences[2].length - 1].fn = 3;

const total = sentences.reduce((n, s) => n + s.length, 0);
/** word index at which each footnote number is reached */
const fnAt: Record<number, number> = {};
{
  let i = 0;
  for (const s of sentences) for (const w of s) {
    if (w.fn) fnAt[w.fn] = i;
    i++;
  }
}
/** words are fully highlighted by p = 0.85 (then the line drops) */
const HIGHLIGHT_END = 0.85;

/**
 * C02 · #shift 작업 원칙. Word-by-word scrub highlight driven by CSS `--p`; footnote marker
 * triggers toggled from the shared frame loop (reverse scroll clears them). `.c02-line` is the
 * measured anchor for the line handed over from C01 (its DOM paint is the fallback).
 */
export function C02Shift() {
  const notes = useRef<(HTMLLIElement | null)[]>([]);
  const on = useRef([false, false]);
  const inner = useRef<HTMLDivElement>(null);
  const lastIn = useRef(-1);

  useScrollFrame((s) => {
    // arrival: 0 while the stage is a screen below, 1 once pinned (the copy leads its rising stage)
    const sec = scrollEngine.section("shift");
    if (sec && inner.current) {
      const v = Math.round(Math.min(1, Math.max(0, (s.scroll - (sec.top - s.vh)) / s.vh)) * 1e4) / 1e4;
      if (v !== lastIn.current) {
        lastIn.current = v;
        inner.current.style.setProperty("--in", String(v));
      }
    }
    const reached = (s.progress("shift") / HIGHLIGHT_END) * total;
    const next = [reached >= fnAt[1] + 1, reached >= fnAt[3] + 1];
    next.forEach((v, k) => {
      if (v === on.current[k]) return;
      on.current[k] = v;
      notes.current[k]?.classList.toggle("is-on", v);
    });
  });

  let i = 0;
  return (
    <PinSection id="shift" hd={260} hm={200} className="c02" stageClassName="c02-stage">
      <div ref={inner} className="wrap c02-inner" style={{ "--n": total, "--hl-end": HIGHLIGHT_END } as CSSProperties}>
        <div className="c02-aside t-mono fg-3" aria-hidden="true">
          <span>FIG. 01 — 시안이 화면이 되기까지</span>
          <span className="c02-legend">
            <i data-u="seo" />HTML · <i data-u="aeo" />CSS · <i data-u="geo" />JS
          </span>
        </div>

        <div className="c02-text t-display-2" data-cursor="text">
          {sentences.map((s, si) => {
            const Tag = si === 0 ? "h2" : "p";
            return (
            <Tag key={si} id={si === 0 ? "shift-title" : undefined} className={`c02-s c02-s${si + 1}`}>
              {s.map((w, wi) => {
                const idx = i++;
                return (
                  <span key={wi}>
                    <span className="c02-w" data-u={w.u} style={{ "--i": idx } as CSSProperties}>
                      {w.t}
                      {w.fn ? (
                        <sup className={`fn c02-fn c02-fn-${w.fn}`}>
                          <a href={`#shift-fn-${w.fn === 3 ? 3 : 1}`} aria-label={`각주 ${w.fn}`}>
                            {w.fn}
                          </a>
                        </sup>
                      ) : null}
                    </span>{" "}
                  </span>
                );
              })}
              {si === 0 ? <span className="c02-line" aria-hidden="true" /> : null}
            </Tag>
            );
          })}
        </div>

        <ol className="c02-notes t-meta fg-3">
          <li id="shift-fn-1" ref={(el) => void (notes.current[0] = el)} className="marker-anim c02-note c02-note-12">
            <span className="c02-note-no">¹ ²</span> 우성 포트폴리오 · 소개·About Me 요약
          </li>
          <li id="shift-fn-3" ref={(el) => void (notes.current[1] = el)} className="marker-anim c02-note c02-note-3">
            <span className="c02-note-no">³</span> 경력 시작 2015.04 (셈웨어) 기준
          </li>
        </ol>
      </div>

      <div className="c02-deck" aria-hidden="true" style={{ "--cards": DECK.length + 1 } as CSSProperties}>
        {DECK.map((id, k) => (
          <img
            key={id}
            className="c02-card"
            src={pfImage(id)}
            alt=""
            loading="lazy"
            decoding="async"
            style={{ "--k": k, "--r": DECK_TILT[k] } as CSSProperties}
          />
        ))}
        <img
          className="c02-card c02-card-final"
          src={asset("media/img/showcase/mir9.webp")}
          alt=""
          loading="lazy"
          decoding="async"
          style={{ "--k": DECK.length, "--r": 0 } as CSSProperties}
        />
      </div>
    </PinSection>
  );
}
