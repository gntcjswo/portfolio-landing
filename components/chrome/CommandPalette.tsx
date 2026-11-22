"use client";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { chapters } from "@/content/chapters";
import { faq } from "@/content/faq";
import { links } from "@/content/links";
import { scrollEngine } from "@/lib/scroll";
import { ui, useUI } from "@/lib/ui-store";
import { ASK_EVENT } from "@/components/chapters/C10Ask";

type Item = { key: string; group: "챕터" | "자주 묻는 질문" | "바로가기"; label: string; hint: string; run: () => void };

const squash = (s: string) => s.normalize("NFC").replace(/\s+/g, "").toLowerCase();

/** ⌘/Ctrl+K command palette — chapters, the 10 FAQ, shortcuts. Native modal <dialog> = focus trap + Esc. */
export function CommandPalette() {
  const open = useUI((s) => s.palette);
  const dlg = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);

  const items = useMemo<Item[]>(
    () => [
      ...chapters.map<Item>((c) => ({
        key: `c-${c.id}`,
        group: "챕터",
        label: c.name,
        hint: c.no,
        run: () => {
          history.replaceState(null, "", `#${c.id}`);
          scrollEngine.scrollTo(`#${c.id}`);
        },
      })),
      ...faq.map<Item>((f) => ({
        key: `f-${f.no}`,
        group: "자주 묻는 질문",
        label: f.q,
        hint: f.a,
        run: () => {
          history.replaceState(null, "", `#ask-${f.no}`);
          window.dispatchEvent(new CustomEvent(ASK_EVENT, { detail: f.no }));
        },
      })),
      { key: "s-gh", group: "바로가기", label: "GitHub 열기", hint: "github.com/gntcjswo ↗", run: () => window.open(links.github, "_blank", "noopener") },
      { key: "s-pf", group: "바로가기", label: "React 포트폴리오", hint: "woosung-portfolio.woobi.co.kr ↗", run: () => window.open(links.portfolioReact, "_blank", "noopener") },
    ],
    [],
  );

  const results = useMemo(() => {
    const s = squash(q);
    return s ? items.filter((i) => squash(i.label + i.hint + i.group).includes(s)) : items;
  }, [q, items]);

  useEffect(() => setIdx(0), [q]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ui.set({ palette: !ui.get().palette, menu: false });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (open && !d.open) {
      setQ("");
      d.showModal();
      scrollEngine.pause();
      requestAnimationFrame(() => input.current?.focus());
    } else if (!open && d.open) d.close();
  }, [open]);

  const choose = (it: Item | undefined) => {
    if (!it) return;
    dlg.current?.close();
    // run after the dialog has released the scroll lock
    requestAnimationFrame(() => it.run());
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = (idx + (e.key === "ArrowDown" ? 1 : -1) + results.length) % Math.max(1, results.length);
      setIdx(n);
      listRef.current?.querySelector(`[data-idx="${n}"]`)?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[idx]);
    }
  };

  let lastGroup = "";
  return (
    <dialog
      ref={dlg}
      className="palette"
      aria-label="질문하기 — 챕터, 자주 묻는 질문, 바로가기 검색"
      onClose={() => {
        scrollEngine.resume();
        ui.set({ palette: false });
      }}
      onClick={(e) => {
        if (e.target === dlg.current) dlg.current?.close();
      }}
      data-lenis-prevent
    >
      <div className="palette-box">
        <div className="palette-input">
          <span aria-hidden="true" className="t-mono">
            ?
          </span>
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="무엇이 궁금하세요? (예: 경력, SEO, React)"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={results[idx] ? `pal-${results[idx].key}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
          />
          <kbd className="t-mono">Esc</kbd>
        </div>
        <ul id="palette-list" ref={listRef} role="listbox" className="palette-list" aria-label="결과">
          {results.length === 0 ? <li className="palette-empty t-meta">결과가 없습니다.</li> : null}
          {results.map((it, i) => {
            const head = it.group !== lastGroup ? it.group : null;
            lastGroup = it.group;
            return (
              <li key={it.key} role="presentation">
                {head ? (
                  <p className="palette-group t-mono" role="presentation">
                    {head}
                  </p>
                ) : null}
                <div
                  id={`pal-${it.key}`}
                  role="option"
                  aria-selected={i === idx}
                  data-idx={i}
                  className="palette-item"
                  onMouseMove={() => i !== idx && setIdx(i)}
                  onClick={() => choose(it)}
                >
                  <span className="palette-label">{it.label}</span>
                  <span className="palette-hint t-meta">{it.hint}</span>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="palette-foot t-mono">
          <span>↑↓ 이동</span>
          <span>Enter 열기</span>
          <span>Esc 닫기</span>
        </p>
      </div>
    </dialog>
  );
}
