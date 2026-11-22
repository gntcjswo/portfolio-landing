"use client";
import { useRef, type CSSProperties } from "react";
import { PinSection } from "@/components/ui/Section";
import { useScrollFrame } from "@/lib/scroll";
import { asset } from "@/lib/asset";
import { geoEdges, geoNodes } from "@/content/geo-nodes";
import { showcase } from "@/content/portfolio";
import { ASK_EVENT } from "@/components/chapters/C10Ask";

/** L0 page = id 1 mir9 full-page capture (same file as the Layers GL scene / C02 final card) */
const L0 = showcase.find((s) => s.id === 1)!;

const captions = [
  { no: "00", tag: "원본", title: "사람이 보는 화면", body: "시안대로 구현한 화면 위에, 검색엔진과 AI가 읽는 정보를 세 겹으로 더합니다." },
  {
    no: "01",
    tag: "SEO",
    title: "찾기 쉽게",
    body: "Title·Canonical·Open Graph·Breadcrumb와 시맨틱 마크업을 정비해 검색엔진이 페이지를 정확히 읽게 합니다.",
  },
  {
    no: "02",
    tag: "AEO",
    title: "답이 되게",
    body: "질문형 콘텐츠와 정의형 요약문을 쓰고, FAQ 구조화 데이터로 질문과 답을 묶습니다.",
  },
  {
    no: "03",
    tag: "GEO",
    title: "인용하기 좋게",
    body: "최신성·수치·근거 정보를 보강해 AI가 근거로 삼을 수 있는 페이지를 만듭니다.",
  },
];

/** AEO "answer bars" — rows (y, x, width) in % of the page plane */
const bars = [
  [9, 8, 46], [13, 8, 30], [27, 52, 40], [31, 52, 28], [44, 8, 56], [48, 8, 38],
  [61, 30, 40], [65, 30, 52], [78, 8, 44], [82, 8, 26], [90, 54, 36],
];

/** step boundaries on p */
const stepOf = (p: number) => (p < 0.2 ? 0 : p < 0.4 ? 1 : p < 0.6 ? 2 : p < 0.8 ? 3 : 4);

/**
 * C03 · #layers SEO·AEO·GEO 세 겹. On desktop the Layers GL scene (4 shader planes + JS-layer Points/LineSegments)
 * draws the exploded page and positions `.c03-gl-labels`; `.c03-scene` (mir9.webp + CSS overlays as a
 * CSS-3D axonometric on --p) stays as the WebGL / mobile / reduced-motion fallback.
 */
export function C03Layers() {
  const stage = useRef<HTMLDivElement>(null);
  const last = useRef(-1);
  useScrollFrame((s) => {
    const step = stepOf(s.progress("layers"));
    if (step !== last.current && stage.current) {
      last.current = step;
      stage.current.dataset.step = String(step);
    }
  });

  return (
    <PinSection id="layers" hd={420} hm={300} className="c03" stageClassName="c03-stage">
      <div ref={stage} data-step="0" className="wrap c03-inner">
        <div className="c03-text">
          <p className="fig t-mono">
            <span>
              <b>FIG. 02</b> — 검색과 AI가 읽는 세 겹
            </span>
          </p>
          <h2 id="layers-title" className="t-h2 c03-h2">
            검색엔진과 AI가
            <br />정확히 읽는 페이지.
          </h2>
          <p className="t-body-l fg-2 c03-lead">
            화면 뒤의 탄탄한 구조가 앞단의 완성도를 결정합니다. SEO·AEO·GEO를 진단하고 하나씩 고쳤습니다.
          </p>

          <ol className="c03-caps">
            {captions.map((c, i) => (
              <li key={c.no} className="c03-cap" data-i={i}>
                <p className="t-mono c03-cap-no">
                  <span className="c03-dot" data-layer={i} aria-hidden="true" />
                  {c.no} · {c.tag}
                </p>
                <h3 className="t-h3">{c.title}</h3>
                <p className="t-body fg-2 c03-cap-body">{c.body}</p>
              </li>
            ))}
          </ol>

          <p className="t-meta c03-notice">
            레이어는 설명을 위한 연출입니다. 검색 순위나 AI 인용을 보장하지는 않습니다.
          </p>
          <a
            href="#ask-04"
            className="link-u link-u-on t-body c03-cta"
            onClick={(e) => {
              // #ask-04 exists only as an SSR <details>; the scroll engine would replaceState without a
              // hashchange, so open FAQ 04 through the same event the command palette uses
              e.preventDefault();
              history.replaceState(null, "", "#ask-04");
              window.dispatchEvent(new CustomEvent(ASK_EVENT, { detail: "04" }));
            }}
          >
            SEO·AEO·GEO 질문 보기 <span aria-hidden="true">→</span>
          </a>
        </div>

        <figure className="c03-figure">
          <div className="c03-scene gl-fallback" aria-hidden="true">
            <div className="c03-plane">
              <div className="c03-layer c03-l0">
                <div className="c03-window">
                  <img
                    src={asset("media/img/showcase/mir9.webp")}
                    width={L0.w}
                    height={L0.h}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
              <div className="c03-layer c03-l1">
                <div className="c03-grid" />
              </div>
              <div className="c03-layer c03-l2">
                {bars.map(([y, x, w], i) => (
                  <span
                    key={i}
                    className="c03-bar"
                    style={{ top: `${y}%`, left: `${x}%`, width: `${w}%`, "--i": i } as CSSProperties}
                  />
                ))}
              </div>
              <div className="c03-layer c03-l3">
                <svg viewBox="0 0 100 145" preserveAspectRatio="none" className="c03-geo">
                  {geoEdges.map(([a, b], i) => (
                    <line
                      key={i}
                      x1={geoNodes[a].x * 100}
                      y1={geoNodes[a].y * 145}
                      x2={geoNodes[b].x * 100}
                      y2={geoNodes[b].y * 145}
                      style={{ "--i": Math.max(a, b) } as CSSProperties}
                    />
                  ))}
                </svg>
                {geoNodes.map((n, i) => (
                  <span
                    key={n.label}
                    className="c03-node"
                    style={{ left: `${n.x * 100}%`, top: `${n.y * 100}%`, "--i": i } as CSSProperties}
                  >
                    <i />
                    <em className={i >= 6 ? "c03-node-extra" : undefined}>{n.label}</em>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <figcaption className="t-tiny fg-3 c03-figcap">
            예시: mir9 사이트 캡처 위에 설명용 레이어를 겹쳤습니다. 개선 작업 대상 사이트는 아닙니다.
          </figcaption>
          <div className="c03-meter t-mono" aria-hidden="true">
            {["00", "01", "02", "03"].map((n, i) => (
              <span key={n} data-i={i}>
                {n}
              </span>
            ))}
          </div>
        </figure>
      </div>
      <div className="c03-gl-labels" aria-hidden="true">
        {geoNodes.map((n) => (
          <span key={n.label} className="c03-gl-label">
            <em>{n.label}</em>
          </span>
        ))}
      </div>
    </PinSection>
  );
}
