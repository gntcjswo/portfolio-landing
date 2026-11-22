"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { FlowSection } from "@/components/ui/Section";
import { roleTiers, careerRanges, rulerTicks, scopeItems, toolChips, teamSteps } from "@/content/scope";
import { flags } from "@/content/flags";
import { links } from "@/content/links";
import { useInView, useReducedMotion } from "@/lib/hooks";
import { useScrollFrame } from "@/lib/scroll";

/** C09 · #start 역할과 성장 — A 역할의 범위 게이지, B 경력 타임라인, C 합류 후 할 수 있는 일 6가지. DOM only. */
export function C09Start() {
  return (
    <FlowSection id="start" className="c09">
      <div className="wrap c09-inner">
        <p className="fig t-mono">
          <span>
            <b>FIG. 06</b> — ROLE
          </span>
        </p>
        <h2 id="start-title" className="t-h2 c09-h2" data-rv="lines">
          <span className="rv-line">
            <span>퍼블리싱에서 시작해,</span>
          </span>{" "}
          <span className="rv-line">
            <span>역할을 넓혀 왔습니다.</span>
          </span>
        </h2>
        <TierGauge />
        {flags.showCareerTimeline ? <CareerTimeline /> : null}
        <TeamPath />
      </div>
    </FlowSection>
  );
}

/* ── A ─────────────────────────────────────────────────────────── */
function TierGauge() {
  const [step, setStep] = useState(1);
  const touched = useRef(false);
  const track = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.5 });
  const t = roleTiers[step - 1];

  // one-shot preview 1 → 2 → 3 on first entry; any user input cancels it
  useEffect(() => {
    if (!inView || reduced || touched.current) return;
    const a = setTimeout(() => !touched.current && setStep(2), 700);
    const b = setTimeout(() => !touched.current && setStep(3), 1400);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [inView, reduced]);

  const set = useCallback((n: number) => {
    touched.current = true;
    setStep(Math.max(1, Math.min(3, n)));
  }, []);

  const fromPointer = (e: PointerEvent) => {
    const r = track.current!.getBoundingClientRect();
    set(Math.floor(((e.clientX - r.left) / r.width) * 3) + 1);
  };

  const onKey = (e: KeyboardEvent) => {
    const map: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
    if (e.key in map) {
      e.preventDefault();
      set(step + map[e.key]);
    } else if (e.key === "Home") set(1);
    else if (e.key === "End") set(3);
  };

  return (
    <div ref={ref} className="c09-a" data-rv="">
      <div className="c09-a-head">
        <p className="t-mono c09-letter">A</p>
        <h3 className="t-h3">역할의 범위</h3>
      </div>

      <div className="c09-a-body">
        <div
          ref={track}
          className="c09-slider"
          role="slider"
          tabIndex={0}
          aria-label="역할의 범위 단계"
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={step}
          aria-valuetext={[`${step}단계`, t.name, t.sinceLabel, scopeItems.slice(0, t.areas).map((x) => x.name).join(", ")].join(" · ")}
          onKeyDown={onKey}
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            fromPointer(e);
          }}
          onPointerMove={(e) => e.buttons === 1 && fromPointer(e)}
          style={{ "--step": step } as CSSProperties}
        >
          <span className="c09-slider-fill" aria-hidden="true" />
          {roleTiers.map((x) => (
            <span key={x.step} className="c09-seg" data-on={x.step <= step ? "1" : "0"} aria-hidden="true">
              <b>{x.step}단계</b>
            </span>
          ))}
        </div>

        <div className="c09-read">
          <p className="c09-name t-h3">{t.name}</p>
          <dl className="c09-figures">
            <div>
              <dt className="t-mono fg-3">시작 연도</dt>
              <dd>
                <RollNumber value={t.since} />
                <span className="c09-unit">년부터</span>
              </dd>
            </div>
          </dl>
          <ol className="c09-cells" aria-label={`${step}단계 역량`}>
            {scopeItems.map((item, i) => (
              <li
                key={item.name}
                data-on={i < t.areas ? "1" : "0"}
                data-new={item.tier === step ? "1" : "0"}
                data-tier={item.tier}
                aria-hidden={i < t.areas ? undefined : true}
                style={{ "--i": i } as CSSProperties}
              >
                <span className="t-mono">{String(i + 1).padStart(2, "0")}</span>
                <b>{item.name}</b>
              </li>
            ))}
          </ol>
          <p className="t-meta fg-2">
            칸 하나가 역량 하나입니다. 상위 단계는 하위 단계의 역량을 포함하고, 주황색은 그 단계에서 새로 더한 역량입니다. 연도는 해당 업무가 경력에 처음 기재된 해입니다.
          </p>
          <p className="t-meta c09-notice">지금은 라온비엔피에서 세 단계의 일을 모두 하고 있습니다.</p>
          <a className="btn btn-signal" href="#ask" data-cursor="open">
            자주 묻는 질문 보기 <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </div>
  );
}

