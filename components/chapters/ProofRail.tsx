"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { A11y, FreeMode, Keyboard, Mousewheel } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import "swiper/css/free-mode";
import { evidence, evidenceGroupLabel, evidenceGroups, groupStartIndex, type EvidenceGroup } from "@/content/evidence";
import { EvidenceCard } from "./C08Proof";
import { useInView, useReducedMotion } from "@/lib/hooks";

export function ProofRail() {
  const swiper = useRef<SwiperType | null>(null);
  const reduced = useReducedMotion();
  const [group, setGroup] = useState<EvidenceGroup>("경력");
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.3 });

  useEffect(() => {
    const s = swiper.current;
    if (!s) return;
    s.params.freeMode = { ...(s.params.freeMode as object), enabled: true, momentum: !reduced };
  }, [reduced]);

  /** first card lines up with the page grid margin (.wrap padding) */
  const alignToGrid = (s: SwiperType) => {
    const wrap = ref.current?.querySelector<HTMLElement>(".c08-tabs");
    if (!wrap) return;
    // offsetLeft, not the client rect: the rail is still translated by its scroll-in when this runs
    const pad = parseFloat(getComputedStyle(wrap).paddingLeft) + wrap.offsetLeft;
    if (s.params.slidesOffsetBefore === pad) return;
    s.params.slidesOffsetBefore = pad;
    s.params.slidesOffsetAfter = pad;
    s.update();
    const t = s.activeIndex === 0 ? s.minTranslate() : Math.min(s.minTranslate(), Math.max(s.maxTranslate(), s.translate));
    s.setTranslate(t);
    s.updateProgress();
  };

  const syncGroup = (s: SwiperType) => {
    ref.current?.style.setProperty("--rail-p", Math.max(0, Math.min(1, s.progress)).toFixed(4));
    // the card at the left edge (slidesGrid = snap offsets; 대기업 cards are narrower, so progress × count drifts).
    // Translate is rebuilt from progress: on slideTo the progress event fires before s.translate is updated.
    const t = s.minTranslate() + s.progress * (s.maxTranslate() - s.minTranslate());
    const x = -t + 2;
    const grid = s.slidesGrid;
    let i = 0;
    while (i + 1 < grid.length && grid[i + 1] <= x) i++;
    const g = evidence[Math.min(i, evidence.length - 1)].group;
    setGroup((prev) => (prev === g ? prev : g));
  };

  return (
    <div ref={ref} className={`c08-rail ${inView ? "is-in" : ""}`} data-cursor="drag">
      <div className="wrap c08-tabs" role="group" aria-label="기록 그룹으로 이동">
        {evidenceGroups.map((g) => (
          <button
            key={g}
            type="button"
            className="chip"
            aria-pressed={group === g}
            onClick={() => {
              setGroup(g);
              swiper.current?.slideTo(groupStartIndex(g), reduced ? 0 : 600);
            }}
          >
            {evidenceGroupLabel[g]}
          </button>
        ))}
      </div>
      <Swiper
        modules={[FreeMode, Mousewheel, Keyboard, A11y]}
        slidesPerView="auto"
        spaceBetween={16}
        freeMode={{ enabled: true, momentum: !reduced, momentumRatio: 0.6, momentumVelocityRatio: 0.8, sticky: false }}
        grabCursor
        mousewheel={{ forceToAxis: true, sensitivity: 0.6 }}
        keyboard={{ enabled: true, onlyInViewport: true }}
        a11y={{
          enabled: true,
          containerMessage: "기록 카드 레일. 좌우로 끌거나 화살표 키로 넘길 수 있습니다.",
          slideLabelMessage: "{{index}} / {{slidesLength}}",
          prevSlideMessage: "이전 카드",
          nextSlideMessage: "다음 카드",
        }}
        className="c08-swiper"
        onSwiper={(s) => {
          swiper.current = s;
        }}
        onAfterInit={(s) => requestAnimationFrame(() => alignToGrid(s))}
        onResize={alignToGrid}
        onProgress={syncGroup}
      >
        {evidence.map((e, i) => (
          <SwiperSlide key={e.no} className={e.group === "대기업" ? "is-enterprise" : ""} style={{ "--i": Math.min(i, 6) } as CSSProperties}>
            <EvidenceCard e={e} />
          </SwiperSlide>
        ))}
      </Swiper>
      <div className="wrap c08-progress" aria-hidden="true">
        <span>
          <i />
        </span>
        <em className="t-mono fg-3">끌어서 넘기기 ⟷</em>
      </div>
    </div>
  );
}
