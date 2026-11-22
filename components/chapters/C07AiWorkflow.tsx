"use client";
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { PinSection } from "@/components/ui/Section";
import { chatKeywords, sideProjects, chatQA, workflowCaption, workflowRule, workflowSteps, workflowStills } from "@/content/ai-workflow";
import { flags } from "@/content/flags";
import { links } from "@/content/links";
import { asset, pfImage } from "@/lib/asset";
import { videoPool } from "@/lib/video-pool";
import { useDesktop, useReducedMotion } from "@/lib/hooks";
import { useScrollFrame } from "@/lib/scroll";

/** step boundaries on the pinned progress */
const STEP_AT = [0, 0.2, 0.45, 0.65, 0.82];
const scriptTokens = workflowRule.split(" ");
const captionChars = [...workflowCaption];

/**
 * C07 · #ai-dev AI 활용 개발. A = 340svh pin scrubbed by the Generator scene (inputs fly into the 9:16 frame, stills
 * dissolve into the clip) while the DOM advances steps, script tokens, caption characters and the
 * waveform. Below 1024px / reduced motion A is a static composition with every step shown.
 * B (ASK WOOSUNG) and C (NEXT GOAL) follow as a free-scrolling night block.
 */
export function C07AiWorkflow() {
  return (
    <>
      <PinSection id="ai-dev" hd={340} hm={null} className="c07" stageClassName="c07-stage">
        <div className="wrap c07-inner c07-pin">
          <WorkflowStudio />
        </div>
      </PinSection>
      <section className="chapter c07 c07-more" data-tone="night" aria-labelledby="ai-dev-chat-title">
        <div className="wrap c07-inner c07-rest">
          <AskPanel />
          <p className="c07-vd t-body">
            <span className="t-mono">NEXT GOAL</span>
            <span className="c07-vd-badge t-meta">목표</span>
            <span className="fg-2">데이터 흐름과 상태를 다루는 프론트엔드 개발자, 나아가 풀스택 개발자로 성장하는 것이 목표입니다.</span>
          </p>
        </div>
      </section>
    </>
  );
}

