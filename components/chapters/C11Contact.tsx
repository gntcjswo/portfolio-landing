"use client";
import { Fragment, useEffect, useRef, type CSSProperties } from "react";
import { FlowSection } from "@/components/ui/Section";
import { footerLinks, links, sns } from "@/content/links";
import { works } from "@/content/portfolio";
import { asset, pfThumb } from "@/lib/asset";
import { range } from "@/lib/layout";
import { scrollEngine, useScrollFrame } from "@/lib/scroll";

/** 22 distinct works spread over the catalogue (37 is coprime with 169); the empty slot sits after 14 */
const reel = Array.from({ length: 22 }, (_, i) => works[(i * 37 + 5) % works.length]);
const SLOT_AT = 14;
const WORD = "WOOSUNG".split("");

/**
 * C11 · #contact 마무리 (footer). A night sheet that slides over C10. The reel is the hall's gallery
 * laid flat: the works pass sideways with the scroll (skewed a little by its velocity) and the empty
 * frame No.170 — the next screen, at the reader's company — arrives in the middle; it links to GitHub. At the very
 * bottom the WOOSUNG wordmark rises letter by letter (`--end`; SUNG in signal orange).
 */
export function C11Contact() {
  const track = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLAnchorElement>(null);
  const foot = useRef<HTMLElement>(null);
  const m = useRef({ top: 0, h: 0, slotC: 0, max: 0 });
  const skew = useRef(0);
  const lastEnd = useRef(-1);

  useEffect(() => {
    const measure = () => {
      const t = track.current;
      const s = slot.current;
      if (!t || !s) return;
      const r = t.getBoundingClientRect();
      m.current = {
        top: r.top + window.scrollY,
        h: r.height,
        slotC: s.offsetLeft + s.offsetWidth / 2,
        max: document.documentElement.scrollHeight - window.innerHeight,
      };
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, []);

  useScrollFrame((s) => {
    if (s.activeId !== "ask" && s.activeId !== "contact") return;
    const t = track.current;
    if (!t) return;
    const M = m.current;
    const reduced = scrollEngine.reducedMotion;
    const r = reduced ? 0.5 : range(s.scroll + s.vh, M.top, M.top + s.vh + M.h);
    const x = s.vw / 2 - M.slotC + (0.5 - r) * s.vw * 0.9;
    const target = reduced ? 0 : Math.max(-5, Math.min(5, -s.velocity * 0.12));
    skew.current += (target - skew.current) * Math.min(1, s.dt * 8);
    t.style.transform = `translate3d(${x.toFixed(1)}px,0,0) skewX(${skew.current.toFixed(2)}deg)`;

    const end = reduced ? 1 : range(s.scroll, M.max - s.vh * 0.55, M.max - 2);
    if (Math.abs(end - lastEnd.current) > 0.002) {
      lastEnd.current = end;
      foot.current?.style.setProperty("--end", end.toFixed(3));
    }
  });

  return (
    <FlowSection id="contact" className="c11">
      <div className="wrap c11-head">
        <p className="t-mono c11-eyebrow" data-rv="">
          NEXT — No.{works.length + 1} · AFTER {works.length} SCREENS
        </p>
        <h2 id="contact-title" className="c11-h2" data-rv="lines">
          {/* "169개의 화면 다음, / 170번째 화면은 …" broke into 3 lines at 1920 (and 4 at 390), so the count
              lives in the eyebrow (NEXT — No.170) and the reel slot; the h2 keeps the two-line shape. */}
          <span className="rv-line">
            <span>다음 화면은,</span>
          </span>{" "}
          <span className="rv-line">
            <span>
              <span className="nowrap">
                <em>당신의 팀</em>에서
              </span>{" "}
              <span className="nowrap">만들겠습니다.</span>
            </span>
          </span>
        </h2>
      </div>

      <div className="c11-reel">
        <div ref={track} className="c11-track">
          {reel.map((w, i) => (
            <Fragment key={w.id}>
              {i === SLOT_AT ? (
                <a ref={slot} className="c11-slot" href={links.github} target="_blank" rel="noopener noreferrer" data-cursor="open">
                  <span className="t-mono c11-slot-no">No.{works.length + 1}</span>
                  <span className="c11-slot-plus" aria-hidden="true" />
                  <span className="c11-slot-t">이 자리에 들어갈 화면</span>
                  <span className="t-mono c11-slot-cta">
                    GitHub 보기 <span aria-hidden="true">↗</span>
                    <span className="sr-only"> (새 창)</span>
                  </span>
                </a>
              ) : null}
              <span className="c11-thumb">
                <img src={pfThumb(w.id)} width={320} height={180} alt="" loading="lazy" decoding="async" />
                <span className="t-mono">No.{String(w.id + 1).padStart(3, "0")}</span>
              </span>
            </Fragment>
          ))}
        </div>
      </div>

      <footer ref={foot} className="wrap c11-inner" style={{ "--end": 0 } as CSSProperties}>
        <div className="c11-cta" data-rv="">
          <p className="t-body-l c11-sub">끝까지 봐 주셔서 감사합니다.</p>
          <div className="c11-actions">
            <a className="btn btn-signal" href={links.github} target="_blank" rel="noopener noreferrer" data-cursor="open">
              GitHub 보기 <span aria-hidden="true">↗</span>
              <span className="sr-only"> (새 창)</span>
            </a>
            <a className="link-u link-u-on c11-tel" href={links.portfolioReact} target="_blank" rel="noopener noreferrer" data-cursor="open">
              이전 포트폴리오 <span aria-hidden="true">↗</span>
              <span className="sr-only"> (새 창)</span>
            </a>
          </div>
        </div>

        <div className="c11-offices">
          <div className="c11-office" data-rv="">
            <p className="t-mono fg-3">PORTFOLIO</p>
            <h3 className="t-h3">이전 포트폴리오</h3>
            <p className="t-body fg-2">
              <a className="link-u" href={links.portfolioReact} target="_blank" rel="noopener noreferrer" data-cursor="open">
                React 포트폴리오 <span aria-hidden="true">↗</span>
                <span className="sr-only"> (새 창)</span>
              </a>
              <br />
              <a className="link-u" href={links.portfolioLegacy} target="_blank" rel="noopener noreferrer" data-cursor="open">
                레거시 포트폴리오 Design Me <span aria-hidden="true">↗</span>
                <span className="sr-only"> (새 창)</span>
              </a>
            </p>
            <p className="t-meta fg-3">2024년 이후 작업 위주 · 레거시는 전체 작업물</p>
          </div>
          <div className="c11-office" data-rv="" style={{ "--rv-d": 90 } as CSSProperties}>
            <p className="t-mono fg-3">CODE</p>
            <h3 className="t-h3">GitHub</h3>
            <p className="t-body fg-2">
              <a className="link-u" href={links.github} target="_blank" rel="noopener noreferrer" data-cursor="open">
                github.com/gntcjswo <span aria-hidden="true">↗</span>
                <span className="sr-only"> (새 창)</span>
              </a>
            </p>
            <p className="t-meta fg-3">basic-starter · weather-app · wb-schedule · cursor-launcher</p>
          </div>
        </div>

        <div className="c11-bottom">
          <a href="#q" className="c11-logo" aria-label="우성 — 맨 위로">
            <span className="logo-mask" style={{ maskImage: `url(${asset("media/img/logo.svg")})`, WebkitMaskImage: `url(${asset("media/img/logo.svg")})` }} />
          </a>
          <nav className="c11-links" aria-label="사이트 링크">
            {footerLinks.map((g) => (
              <div key={g.title}>
                <p className="t-mono fg-3">{g.title}</p>
                <ul>
                  {g.items.map((l) => (
                    <li key={l.label}>
                      <a href={l.href} target="_blank" rel="noopener noreferrer" className="link-u" data-cursor="open">
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <ul className="c11-sns" aria-label="코드 저장소">
            {sns.map((s) => (
              <li key={s.name}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`${s.name} (새 창)`} data-cursor="open">
                  <span className="sns-mask" style={{ maskImage: `url(${asset(s.icon)})`, WebkitMaskImage: `url(${asset(s.icon)})` }} />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="c11-legal t-tiny fg-3">
          <p>우성 (WOOSUNG) · Web Publisher &amp; Frontend Developer</p>
          <p>© 2026 WOOSUNG. Design Me.</p>
          <p>이 페이지의 대화·생성 화면은 이해를 돕기 위한 예시입니다. 작업 이미지·영상의 권리는 각 고객사에 있습니다.</p>
        </div>

        <p className="c11-word" aria-hidden="true">
          {WORD.map((ch, i) => (
            <span key={i} style={{ "--i": i } as CSSProperties}>
              {ch}
            </span>
          ))}
        </p>
      </footer>
    </FlowSection>
  );
}