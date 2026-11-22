"use client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import type { SceneProps } from "../registry";
import { director, registerWindow, setContinuous, setReady, useSceneFrame } from "../director";
import { showcaseFrag, showcaseVert } from "../shaders/showcase.glsl";
import { worldPerPx } from "../camera";
import { scrollEngine } from "@/lib/scroll";
import { asset } from "@/lib/asset";
import { easeInOutCubic, offsetWithin, range, stageTop, type Box } from "@/lib/layout";
import { showcase } from "@/content/portfolio";

const N = showcase.length;
const MIN_VW = 1024;
const BEND_TAU = 0.18;

let domHeavy = false;
const enabled = (vw: number) => !scrollEngine.reducedMotion && vw >= MIN_VW && !domHeavy;

registerWindow("showcase", (s) => {
  if (!enabled(s.vw)) return false;
  const st = scrollEngine.section("scroll-through");
  if (!st) return false;
  return s.scroll > st.top - s.vh && s.scroll < st.top + st.S + s.vh * 0.6;
});

type Entry = { top: THREE.Texture; bottom: THREE.Texture; split: number; aspect: number };

/** Uploads a capture, cutting it in two when it is taller than MAX_TEXTURE_SIZE (e.g. saladdays 480×5052 on 4096-px GPUs). */
function toEntry(img: HTMLImageElement, maxTex: number, aniso: number): Entry {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const make = (src: TexImageSource) => {
    const t = new THREE.Texture(src);
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.anisotropy = aniso;
    t.needsUpdate = true;
    return t;
  };
  if (h <= maxTex) {
    const t = make(img);
    return { top: t, bottom: t, split: 1, aspect: h / w };
  }
  const half = Math.ceil(h / 2);
  const cut = (y: number, hh: number) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = hh;
    c.getContext("2d")!.drawImage(img, 0, y, w, hh, 0, 0, w, hh);
    return c;
  };
  return { top: make(cut(0, half)), bottom: make(cut(half, h - half)), split: half / h, aspect: h / w };
}

const disposeEntry = (e: Entry) => {
  e.top.dispose();
  if (e.bottom !== e.top) e.bottom.dispose();
};

type Layout = { v: number; frame: Box | null };

/**
 * Showcase (C05). One 48-segment plane over `.c05-frame`: the capture scrolls inside the window,
 * the plane curls back with Lenis velocity, and the next work slides over the current one with
 * parallax. Only current + next stay on the GPU.
 */
