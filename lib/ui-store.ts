"use client";
import { useSyncExternalStore } from "react";

type UI = { palette: boolean; menu: boolean };
let state: UI = { palette: false, menu: false };
const subs = new Set<() => void>();

export const ui = {
  get: () => state,
  set(patch: Partial<UI>) {
    state = { ...state, ...patch };
    subs.forEach((s) => s());
  },
  subscribe(fn: () => void) {
    subs.add(fn);
    return () => {
      subs.delete(fn);
    };
  },
};

const server: UI = { palette: false, menu: false };
export function useUI<T>(sel: (s: UI) => T): T {
  return useSyncExternalStore(ui.subscribe, () => sel(state), () => sel(server));
}
