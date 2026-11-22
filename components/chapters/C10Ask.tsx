"use client";
import {
  Fragment,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { FlowSection } from "@/components/ui/Section";
import { faq, faqCategories, faqCategoryTone, faqSources, type FaqItem } from "@/content/faq";
import { links } from "@/content/links";
import { useDesktop, useMounted } from "@/lib/hooks";
import { scrollEngine } from "@/lib/scroll";

const squash = (s: string) => s.normalize("NFC").replace(/\s+/g, "").toLowerCase();
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function highlight(text: string, q: string): ReactNode {
  if (!q) return text;
  const re = new RegExp(`(${[...q].map(escapeRe).join("\\s*")})`, "gi");
  const parts = text.normalize("NFC").split(re);
  return parts.map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : <Fragment key={i}>{p}</Fragment>));
}

export const ASK_EVENT = "woosung:ask";

/**
 * C10 · #ask 자주 묻는 질문. SSR/no-JS/mobile: ten <details> (question + one-line conclusion + full body).
 * Desktop after hydration: search + category filter + listbox / aria-live answer panel.
 * Deep links: #ask-NN (also fired by the command palette via the `woosung:ask` event).
 */
export function C10Ask() {
  const mounted = useMounted();
  const desktop = useDesktop();
  const panel = mounted && desktop;
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [debounced, setDebounced] = useState("");
  const [cat, setCat] = useState<(typeof faqCategories)[number]>("전체");
  const [active, setActive] = useState("01");
  const [openNo, setOpenNo] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(squash(deferred)), 120);
    return () => clearTimeout(t);
  }, [deferred]);

  const results = useMemo(
    () =>
      faq.filter(
        (f) =>
          (cat === "전체" || f.category === cat) &&
          (!debounced || squash(f.q + f.a + f.body.join("")).includes(debounced)),
      ),
    [cat, debounced],
  );

  useEffect(() => {
    if (results.length && !results.some((r) => r.no === active)) setActive(results[0].no);
  }, [results, active]);

  // deep link: #ask-NN on load / hashchange / palette event
  useEffect(() => {
    const go = (no: string) => {
      if (!faq.some((f) => f.no === no)) return;
      setCat("전체");
      setQuery("");
      setActive(no);
      setOpenNo(no);
      requestAnimationFrame(() => scrollEngine.scrollTo("#ask"));
    };
    const fromHash = () => {
      const m = location.hash.match(/^#ask-(\d\d)$/);
      if (m) go(m[1]);
    };
    const onEvt = (e: Event) => go((e as CustomEvent<string>).detail);
    fromHash();
    window.addEventListener("hashchange", fromHash);
    window.addEventListener(ASK_EVENT, onEvt);
    return () => {
      window.removeEventListener("hashchange", fromHash);
      window.removeEventListener(ASK_EVENT, onEvt);
    };
  }, []);

  const current = results.find((r) => r.no === active) ?? results[0];

  return (
    <FlowSection id="ask" className="c10">
      <div className="wrap c10-inner">
        <p className="fig t-mono">
          <span>
            <b>FIG. 07</b> — QUESTIONS
          </span>
        </p>
        <div className="c10-head">
          <h2 id="ask-title" className="t-h2" data-rv="lines">
            <span className="rv-line">
              <span>무엇이 궁금하세요?</span>
            </span>
          </h2>
          <label className="c10-search" data-rv="" style={{ "--rv-d": 120 } as CSSProperties}>
            <span className="sr-only">질문 검색</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="질문을 입력해 보세요 (예: 경력, SEO, React)"
              autoComplete="off"
              enterKeyHint="search"
            />
            <span className="c10-search-ico" aria-hidden="true">
              ⌕
            </span>
          </label>
        </div>

        <div
          className="c10-cats scroll-x"
          role="group"
          aria-label="질문 분류"
          data-lenis-prevent-touch
          data-rv=""
          style={{ "--rv-d": 200 } as CSSProperties}
        >
          {faqCategories.map((c) => (
            <button key={c} type="button" className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>
              {c !== "전체" ? <span className="c10-dot" data-tone={faqCategoryTone[c]} aria-hidden="true" /> : null}
              {c}
            </button>
          ))}
        </div>

        <p className="sr-only" aria-live="polite">
          {results.length}개의 질문
        </p>

        {results.length === 0 ? (
          <div className="c10-empty">
            <p className="t-h3">더 많은 작업은 작업 색인에서 볼 수 있습니다.</p>
            <a href="#index" className="link-u link-u-on" data-cursor="open">
              작업 색인 보기 <span aria-hidden="true">→</span>
            </a>
          </div>
        ) : panel ? (
          <Panel items={results} current={current} onPick={setActive} q={debounced} />
        ) : (
          <ul className="c10-details">
            {results.map((f, i) => (
              <li key={f.no} data-rv="" style={{ "--rv-d": i * 50 } as CSSProperties}>
                <details
                  id={`ask-${f.no}`}
                  open={openNo === f.no || undefined}
                  onToggle={(e) => {
                    const o = (e.target as HTMLDetailsElement).open;
                    if (o) setOpenNo(f.no);
                    else if (openNo === f.no) setOpenNo(null);
                  }}
                >
                  <summary>
                    <span className="t-mono c10-no">{f.no}</span>
                    <span className="c10-sum">
                      <span className="c10-q">{highlight(f.q, debounced)}</span>
                      <span className="c10-a">{highlight(f.a, debounced)}</span>
                    </span>
                    <span className="c10-chev" aria-hidden="true" />
                  </summary>
                  <div className="c10-body t-body fg-2">
                    {f.body.map((b, i) => (
                      <p key={i}>{highlight(b, debounced)}</p>
                    ))}
                    <p className="t-meta fg-3">출처: {faqSources[f.source]}</p>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}

        <p className="c10-all">
          <a href={links.portfolioReact} target="_blank" rel="noopener noreferrer" className="link-u link-u-on t-body" data-cursor="open">
            React 포트폴리오에서 더 보기 <span aria-hidden="true">↗</span>
            <span className="sr-only"> (새 창)</span>
          </a>
        </p>
      </div>
    </FlowSection>
  );
}

function Panel({ items, current, onPick, q }: { items: FaqItem[]; current: FaqItem; onPick: (no: string) => void; q: string }) {
  const [lit, setLit] = useState(false);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLit(false);
    const t = requestAnimationFrame(() => requestAnimationFrame(() => setLit(true)));
    return () => cancelAnimationFrame(t);
  }, [current.no]);

  const onKey = (e: KeyboardEvent) => {
    const i = items.findIndex((x) => x.no === current.no);
    let n = i;
    if (e.key === "ArrowDown") n = Math.min(items.length - 1, i + 1);
    else if (e.key === "ArrowUp") n = Math.max(0, i - 1);
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = items.length - 1;
    else return;
    e.preventDefault();
    onPick(items[n].no);
    list.current?.querySelector(`#ask-${items[n].no}`)?.scrollIntoView({ block: "nearest" });
  };

  return (
    <div className="c10-panel">
      <div
        ref={list}
        className="c10-list"
        role="listbox"
        tabIndex={0}
        aria-label="질문 목록"
        aria-activedescendant={`ask-${current.no}`}
        onKeyDown={onKey}
      >
        {items.map((f, i) => (
          <div
            key={f.no}
            id={`ask-${f.no}`}
            role="option"
            aria-selected={f.no === current.no}
            className="c10-opt"
            data-rv=""
            style={{ "--rv-d": 180 + i * 55 } as CSSProperties}
            onClick={() => onPick(f.no)}
          >
            <span className="t-mono c10-no">{f.no}</span>
            <span className="c10-dot" data-tone={faqCategoryTone[f.category]} aria-hidden="true" />
            <span className="c10-q">{highlight(f.q, q)}</span>
          </div>
        ))}
      </div>
      <div className="c10-answer card" aria-live="polite" data-rv="right" style={{ "--rv-d": 320 } as CSSProperties}>
        <div key={current.no} className="c10-answer-in">
          <p className="t-mono fg-3">
            {current.no} · {current.category}
          </p>
          <h3 className="t-h3 c10-answer-q">{highlight(current.q, q)}</h3>
          <p className="c10-answer-a">
            <span className={`marker-anim ${lit ? "is-on" : ""}`}>{highlight(current.a, q)}</span>
          </p>
          <div className="c10-answer-body t-body fg-2">
            {current.body.map((b, i) => (
              <p key={i}>{highlight(b, q)}</p>
            ))}
          </div>
          <p className="t-meta fg-3">출처: {faqSources[current.source]}</p>
        </div>
      </div>
    </div>
  );
}