/** Per-digit vertical roll (400ms ease-out-quint); a non-digit suffix ("+") sits after the digits. Screen readers get the plain text. */
function RollNumber({ value, suffix = "", rollIn = false }: { value: number; suffix?: string; rollIn?: boolean }) {
  const digits = String(value).split("");
  // with rollIn the figure mounts at 0 and roll up on the next frames
  const [ready, setReady] = useState(!rollIn);
  useEffect(() => {
    if (ready) return;
    let b = 0;
    const a = requestAnimationFrame(() => (b = requestAnimationFrame(() => setReady(true))));
    return () => {
      cancelAnimationFrame(a);
      cancelAnimationFrame(b);
    };
  }, [ready]);
  return (
    <span className="roll" aria-label={String(value) + suffix}>
      {digits.map((d, i) => (
        <span key={digits.length - i} className="roll-col" aria-hidden="true">
          <span className="roll-strip" style={{ "--d": ready ? Number(d) : 0 } as CSSProperties}>
            {"0123456789".split("").map((n) => (
              <span key={n}>{n}</span>
            ))}
          </span>
        </span>
      ))}
      {suffix ? (
        <span className="roll-suffix" aria-hidden="true">
          {suffix}
        </span>
      ) : null}
    </span>
  );
}

/* ── B ─────────────────────────────────────────────────────────── */
/** linear year axis (career periods, content/scope.ts careerRanges — fractional years = month / 12) */
const YEAR_MIN = 2015;
const YEAR_MAX = 2027;
const pos = (v: number) => ((v - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100;
const fmt = (v: number) => String(v);

function CareerTimeline() {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.4 });
  return (
    <div ref={ref} className={`c09-b ${inView ? "is-in" : ""}`} data-rv="">
      <div className="c09-a-head">
        <p className="t-mono c09-letter">B</p>
        <h3 className="t-h3">경력 타임라인</h3>
      </div>
      <div className="c09-ruler">
        <div className="c09-ruler-axis" aria-hidden="true">
          {rulerTicks.map((v) => (
            <span key={v} style={{ left: `${pos(v)}%` }} className="t-mono">
              {fmt(v)}
            </span>
          ))}
        </div>
        <ol className="c09-ranges">
          {careerRanges.map((r, i) => (
            <li
              key={r.name}
              style={
                {
                  "--from": `${pos(r.from)}%`,
                  "--to": `${r.to ? pos(r.to) : 100}%`,
                  "--i": i,
                } as CSSProperties
              }
              data-open={r.to ? "0" : "1"}
            >
              <span className="c09-range-bar" aria-hidden="true" />
              <span className="c09-range-label">
                <b>{r.name}</b>
                <span className="t-meta fg-2">{r.note}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <p className="t-meta fg-3">기간은 포트폴리오 경력 기재 기준입니다. 미르나인에서는 2024.09~12에 프리랜서로 한 번 더 일했습니다.</p>
    </div>
  );
}

/* ── C ─────────────────────────────────────────────────────────── */
function TeamPath() {
  const el = useRef<HTMLDivElement>(null);
  const top = useRef(0);
  const last = useRef(-1);

  useEffect(() => {
    const node = el.current!;
    const measure = () => {
      top.current = node.getBoundingClientRect().top + window.scrollY;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, []);

  // non-pinned scrub: block top travels from 85% → 25% of the viewport
  useScrollFrame((s) => {
    if (s.activeId !== "start" && s.activeId !== "ask") return;
    const p = Math.max(0, Math.min(1, (s.scroll + s.vh * 0.85 - top.current) / (s.vh * 0.6)));
    if (Math.abs(p - last.current) < 0.002) return;
    last.current = p;
    el.current?.style.setProperty("--vp", p.toFixed(3));
  });

  return (
    <div ref={el} className="c09-c" data-rv="" style={{ "--vp": 0 } as CSSProperties}>
      <div className="c09-a-head">
        <p className="t-mono c09-letter">C</p>
        <h3 className="t-h3">
          팀에 합류하면 — <span className="marker">바로 할 수 있는 일</span>
        </h3>
      </div>
      <ul className="c09-tools" aria-label="개발·협업 도구">
        {toolChips.map((p) => (
          <li key={p} className="chip">
            {p}
          </li>
        ))}
      </ul>
      <ol className="c09-path">
        <div className="c09-gauge" aria-hidden="true">
          <i className="c09-gauge-fill" />
          <i className="c09-gauge-head" />
        </div>
        {teamSteps.map((s, i) => (
          <li key={s.name} style={{ "--i": i } as CSSProperties}>
            <span className="c09-node" aria-hidden="true" />
            <span className="t-mono fg-3">{String(i + 1).padStart(2, "0")}</span>
            <b className="c09-step-name">{s.name}</b>
            <span className="t-meta fg-2">{s.text}</span>
          </li>
        ))}
      </ol>
      <ul className="c09-notes t-meta fg-2">
        <li>팀의 규칙과 협업 도구에 맞춰 일합니다.</li>
        <li>AI가 제안한 코드는 구조와 안정성을 검증한 뒤 적용합니다.</li>
      </ul>
      <a className="btn btn-ghost" href={links.portfolioReact} target="_blank" rel="noopener noreferrer" data-cursor="open">
        이전 포트폴리오 보기 <span aria-hidden="true">↗</span>
        <span className="sr-only"> (새 창)</span>
      </a>
    </div>
  );
}
