"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { PinSection } from "@/components/ui/Section";
import { categories, projectCount, similarWorks, works, type Work } from "@/content/portfolio";
import { pfImage, pfThumb, pfVideo } from "@/lib/asset";
import { scrollEngine, useScrollFrame } from "@/lib/scroll";
import { videoPool } from "@/lib/video-pool";
import { useReducedMotion } from "@/lib/hooks";
import { indexBus } from "@/lib/index-bus";

const PAGE = 24;
const workById = new Map(works.map((w) => [w.id, w]));

/**
 * C04 · #index 작업 색인. Desktop: pinned stage whose `.c04-wall` hosts the Index scene
 * (InstancedMesh 169 + atlas + lens). The DOM grid stays in the SSR HTML for every tier (screen
 * readers, keyboard, mobile, no-GL) and is only visually hidden while the GL wall is ready.
 * `.c04-anchor` marks pf-001's tile at rest: Layers (C03) lands on it, Index starts from it.
 */
export function C04Index() {
  const [filter, setFilter] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<Work | null>(null);
  const wall = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const handoff = useRef<(HTMLElement | null)[]>([]);

  const list = useMemo(() => (filter ? works.filter((w) => w.category.includes(filter)) : works), [filter]);

  useEffect(() => indexBus.setFilter(filter), [filter]);
  useEffect(() => indexBus.onOpen((id) => setOpen(workById.get(id) ?? null)), []);
  useEffect(
    () =>
      indexBus.onHover((id) => {
        const w = wall.current;
        const l = label.current;
        if (!w || !l) return;
        const work = workById.get(id);
        w.dataset.cursor = work ? "view" : "";
        l.textContent = work ? `${work.name}${work.client ? ` · ${work.client}` : ""}` : "";
        l.dataset.on = work ? "1" : "0";
      }),
    [],
  );

  // the hand-off into C05 releases any active filter (p 0.85–1)
  useScrollFrame(
    (s) => {
      if (filter && s.activeId === "index" && s.progress("index") > 0.68) setFilter(null);
      // the DOM grid scrolls inside the wall only while it is the visible fallback (or the keyboard overlay);
      // over the GL wall the wheel must reach Lenis
      const w = wall.current;
      if (w) {
        const own =
          s.vw >= 1024 &&
          !scrollEngine.reducedMotion &&
          (document.documentElement.dataset.glIndex !== "1" || w.matches(":focus-within"));
        if (own !== w.hasAttribute("data-lenis-prevent")) w.toggleAttribute("data-lenis-prevent", own);
      }
      // the hand-off overlays are written by the Index GL frame, which stops outside its window (e.g. after
      // a jump); outside C04 → C05's top they must not keep their last state
      const is = scrollEngine.section("index");
      const st = scrollEngine.section("scroll-through");
      const off = !is || !st || s.scroll < is.top || s.scroll > st.top + 1;
      for (const el of handoff.current) if (el && off !== el.hasAttribute("data-off")) el.toggleAttribute("data-off", off);
    },
    [filter],
  );

  const onMove = (e: React.PointerEvent) => {
    indexBus.setPointer(e.clientX, e.clientY, true);
    if (label.current) label.current.style.transform = `translate3d(${e.clientX + 18}px, ${e.clientY + 18}px, 0)`;
  };
  const onLeave = (e: React.PointerEvent) => {
    indexBus.setPointer(e.clientX, e.clientY, false);
  };

  return (
    <PinSection id="index" hd={240} hm={null} className="c04" stageClassName="c04-stage">
      <div className="wrap c04-inner">
        <p className="fig t-mono">
          <span>
            <b>FIG. 03</b> — INDEX
          </span>
        </p>
        <div className="c04-head">
          <h2 id="index-title" className="t-h2">
            400건이 넘는 <span className="nowrap">작업 중,</span>
            <br className="lg:hidden" /> 대표작 {projectCount}건.
          </h2>
          <p className="t-body-l fg-2 c04-lead">
            2015년부터 {categories.length}개 분야의 작업을 퍼블리싱했습니다. 대표작의 화면 {works.length}점을 실었고, 분야를 고르면 해당 화면이 앞으로 모입니다.
          </p>
        </div>

        <div className="c04-chips scroll-x" role="group" aria-label="분야 필터" data-lenis-prevent-touch>
          <button
            type="button"
            className="chip"
            aria-pressed={filter === null}
            onClick={() => {
              setFilter(null);
              setShown(PAGE);
            }}
          >
            전체 <span className="n">{works.length}</span>
          </button>
          {categories.map((c) => (
            <button
              key={c.name}
              type="button"
              className="chip"
              aria-pressed={filter === c.name}
              onClick={() => {
                setFilter(filter === c.name ? null : c.name);
                setShown(PAGE);
              }}
            >
              {c.name} <span className="n">{c.count}</span>
            </button>
          ))}
        </div>

        <p className="t-meta fg-3 c04-status" aria-live="polite">
          {filter ? `${filter} · ${list.length}점` : `전체 · ${list.length}점`}
        </p>

        <div
          ref={wall}
          className="c04-wall"
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("button, a")) return;
            indexBus.pick();
          }}
        >
          <span className="c04-anchor" data-work="1" aria-hidden="true" />
        <ul className="c04-grid">
          {list.slice(0, shown).map((w) => (
            <li key={w.id}>
              <button
                type="button"
                className="c04-tile"
                data-cursor="view"
                aria-haspopup="dialog"
                onClick={() => setOpen(w)}
              >
                <span className="c04-thumb" data-work={w.id}>
                  <img src={pfThumb(w.id)} width={320} height={180} alt="" loading="lazy" decoding="async" />
                </span>
                <span className="c04-meta">
                  <span className="c04-name">{w.name}</span>
                  <span className="c04-client fg-3">{w.client || w.category[0]}</span>
                </span>
                <span className="c04-no t-mono" aria-hidden="true">
                  {String(w.id + 1).padStart(3, "0")}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {shown < list.length ? (
          <div className="c04-more">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShown((n) => n + PAGE)}>
              더 보기 <span className="t-mono">{Math.min(PAGE, list.length - shown)}</span>
            </button>
            <span className="t-meta fg-3">
              {shown} / {list.length}
            </span>
          </div>
        ) : null}
        </div>
      </div>
      <span ref={label} className="c04-hover-label t-meta" aria-hidden="true" data-on="0" />
      <p
        ref={(el) => {
          handoff.current[0] = el;
        }}
        className="c04-pick"
        aria-hidden="true"
      >
        <span className="t-mono">NEXT · 대표 작업 01 / 05</span>
        <b>{works[0].name}</b>
      </p>

      <WorkDrawer work={open} onClose={() => setOpen(null)} onPick={setOpen} />
    </PinSection>
  );
}