function WorkflowStudio() {
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  const desktop = useDesktop();
  const scrub = desktop && !reduced;
  const last = useRef({ step: -1, tok: -1, cap: -1, wave: "", vid: "" });

  useScrollFrame(
    (s) => {
      const r = root.current;
      const v = video.current;
      if (!r || !v) return;
      const near = s.activeId === "ai-dev" || s.activeId === "pipeline";
      const p = scrub ? s.progress("ai-dev") : 1;
      const step = STEP_AT.reduce((a, at, i) => (p >= at ? i : a), 0);
      const tok = scrub ? Math.ceil(Math.min(1, p / 0.18) * scriptTokens.length) : scriptTokens.length;
      const cap = scrub ? Math.ceil(Math.min(1, Math.max(0, (p - 0.45) / 0.18)) * captionChars.length) : captionChars.length;
      const wave = !scrub || p >= 0.82 ? "2" : p >= 0.65 ? "1" : "0";
      const L = last.current;
      if (step !== L.step) r.dataset.step = String((L.step = step));
      if (tok !== L.tok) r.style.setProperty("--tok", String((L.tok = tok)));
      if (cap !== L.cap) r.style.setProperty("--cap", String((L.cap = cap)));
      if (wave !== L.wave) r.dataset.wave = L.wave = wave;

      // the DOM clip only plays when the Generator scene is not drawing the frame
      const gl = scrub && document.documentElement.dataset.glGenerator === "1";
      const vid = gl || !near ? "none" : reduced ? "load" : p > 0.28 || !scrub ? "play" : "load";
      if (vid !== L.vid) {
        L.vid = vid;
        if (vid === "none") videoPool.release(v);
        else videoPool.request(v, asset("media/video/reel/mobile-01.mp4"), vid as "play" | "load", 1);
      }
    },
    [scrub, reduced],
  );
  useEffect(() => {
    const v = video.current;
    return () => {
      if (v) videoPool.release(v);
    };
  }, []);

  return (
    <div ref={root} className="c07-a" data-step="0" data-wave="0" data-scrub={scrub ? "1" : "0"}>
      <div className="c07-a-text">
        <p className="t-mono c07-eyebrow">AI-ASSISTED DEVELOPMENT — CLAUDE CODE · CURSOR</p>
        <h2 id="ai-dev-title" className="t-h2">
          구조는 직접 설계하고,
          <br />
          AI가 쓴 코드는 검증합니다.
        </h2>
        <ol className="c07-steps">
          {workflowSteps.map((s, i) => (
            <li key={s} data-i={i}>
              <span className="t-mono">{String(i + 1).padStart(2, "0")}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <p className="t-meta fg-3 c07-io">
          <span>입력 · 작업 화면 5장 + 작업 규칙(Rules)</span>
          <span>출력 · 검토를 거친 반응형 UI 코드 · HTML · SCSS · JavaScript · Vue · React</span>
        </p>
      </div>

      <div className="c07-a-visual">
        <div className="c07-inputs">
          <p className="t-mono fg-3">INPUT</p>
          <ul>
            {workflowStills.map((s, i) => (
              <li key={s.id} style={{ ["--i" as string]: i }}>
                {flags.useWorkStillsInGenerator ? (
                  <img src={pfImage(s.id)} width={480} height={480} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className="c07-ph t-mono">화면 {String(i + 1).padStart(2, "0")}</span>
                )}
              </li>
            ))}
          </ul>
          <p className="c07-script t-body">
            <span className="t-mono fg-3">규칙</span>“
            {scriptTokens.map((t, i) => (
              <span key={i} className="c07-tok" style={{ "--i": i } as CSSProperties}>
                {t}{" "}
              </span>
            ))}
            ”
          </p>
        </div>
        <span className="c07-arrow" aria-hidden="true">
          →
        </span>
        <div className="c07-output">
          <p className="t-mono fg-3">OUTPUT</p>
          <div className="c07-frame">
            <video
              ref={video}
              muted
              playsInline
              loop
              preload="none"
              poster={asset("media/video/reel/mobile-01-poster.jpg")}
              width={540}
              height={960}
              aria-label="모바일 반응형 화면 예시 영상"
              controls={reduced}
            />
            <p className="c07-caption" aria-label={workflowCaption}>
              {captionChars.map((c, i) => (
                <span key={i} className="c07-ch" style={{ "--i": i } as CSSProperties} aria-hidden="true">
                  {c}
                </span>
              ))}
            </p>
          </div>
          <div className="c07-wave" aria-hidden="true">
            {Array.from({ length: 32 }, (_, i) => (
              <i key={i} style={{ ["--i" as string]: i }} />
            ))}
          </div>
          <div className="c07-wave c07-wave-alt" aria-hidden="true">
            {Array.from({ length: 32 }, (_, i) => (
              <i key={i} style={{ ["--i" as string]: i }} />
            ))}
          </div>
          <span className="c07-out-chip t-mono">반응형 · 9:16</span>
        </div>
      </div>
      <p className="t-tiny fg-3 c07-notice">
        예시 연출입니다. 장면은 실제 작업 녹화이며, 해당 작업의 AI 사용 여부와는 무관합니다.
      </p>
    </div>
  );
}

/** Types the question (22ms per character, capped at 600ms) after a chip change. */
function useTyped(text: string, animate: boolean) {
  const [n, setN] = useState(text.length);
  const first = useRef(true);
  useEffect(() => {
    if (first.current || !animate) {
      first.current = false;
      setN(text.length);
      return;
    }
    const step = Math.min(22, 600 / text.length);
    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      const k = Math.min(text.length, Math.floor((performance.now() - t0) / step));
      setN(k);
      if (k < text.length) raf = requestAnimationFrame(tick);
    };
    setN(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, animate]);
  return text.slice(0, n);
}

function AskPanel() {
  const [sel, setSel] = useState(0);
  const chips = useRef<(HTMLButtonElement | null)[]>([]);
  const reduced = useReducedMotion();
  const qa = chatQA[sel];
  const typed = useTyped(qa.q, !reduced);
  const typing = typed.length < qa.q.length;

  const onKey = (e: KeyboardEvent) => {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (sel + d + chatQA.length) % chatQA.length;
    setSel(n);
    chips.current[n]?.focus();
  };

  return (
    <div className="c07-b">
      <div className="c07-b-text">
        <p className="t-mono c07-eyebrow">ASK WOOSUNG</p>
        <h3 id="ai-dev-chat-title" className="t-h2">
          자주 받는 질문에, 경험으로 답합니다.
        </h3>
        <p className="t-body-l fg-2 c07-lead">
          AI 작업 환경과 개발 속도, 직접 만든 개인 프로젝트, 그리고 자주 받는 질문 네 가지입니다.
        </p>
        <ul className="c07-keys" aria-label="AI 작업 방식 키워드">
          {chatKeywords.map((k) => (
            <li key={k.key}>
              <button type="button" className="c07-key t-mono" aria-describedby={`kw-${k.key}`}>
                {k.key}
              </button>
              <span role="tooltip" id={`kw-${k.key}`} className="c07-tip t-meta">
                {k.tip}
              </span>
            </li>
          ))}
        </ul>
        <div className="c07-ruler" aria-label="개인 프로젝트 5건" role="group">
          <p className="t-mono fg-3">개인 프로젝트 · 기획부터 배포까지 직접</p>
          <ol>
            {sideProjects.map((p) => (
              <li key={p.name}>
                <span className="c07-tick" aria-hidden="true" />
                <span className="t-mono">{p.name}</span>
                <b>{p.tech}</b>
              </li>
            ))}
          </ol>
        </div>
        <p className="t-meta fg-3">공개 저장소 · github.com/gntcjswo</p>
        <p className="c07-cta">
          <a href={links.github} target="_blank" rel="noopener noreferrer" className="link-u link-u-on t-body" data-cursor="open">
            GitHub에서 보기 <span aria-hidden="true">↗</span>
            <span className="sr-only"> (새 창)</span>
          </a>
        </p>
      </div>

      <div className="c07-b-demo">
        <div className="c07-qchips scroll-x" role="radiogroup" aria-label="예시 질문" onKeyDown={onKey} data-lenis-prevent-touch>
          {chatQA.map((c, i) => (
            <button
              key={c.q}
              ref={(el) => void (chips.current[i] = el)}
              type="button"
              role="radio"
              aria-checked={sel === i}
              tabIndex={sel === i ? 0 : -1}
              className="chip"
              onClick={() => setSel(i)}
            >
              {c.q}
            </button>
          ))}
        </div>
        <div className="c07-answer" aria-live="polite">
          <p className="c07-question">
            <span className="t-mono fg-3">Q.</span> <span aria-hidden="true">{typed}</span>
            <span className="sr-only">{qa.q}</span>
            <span className="c07-caret" data-on={typing ? "1" : "0"} aria-hidden="true" />
          </p>
          {typing ? null : (
            <div key={sel} className="c07-answer-in">
              <p className="c07-a-text-body">
                {qa.a.map((s, i) => (
                  <span key={i} className="c07-sent" style={{ ["--i" as string]: i }}>
                    {s}{" "}
                  </span>
                ))}
              </p>
              <p className="c07-sources" style={{ ["--n" as string]: qa.a.length }}>
                <span className="c07-src is-used t-mono">근거 · {qa.source}</span>
              </p>
            </div>
          )}
        </div>
        <p className="t-tiny fg-3">예시 화면입니다. 실제 AI 응답이 아니며, 답은 포트폴리오 FAQ와 본인 기재 내용을 줄인 것입니다.</p>
      </div>
    </div>
  );
}