export function Showcase({ id, tier }: SceneProps) {
  domHeavy = tier.domHeavyChapters;
  const mesh = useRef<THREE.Mesh>(null);
  const gl = useThree((s) => s.gl);
  const cache = useRef(new Map<number, Entry | "loading">());
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1, 1, 48), []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: showcaseVert,
        fragmentShader: showcaseFrag,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          uMapA: { value: null },
          uMapA2: { value: null },
          uMapB: { value: null },
          uMapB2: { value: null },
          uSplitA: { value: 1 },
          uSplitB: { value: 1 },
          uOffsetA: { value: 0 },
          uWinA: { value: 0.3 },
          uWinB: { value: 0.3 },
          uTransition: { value: 0 },
          uOpacity: { value: 1 },
          uBend: { value: 0 },
          uDepth: { value: 1 },
          uSize: { value: new THREE.Vector2(1, 1) },
        },
      }),
    [],
  );
  useEffect(() => {
    const c = cache.current;
    return () => {
      geometry.dispose();
      material.dispose();
      c.forEach((e) => e !== "loading" && disposeEntry(e));
      c.clear();
      setReady(id, false);
      setContinuous(id, false);
    };
  }, [geometry, material, id]);

  const want = (k: number) => {
    const c = cache.current;
    if (k < 0 || k >= N || c.has(k)) return;
    c.set(k, "loading");
    const img = new Image();
    img.decoding = "async";
    img.src = asset(`media/img/showcase/${showcase[k].file}.webp`);
    img
      .decode()
      .then(() => {
        if (cache.current.get(k) !== "loading") return;
        const maxTex = gl.capabilities.maxTextureSize;
        cache.current.set(k, toEntry(img, maxTex, Math.min(4, gl.capabilities.getMaxAnisotropy())));
        director.dirty = true;
      })
      .catch(() => cache.current.delete(k));
  };
  const keepOnly = (keep: number[]) => {
    cache.current.forEach((e, k) => {
      if (keep.includes(k)) return;
      if (e !== "loading") disposeEntry(e);
      cache.current.delete(k);
    });
  };

  const layout = useRef<Layout>({ v: -1, frame: null });
  const bend = useRef(0);
  const lastK = useRef(-1);

  useSceneFrame(
    id,
    (_p, state, delta) => {
      const m = mesh.current;
      if (!m) return;
      const vw = state.size.width;
      if (!enabled(vw)) {
        m.visible = false;
        setReady(id, false);
        return;
      }
      if (layout.current.v !== scrollEngine.layoutVersion) {
        const stage = document.querySelector<HTMLElement>("#scroll-through > .pin-stage");
        const frame = document.querySelector<HTMLElement>("#scroll-through .c05-frame");
        layout.current = { v: scrollEngine.layoutVersion, frame: frame && stage ? offsetWithin(frame, stage) : null };
      }
      const F = layout.current.frame;
      const st = scrollEngine.section("scroll-through");
      if (!F || !st) return;

      const vh = state.size.height;
      const wpp = worldPerPx(vh);
      const scroll = director.scroll;
      const p = scrollEngine.progress("scroll-through");
      const x = Math.min(p * N, N - 1e-4);
      const k = Math.floor(x);
      const q = x - k;
      if (k !== lastK.current) {
        lastK.current = k;
        keepOnly([k, k + 1]);
      }
      want(k);
      want(k + 1);

      const A = cache.current.get(k);
      const last = k === N - 1;
      const B = last ? null : cache.current.get(k + 1);
      const okA = !!A && A !== "loading";
      const okB = last || (!!B && B !== "loading");
      const transition = range(q, 0.76, 1);
      const ready = okA && (okB || transition === 0);
      setReady(id, ready);
      m.visible = ready;
      if (!ready || !okA) return;

      const winOf = (e: Entry) => Math.min(1, F.h / F.w / e.aspect);
      const u = material.uniforms;
      u.uMapA.value = A.top;
      u.uMapA2.value = A.bottom;
      u.uSplitA.value = A.split;
      const wa = winOf(A);
      u.uWinA.value = wa;
      u.uOffsetA.value = Math.min(1, q / 0.8) * (1 - wa);
      if (B && B !== "loading") {
        u.uMapB.value = B.top;
        u.uMapB2.value = B.bottom;
        u.uSplitB.value = B.split;
        u.uWinB.value = winOf(B);
      } else {
        u.uMapB.value = A.top;
        u.uMapB2.value = A.bottom;
      }
      u.uTransition.value = last ? 0 : easeInOutCubic(transition);
      // C04's picked tile travels in with this same capture and lands on this rect as C05 pins,
      // so the take-over is a straight swap (no cross-fade)
      u.uOpacity.value = scroll > st.top - 0.5 ? 1 : 0;

      // velocity bend with exponential decay (τ 180ms)
      const target = Math.max(-0.35, Math.min(0.35, director.velocity * 0.012));
      bend.current += (target - bend.current) * (1 - Math.exp(-delta / BEND_TAU));
      if (Math.abs(bend.current) < 0.0005) bend.current = 0;
      u.uBend.value = bend.current;

      const top = Math.min(0, stageTop(st, scroll, true));
      const cx = F.x + F.w / 2;
      const cy = F.y + F.h / 2 + top;
      m.position.set((cx - state.size.width / 2) * wpp, (vh / 2 - cy) * wpp, 0);
      m.scale.set(F.w * wpp, F.h * wpp, 1);
      u.uDepth.value = F.h * wpp;
      (u.uSize.value as THREE.Vector2).set(F.w, F.h);

      setContinuous(id, bend.current !== 0);
      if (director.debug.on) {
        director.debug.showcase = { k, q: +q.toFixed(3), bend: +bend.current.toFixed(3), gpu: cache.current.size };
      }
    },
    0,
    mesh,
  );

  return <mesh ref={mesh} geometry={geometry} material={material} visible={false} frustumCulled={false} renderOrder={5} />;
}
