"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PinSection } from "@/components/ui/Section";
import { stations } from "@/content/services";
import { pfThumb, pfVideo } from "@/lib/asset";
import { scrollEngine, useActiveChapter, useScrollFrame } from "@/lib/scroll";
import { useDesktop, useReducedMotion } from "@/lib/hooks";
import { videoPool, type VideoPriority } from "@/lib/video-pool";

const N = stations.length;

/**
 * C06 · #pipeline 작업 방식. Desktop (≥1024): pinned horizontal track (translate3d by --p), SVG line
 * revealed by clip-path, only the centred station's video plays. The chapter sits on C05's orange
 * (tone "signal"); `--in` staggers the heading and track in as the stage arrives.
 * <1024 / reduced motion: vertical timeline. Pure DOM — the canvas sleeps here.
 */
export function C06Pipeline() {
  const track = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const width = useRef(0);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const chapter = useActiveChapter();
  const desktop = useDesktop();
  const reduced = useReducedMotion();
  const horizontal = desktop && !reduced;

  useEffect(() => {
    const t = track.current;
    if (!t) return;
    const nodes = [...t.querySelectorAll<HTMLElement>(".c06-node")];
    const ro = new ResizeObserver(() => {
      width.current = t.scrollWidth;
      const svg = t.querySelector<SVGSVGElement>(".c06-line");
      const path = t.querySelector<SVGPathElement>(".c06-line-bg");
      if (!horizontal || !svg || !path || !svg.getBoundingClientRect().width) {
        nodes.forEach((n) => n.style.removeProperty("top"));
        return;
      }
      const tr = t.getBoundingClientRect();
      const sr = svg.getBoundingClientRect();
      const len = path.getTotalLength();
      const pts = Array.from({ length: 241 }, (_, k) => path.getPointAtLength((len * k) / 240));
      const yAt = (u: number) => {
        const j = pts.findIndex((q) => q.x >= u);
        if (j <= 0) return pts[Math.max(0, j)].y;
        const a = pts[j - 1];
        const b = pts[j];
        return a.y + ((b.y - a.y) * (u - a.x)) / Math.max(1e-6, b.x - a.x);
      };
      nodes.forEach((n) => {
        const st = n.parentElement as HTMLElement;
        const u = ((st.offsetLeft - (sr.left - tr.left)) / sr.width) * 1000;
        const y = sr.top - tr.top + (yAt(Math.min(1000, Math.max(0, u))) / 40) * sr.height;
        n.style.top = `${(y - st.offsetTop - n.offsetHeight / 2).toFixed(1)}px`;
      });
    });
    ro.observe(t);
    return () => ro.disconnect();
  }, [horizontal]);

  useScrollFrame(
    (s) => {
      if (!horizontal || !track.current || !root.current) return;
      if (s.activeId !== "pipeline" && s.activeId !== "scroll-through" && s.activeId !== "ai-dev") return;
      // arrival on C05's orange: 0 while the stage is still a screen below, 1 once it is pinned
      const sec = scrollEngine.section("pipeline");
      if (sec) {
        const enter = Math.min(1, Math.max(0, (s.scroll - (sec.top - s.vh)) / s.vh));
        root.current.style.setProperty("--in", enter.toFixed(4));
        // hold the content fixed on screen while the stage itself is still rising over C05's orange
        const hold = Math.min(s.vh, Math.max(0, sec.top - s.scroll));
        root.current.style.setProperty("--hold", `${(-hold).toFixed(1)}px`);
      }
      const p = s.progress("pipeline");
      const travel = Math.max(0, width.current - s.vw + 0);
      track.current.style.transform = `translate3d(${(-p * travel).toFixed(1)}px,0,0)`;
      root.current.style.setProperty("--line", p.toFixed(4));
      const a = Math.min(N - 1, Math.round(p * (N - 1)));
      if (a !== activeRef.current) {
        activeRef.current = a;
        setActive(a);
      }
    },
    [horizontal],
  );

  return (
    <PinSection id="pipeline" hd={420} hm={null} className="c06" stageClassName="c06-stage">
      <div ref={root} className="c06-inner" data-horizontal={horizontal ? "1" : "0"}>
        <div className="wrap c06-head">
          <p className="t-mono fg-3 c06-latin">Web Publishing + Interaction Dev</p>
          <h2 id="pipeline-title" className="t-h2">
            디자인과 개발 사이, <span className="nowrap">가장 매끄러운 다리를 놓습니다.</span>
          </h2>
          <p className="t-body-l fg-2 c06-lead">시안 분석부터 배포까지, 다수 프로젝트에서 1인 퍼블리셔로 전 과정을 주도했습니다.</p>
        </div>

        <div className="c06-viewport">
          <div ref={track} className="c06-track">
            <svg className="c06-line" viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 20 C 100 0, 100 40, 200 20 S 300 0, 400 20 S 500 40, 600 20 S 700 0, 800 20 S 900 40, 1000 20" pathLength={1} className="c06-line-bg" />
              <path d="M0 20 C 100 0, 100 40, 200 20 S 300 0, 400 20 S 500 40, 600 20 S 700 0, 800 20 S 900 40, 1000 20" pathLength={1} className="c06-line-fg" />
            </svg>
            <ol className="c06-stations">
              {stations.map((st, i) => (
                <li
                  key={st.no}
                  className="c06-station"
                  data-state={i < active ? "past" : i === active ? "active" : "next"}
                  style={{ "--i": i } as CSSProperties}
                >
                  <span className="c06-node" aria-hidden="true" />
                  <div className="c06-card card">
                    <div className="c06-no">
                      <span className="t-mono">STATION</span>
                      <span className="c06-no-n">{st.no}</span>
                    </div>
                    <div className="c06-body">
                      <p className="t-mono fg-3">{st.latin}</p>
                      <h3 className="t-h3 c06-title">{st.title}</h3>
                      <ul className="c06-lines t-body fg-2">
                        {st.lines.map((l) => (
                          <li key={l}>{l}</li>
                        ))}
                      </ul>
                      {i === N - 1 ? (
                        <p className="t-meta c06-fact">
                          라온비엔피에서는 퍼블리싱 템플릿과 빌드·배포 환경을 직접 설계·구축했습니다.{" "}
                          <span className="label-b">포트폴리오 경력</span>
                        </p>
                      ) : null}
                    </div>
                    <figure className="c06-media">
                      <StationVideo
                        id={st.video.id}
                        label={st.video.name}
                        mode={horizontal ? (chapter === "pipeline" ? (i === active ? "play" : Math.abs(i - active) === 1 ? "load" : "none") : "none") : "observe"}
                        priority={(i === active ? 0 : 1) as VideoPriority}
                        reduced={reduced}
                      />
                      <figcaption className="t-tiny fg-3">작업 예시 · {st.video.name}</figcaption>
                    </figure>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="wrap c06-meter t-mono" aria-hidden="true">
          <span>
            {String(active + 1).padStart(2, "0")} / {String(N).padStart(2, "0")}
          </span>
          <span className="c06-meter-bar">
            <i />
          </span>
        </div>
      </div>
    </PinSection>
  );
}

function StationVideo({
  id,
  label,
  mode,
  priority,
  reduced,
}: {
  id: number;
  label: string;
  mode: "play" | "load" | "none" | "observe";
  priority: VideoPriority;
  reduced: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [seen, setSeen] = useState<"none" | "load" | "play">("none");

  useEffect(() => {
    if (mode !== "observe") return;
    const el = ref.current!;
    const near = new IntersectionObserver(([e]) => setSeen((v) => (e.isIntersecting ? (v === "play" ? v : "load") : "none")), {
      rootMargin: "50% 0px",
    });
    const center = new IntersectionObserver(([e]) => setSeen(e.isIntersecting ? "play" : "load"), {
      rootMargin: "-30% 0px -30% 0px",
    });
    near.observe(el);
    center.observe(el);
    return () => {
      near.disconnect();
      center.disconnect();
    };
  }, [mode]);

  useEffect(() => {
    const el = ref.current!;
    let want = mode === "observe" ? seen : mode;
    if (reduced && want === "play") want = "load";
    videoPool.request(el, pfVideo(id), want, priority);
  }, [mode, seen, priority, id, reduced]);

  useEffect(() => {
    const el = ref.current!;
    return () => videoPool.release(el);
  }, []);

  return (
    <video
      ref={ref}
      muted
      playsInline
      loop
      preload="none"
      poster={pfThumb(id)}
      width={640}
      height={360}
      controls={reduced}
      aria-label={`작업 예시 영상 · ${label}`}
    />
  );
}
