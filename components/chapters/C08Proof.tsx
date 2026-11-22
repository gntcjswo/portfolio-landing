"use client";
import dynamic from "next/dynamic";
import { FlowSection } from "@/components/ui/Section";
import { evidence, type Evidence, type EvidenceGroup } from "@/content/evidence";
import { useInView } from "@/lib/hooks";

/** Swiper (~25KB gz) is only fetched when C08 approaches. */
const ProofRail = dynamic(() => import("./ProofRail").then((m) => m.ProofRail), {
  ssr: false,
  loading: () => <StaticRail />,
});

/**
 * C08 · #proof 경력 기록. A white sheet that slides up over C07's night with rounded top corners
 * (`--in`, written by the scroll engine). Swiper freeMode rail; seals turn with the rail's progress.
 * The SSR fallback is the same cards in a native scroller.
 */
export function C08Proof() {
  const [ref, near] = useInView<HTMLDivElement>({ rootMargin: "150% 0px" });
  return (
    <FlowSection id="proof" className="c08">
      <div className="wrap c08-inner">
        <p className="fig t-mono">
          <span>
            <b>FIG. 05</b> — RECORD
          </span>
        </p>
        <div className="c08-head">
          <h2 id="proof-title" className="c08-h2">
            <span className="c08-line">
              <span>말 대신,</span>
            </span>{" "}
            <span className="c08-line">
              <span>기록으로.</span>
            </span>
          </h2>
          <div className="c08-aside">
            <p className="t-body-l fg-2">경력, 대기업 프로젝트, 기술처럼 확인할 수 있는 사실만 모았습니다.</p>
          </div>
        </div>
      </div>
      <div ref={ref} className="c08-rail-wrap">
        {near ? <ProofRail /> : <StaticRail />}
      </div>
    </FlowSection>
  );
}

function Seal({ e }: { e: Evidence }) {
  const ring =
    e.group === "경력"
      ? "CAREER · WOOSUNG · CAREER · WOOSUNG · "
      : e.group === "대기업"
        ? "PROJECT · 대기업 · PROJECT · 대기업 · "
        : "SKILL · 기술 · SKILL · 기술 · ";
  const pid = `seal-${e.no}`;
  return (
    <svg className="c08-seal" viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <path id={pid} d="M60,60 m-47,0 a47,47 0 1,1 94,0 a47,47 0 1,1 -94,0" />
      </defs>
      <g className="c08-seal-spin">
        <circle cx="60" cy="60" r="58" className="c08-seal-o" />
        <text className="c08-seal-t">
          <textPath href={`#${pid}`} textLength="292" lengthAdjust="spacing">
            {ring}
          </textPath>
        </text>
      </g>
      <circle cx="60" cy="60" r="37" className="c08-seal-i" />
      {e.group === "대기업" ? (
        <path d="M45 61 l10 10 l20 -22" className="c08-seal-check" />
      ) : (
        <text x="60" y="61" className="c08-seal-m">
          {e.mark ?? ""}
        </text>
      )}
    </svg>
  );
}

/** Card style per group: 경력 = seal card, 대기업 = small check card, 기술 = outlined seal card */
const groupClass: Record<EvidenceGroup, string> = { 경력: "is-career", 대기업: "is-enterprise", 기술: "is-skill" };

export function EvidenceCard({ e }: { e: Evidence }) {
  return (
    <article className={`card c08-card ${groupClass[e.group]}`} aria-label={`${e.no} ${e.title}`}>
      <p className="t-mono card-no c08-no">
        {e.no} <span>· {e.group}</span>
      </p>
      <Seal e={e} />
      <h3 className="t-h3 c08-title">{e.title}</h3>
      {e.body ? <p className="t-body c08-body">{e.body}</p> : null}
      <p className="t-tiny c08-src">출처 · {e.source}</p>
    </article>
  );
}

function StaticRail() {
  return (
    <div className="c08-static scroll-x wrap" tabIndex={0} role="region" aria-label="기록 카드 목록">
      <ul className="c08-static-list">
        {evidence.map((e) => (
          <li key={e.no} className={e.group === "대기업" ? "is-enterprise" : ""}>
            <EvidenceCard e={e} />
          </li>
        ))}
      </ul>
    </div>
  );
}