function WorkDrawer({ work, onClose, onPick }: { work: Work | null; onClose: () => void; onPick: (w: Work) => void }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (work && !d.open) {
      d.showModal();
      scrollEngine.pause();
    } else if (!work && d.open) {
      d.close();
    }
  }, [work]);

  useEffect(() => {
    const v = vid.current;
    if (!v || !work) return;
    videoPool.request(v, pfVideo(work.id), reduced ? "load" : "play", 0);
    return () => videoPool.release(v);
  }, [work, reduced]);

  const similar = work ? similarWorks(work) : [];

  return (
    <dialog
      ref={dlg}
      className="c04-drawer"
      aria-labelledby="c04-drawer-title"
      onClose={() => {
        scrollEngine.resume();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dlg.current) dlg.current?.close();
      }}
      data-lenis-prevent
    >
      {work ? (
        <div className="c04-drawer-body">
          <div className="c04-drawer-top">
            <p className="t-mono fg-3">WORK {String(work.id + 1).padStart(3, "0")}</p>
            <button type="button" className="c04-close" onClick={() => dlg.current?.close()} aria-label="닫기">
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <div className="c04-drawer-media">
            <video
              ref={vid}
              muted
              playsInline
              loop
              preload="none"
              poster={pfThumb(work.id)}
              controls={reduced}
              aria-label={`${work.name} 작업 화면 영상`}
              width={640}
              height={360}
            />
          </div>
          <h3 id="c04-drawer-title" className="t-h2">
            {work.name}
          </h3>
          {work.client ? <p className="t-body-l fg-2">{work.client}</p> : null}
          <p className="c04-drawer-cats">
            {work.category.map((c) => (
              <span key={c} className="chip">
                {c}
              </span>
            ))}
          </p>
          {work.url ? (
            <a className="btn btn-signal" href={work.url} target="_blank" rel="noopener noreferrer" data-cursor="open">
              사이트 보기 <span aria-hidden="true">↗</span>
              <span className="sr-only"> (새 창)</span>
            </a>
          ) : null}
          <div className="c04-drawer-still">
            <img src={pfImage(work.id)} width={480} height={480} alt={`${work.name} 대표 이미지`} loading="lazy" decoding="async" />
          </div>
          {similar.length ? (
            <div className="c04-similar">
              <p className="t-mono fg-3">비슷한 작업 {similar.length}</p>
              <ul>
                {similar.map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => onPick(s)} className="c04-similar-item">
                      <img src={pfThumb(s.id)} width={320} height={180} alt="" loading="lazy" decoding="async" />
                      <span>{s.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}
