"use client";
// Shared state between the scroll loop (outside React/R3F) and the scenes inside the single <Canvas>.
import { useEffect, useState, type RefObject } from "react";
import { useFrame, type RootState } from "@react-three/fiber";
import type { Object3D } from "three";
import { chapterById, type ChapterId, type SceneId } from "@/content/chapters";
import type { FrameState } from "@/lib/scroll";

type Director = {
  /** primary scene (the active chapter's, or the first visible one) — null = canvas sleeps */
  scene: SceneId | null;
  /** every scene that has pixels on screen this frame (hand-off windows overlap, e.g. C02 → C03) */
  visible: Set<SceneId>;
  chapter: ChapterId;
  /** local progress of the active chapter, 0..1 */
  progress: number;
  velocity: number;
  scroll: number;
  vw: number;
  vh: number;
  /** scenes that need frames even when the page is not scrolling (time-based tweens, video) */
  continuous: Set<SceneId>;
  /** R3F frames actually rendered — shown in ?debug to prove the canvas sleeps */
  rendered: number;
  /** scenes whose GPU resources are ready (their `.gl-fallback` is hidden via html[data-gl-*]) */
  ready: Set<SceneId>;
  /** request one render on the next loop tick (visibility / readiness / resource changes) */
  dirty: boolean;
  /** per-scene numbers for ?debug (window.__wsDirector) */
  debug: Record<string, unknown>;
};

export const director: Director = {
  scene: null,
  visible: new Set(),
  chapter: "q",
  progress: 0,
  velocity: 0,
  scroll: 0,
  vw: 1280,
  vh: 800,
  continuous: new Set(),
  rendered: 0,
  ready: new Set(),
  dirty: true,
  debug: {},
};

/**
 * Visibility windows: a scene may register a predicate on the frame state (scroll-based, so the
 * window can start before / end after its chapter for hand-offs). Scenes without one are visible
 * exactly while the active chapter maps to them.
 */
type Window = (s: FrameState) => boolean;
const windows = new Map<SceneId, Window>();
export function registerWindow(id: SceneId, fn: Window) {
  windows.set(id, fn);
}

const listeners = new Set<() => void>();
const notify = () => {
  director.dirty = true;
  listeners.forEach((l) => l());
};
const ids: SceneId[] = ["hall", "layers", "index", "showcase", "generator"];

/** Called from the shared scroll loop every frame (numbers only). */
export function updateDirector(s: FrameState, enabled: boolean) {
  director.chapter = s.activeId;
  director.progress = s.progress(s.activeId);
  director.velocity = s.velocity;
  director.scroll = s.scroll;
  director.vw = s.vw;
  director.vh = s.vh;

  let changed = false;
  for (const id of ids) {
    const w = windows.get(id);
    const on = enabled && (w ? w(s) : chapterById[s.activeId].scene === id);
    if (on !== director.visible.has(id)) {
      changed = true;
      if (on) director.visible.add(id);
      else director.visible.delete(id);
    }
  }
  const own = chapterById[s.activeId].scene;
  const primary = own && director.visible.has(own) ? own : (director.visible.values().next().value ?? null);
  if (changed || primary !== director.scene) {
    director.scene = primary;
    notify();
  }
}

export function directorWantsFrame() {
  for (const id of director.visible) if (director.continuous.has(id)) return true;
  return false;
}

/** React-level "is my scene on stage" (re-renders only on visibility change). */
export function useSceneActive(id: SceneId) {
  const [active, setActive] = useState(director.visible.has(id));
  useEffect(() => {
    const fn = () => setActive(director.visible.has(id));
    listeners.add(fn);
    fn();
    return () => {
      listeners.delete(fn);
    };
  }, [id]);
  return active;
}

/** Subscribe to scene changes outside React (Stage visibility). */
export function onSceneChange(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Per-frame hook for scenes: runs only while `id` is visible. Scenes stay mounted; hidden ones
 * return immediately. The optional root ref is kept in sync with visibility.
 */
export function useSceneFrame(
  id: SceneId,
  cb: (p: number, state: RootState, delta: number) => void,
  priority = 0,
  root?: RefObject<Object3D | null>,
) {
  useFrame((state, delta) => {
    const on = director.visible.has(id);
    if (root?.current && root.current.visible !== on) root.current.visible = on;
    if (!on) return;
    cb(director.progress, state, delta);
  }, priority);
}

export function setContinuous(id: SceneId, on: boolean) {
  if (on === director.continuous.has(id)) return;
  if (on) director.continuous.add(id);
  else director.continuous.delete(id);
  director.dirty = true;
}

export function setReady(id: SceneId, on: boolean) {
  if (on === director.ready.has(id)) return;
  if (on) director.ready.add(id);
  else director.ready.delete(id);
  document.documentElement.dataset[`gl${id[0].toUpperCase()}${id.slice(1)}`] = on ? "1" : "0";
  notify();
}
