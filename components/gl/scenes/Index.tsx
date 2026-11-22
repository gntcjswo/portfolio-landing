"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { SceneProps } from "../registry";
import { director, registerWindow, setContinuous, setReady, useSceneFrame } from "../director";
import { indexFrag, indexVert, lensFrag, lensVert } from "../shaders/index.glsl";
import { CAM_Z, worldPerPx } from "../camera";
import { scrollEngine } from "@/lib/scroll";
import { indexBus } from "@/lib/index-bus";
import { asset, pfVideo } from "@/lib/asset";
import { videoPool } from "@/lib/video-pool";
import { sourceSize } from "@/lib/cover";
import { easeInOutCubic, offsetWithin, range, smooth, stageTop, type Box } from "@/lib/layout";
import { showcase, works } from "@/content/portfolio";

const COLS = 13;
const N = 169;
const CENTER_COL = 6;
const TWEEN_MS = 700;
const HOVER_VIDEO_MS = 250;
const LEAVE_MS = 300;
const LENS_R = 140;
const MIN_VW = 1024;

let domHeavy = false;
const enabled = (vw: number) => !scrollEngine.reducedMotion && vw >= MIN_VW && !domHeavy;

registerWindow("index", (s) => {
  if (!enabled(s.vw)) return false;
  const is = scrollEngine.section("index");
  if (!is) return false;
  const st = scrollEngine.section("scroll-through");
  const end = st ? st.top + s.vh * 0.05 : is.top + is.height;
  return s.scroll > is.top - s.vh && s.scroll < end;
});

/** C04 p: the wall stops, flattens and picks pf-000 (SELECT), which then flies into C05's frame (MOVE). */
const SELECT = [0.7, 0.84] as const;
/** growth starts this far into C04's pinned scrub and ends when C05 pins */
const MOVE_FROM = 0.96;

/**
 * pf-001 sits on the centre column of the first row (where C03's plane lands); pf-000 — C05's first
 * capture — sits on the centre column of the row that is mid-wall when the pan stops, so the pick is
 * visible. `sel` comes from the layout (stable while scrolling).
 */
const slotOf = (id: number, sel: number) =>
  id === 1 ? CENTER_COL : id === CENTER_COL ? 1 : id === 0 ? sel : id === sel ? 0 : id;
const cats = works.map((w) => w.category);

const easeInOutExpo = (t: number) =>
  t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;

type Layout = { v: number; anchor: Box | null; wall: Box | null; frame: Box | null };
/** x, y in stage px (centre), s = size factor, z world, dim 0..1, pan 1 = follows the wall pan */
type T = { x: number; y: number; s: number; z: number; dim: number; pan: number };

function measure(): Layout {
  const stage = document.querySelector<HTMLElement>("#index > .pin-stage");
  const anchor = document.querySelector<HTMLElement>("#index .c04-anchor");
  const wall = document.querySelector<HTMLElement>("#index .c04-wall");
  const stStage = document.querySelector<HTMLElement>("#scroll-through > .pin-stage");
  const frame = document.querySelector<HTMLElement>("#scroll-through .c05-frame");
  return {
    v: scrollEngine.layoutVersion,
    anchor: anchor && stage && anchor.offsetWidth ? offsetWithin(anchor, stage) : null,
    wall: wall && stage ? offsetWithin(wall, stage) : null,
    frame: frame && stStage ? offsetWithin(frame, stStage) : null,
  };
}

/**
 * Index (C04). One InstancedMesh of 169 atlas tiles on a wall that pans with scroll and leans back
 * slightly; a filter tweens matching tiles into a centred cluster (others dim and recede); a lens
 * follows the pointer; resting on a tile for 250ms plays its clip on a lens plane. Hand-offs:
 * starts from `.c04-anchor` (C03 lands there) and grows pf-000 into C05's first capture frame.
 */
export function Index({ id, tier }: SceneProps) {
  domHeavy = tier.domHeavyChapters;
  const root = useRef<THREE.Group>(null);
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const lens = useRef<THREE.Mesh>(null);
  const [atlas, setAtlas] = useState<THREE.Texture | null>(null);

  // atlas loads once the chapter is within ~2 screens
  const [wanted, setWanted] = useState(false);
  useEffect(() => {
    if (wanted) return;
    return scrollEngine.onFrame((s) => {
      const is = scrollEngine.section("index");
      if (is && enabled(s.vw) && s.scroll > is.top - s.vh * 3) setWanted(true);
    });
  }, [wanted]);
  useEffect(() => {
    if (!wanted) return;
    let dead = false;
    let tex: THREE.Texture | null = null;
    new THREE.TextureLoader().loadAsync(asset("media/atlas/pf-atlas-192.jpg")).then(
      (t) => {
        if (dead) return t.dispose();
        t.colorSpace = THREE.SRGBColorSpace;
        t.generateMipmaps = false;
        t.minFilter = THREE.LinearFilter;
        tex = t;
        setAtlas(t);
        director.dirty = true;
      },
      () => {},
    );
    return () => {
      dead = true;
      tex?.dispose();
    };
  }, [wanted]);

  // pf-000's own capture (C05's first frame), shown on its tile from the wall onwards
  const [pickTex, setPickTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!wanted) return;
    let dead = false;
    let tex: THREE.Texture | null = null;
    new THREE.TextureLoader().loadAsync(asset(`media/img/showcase/${showcase[0].file}.webp`)).then(
      (t) => {
        if (dead) return t.dispose();
        t.colorSpace = THREE.SRGBColorSpace;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.anisotropy = 4;
        // aspect from the real file (portfolio.ts w/h is only the initial value)
        const { w, h } = sourceSize(t.image);
        if (w && h) material.uniforms.uPickAspect.value = w / h;
        tex = t;
        setPickTex(t);
        director.dirty = true;
      },
      () => {},
    );
    return () => {
      dead = true;
      tex?.dispose();
    };
  }, [wanted]);

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    const cell = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      cell[i * 2] = i % COLS;
      cell[i * 2 + 1] = Math.floor(i / COLS);
    }
    g.setAttribute("aCell", new THREE.InstancedBufferAttribute(cell, 2));
    g.setAttribute("aState", new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aSize", new THREE.InstancedBufferAttribute(new Float32Array(N * 2), 2).setUsage(THREE.DynamicDrawUsage));
    return g;
  }, []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: indexVert,
        fragmentShader: indexFrag,
        transparent: true,
        // instances draw in id order: depth keeps the filtered cluster in front of receded tiles
        depthWrite: true,
        depthTest: true,
        uniforms: {
          uAtlas: { value: null },
          uGrid: { value: new THREE.Vector2(COLS, COLS) },
          uLens: { value: new THREE.Vector3(-1e4, -1e4, LENS_R) },
          uLensOn: { value: 0 },
          uDpr: { value: 1 },
          uClipTop: { value: 1e5 },
          uPaper: { value: new THREE.Color("#e8e5db") },
          uInk: { value: new THREE.Color("#111110") },
          uSignal: { value: new THREE.Color("#fa7f03") },
          uPick: { value: null },
          uPickOn: { value: 0 },
          uPickAspect: { value: showcase[0].w / showcase[0].h },
          uPickRad: { value: 2 },
        },
      }),
    [],
  );
  const lensGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const lensMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: lensVert,
        fragmentShader: lensFrag,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          uVideo: { value: null },
          uOpacity: { value: 0 },
          uSize: { value: new THREE.Vector2(1, 1) },
          uVideoAspect: { value: 16 / 9 },
        },
      }),
    [],
  );
  const video = useMemo(() => {
    if (typeof document === "undefined") return null;
    const v = document.createElement("video");
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = "none";
    return v;
  }, []);
  // one VideoTexture for every hovered clip: VideoTexture re-uploads with texImage2D each frame (three
  // r0.187 skips texStorage2D for video), so a src swap of another size is safe; the aspect feeds the
  // lens shader's cover crop
  useEffect(() => {
    if (!video) return;
    const onMeta = () => {
      if (video.videoWidth && video.videoHeight) {
        lensMat.uniforms.uVideoAspect.value = video.videoWidth / video.videoHeight;
        director.dirty = true;
      }
    };
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("resize", onMeta);
    return () => {
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("resize", onMeta);
    };
  }, [video, lensMat]);
  const videoTex = useMemo(() => {
    if (!video) return null;
    const t = new THREE.VideoTexture(video);
    t.colorSpace = THREE.SRGBColorSpace;
    t.generateMipmaps = false;
    return t;
  }, [video]);
  useEffect(() => {
    material.uniforms.uAtlas.value = atlas;
    material.uniforms.uPick.value = pickTex;
    material.uniforms.uPickOn.value = pickTex ? 1 : 0;
    lensMat.uniforms.uVideo.value = videoTex;
  }, [material, lensMat, atlas, pickTex, videoTex]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      lensGeo.dispose();
      lensMat.dispose();
      videoTex?.dispose();
      if (video) videoPool.release(video);
      setReady(id, false);
      setContinuous(id, false);
    },
    [geometry, material, lensGeo, lensMat, video, videoTex, id],
  );

  useEffect(() => {
    indexBus.wake = () => {
      director.dirty = true;
    };
    return () => {
      indexBus.wake = () => {};
    };
  }, []);

  const layout = useRef<Layout>({ v: -1, anchor: null, wall: null, frame: null });
  const tw = useRef({
    version: -1,
    t0: -1e9,
    from: Array.from({ length: N }, (): T => ({ x: 0, y: 0, s: 1, z: 0, dim: 0, pan: 1 })),
    to: Array.from({ length: N }, (): T => ({ x: 0, y: 0, s: 1, z: 0, dim: 0, pan: 1 })),
    cur: Array.from({ length: N }, (): T => ({ x: 0, y: 0, s: 1, z: 0, dim: 0, pan: 0 })),
  });
  const hov = useRef({ id: -1, since: 0, lost: 0, video: -1, lensT: 0, lensOn: 0, rect: [0, 0, 0, 0] });
  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(), v: new THREE.Vector3() }),
    [],
  );
  const rects = useRef(new Float32Array(N * 4));
  const pickRect = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const pickLabel = useRef({ el: null as HTMLElement | null, key: "" });

  useSceneFrame(
    id,
    (_p, state) => {
      const G = group.current;
      const M = mesh.current;
      const ok = !!atlas && enabled(state.size.width);
      setReady(id, ok);
      if (root.current) root.current.visible = ok;
      if (!G || !M || !ok) return;
      if (layout.current.v !== scrollEngine.layoutVersion) layout.current = measure();
      const L = layout.current;
      const is = scrollEngine.section("index");
      const st = scrollEngine.section("scroll-through");
      if (!L.anchor || !L.wall || !is) return;

      const now = performance.now();
      const vw = state.size.width;
      const vh = state.size.height;
      const dpr = state.viewport.dpr;
      const wpp = worldPerPx(vh);
      const scroll = director.scroll;
      const p = scrollEngine.progress("index");
      const top = stageTop(is, scroll, true);

      const A = L.anchor;
      const W = L.wall;
      const w = A.w;
      const h = A.h;
      const gap = Math.round(w * 0.09);
      const gridH = Math.ceil(N / COLS) * (h + gap) - gap;
      const panMax = Math.max(0, gridH - (W.y + W.h - A.y) + 48);
      const pan = panMax * smooth(range(p, 0.16, 0.64));
      const selRow = Math.max(1, Math.min(12, Math.round((W.y + W.h / 2 + panMax - A.y - h / 2) / (h + gap))));
      const sel = selRow * COLS + CENTER_COL;
      const gx = (slot: number) => A.x + w / 2 + ((slot % COLS) - CENTER_COL) * (w + gap);
      const gy = (slot: number) => A.y + h / 2 + Math.floor(slot / COLS) * (h + gap);

      // ── filter tween (CPU from/to, 169 tiles) ──
      const T = tw.current;
      const released = p > SELECT[0];
      const filter = released ? null : indexBus.filter;
      const version = released ? -2 : indexBus.filterVersion * 1000 + sel;
      if (version !== T.version) {
        const first = T.version === -1;
        T.version = version;
        T.t0 = first ? -1e9 : now;
        const matched: number[] = [];
        if (filter) for (let i = 0; i < N; i++) if (cats[i].includes(filter)) matched.push(i);
        const n = matched.length;
        const cols = Math.max(1, Math.ceil(Math.sqrt(n * 1.6)));
        const rows = Math.ceil(n / cols);
        const fit = Math.min(1.15, (W.w * 0.9) / (cols * (w + gap)), ((W.h - 24) * 0.92) / (rows * (h + gap)));
        const cx = W.x + W.w / 2;
        const cy = W.y + Math.min(W.h, vh - (W.y + top)) / 2;
        for (let i = 0; i < N; i++) {
          const f = T.from[i];
          const c = T.cur[i];
          // freeze the current visual state (pan baked in) as the new start
          f.x = c.x; f.y = c.y; f.s = c.s; f.z = c.z; f.dim = c.dim; f.pan = 0;
          const t = T.to[i];
          const j = filter ? matched.indexOf(i) : -1;
          if (j >= 0) {
            const r = Math.floor(j / cols);
            const k = j % cols;
            const inRow = r === rows - 1 ? n - r * cols : cols;
            t.x = cx + (k - (inRow - 1) / 2) * (w + gap) * fit;
            t.y = cy + (r - (rows - 1) / 2) * (h + gap) * fit;
            t.s = fit; t.z = 0.25; t.dim = 0; t.pan = 0;
          } else {
            const sl = slotOf(i, sel);
            t.x = gx(sl); t.y = gy(sl); t.s = 1; t.z = filter ? -0.4 : 0; t.dim = filter ? 1 : 0; t.pan = 1;
          }
        }
      }
      const te = easeInOutExpo((now - T.t0) / TWEEN_MS);
      const tweening = te < 1;

      // ── hand-off into C05: pick pf-000 while C04 is pinned, then grow it only during the one-screen
      // travel, toward C05's frame as it rises — it is full size exactly when C05 pins, where
      // Showcase (same capture, same rect) takes over ──
      const pick = smooth(range(p, SELECT[0], SELECT[1]));
      const hand = st ? easeInOutCubic(range(scroll, is.top + is.S * MOVE_FROM, st.top)) : 0;
      const others = 1 - range(p, SELECT[1] - 0.02, SELECT[1] + 0.08);
      const F = L.frame;
      const stTop = st ? stageTop(st, scroll, true) : 0;
      const arrived = st ? scroll > st.top + 0.5 : false;
      material.uniforms.uPickRad.value = 2 + 6 * hand;

      const tilt = -0.18 * smooth(range(p, 0.14, 0.26)) * (1 - smooth(range(p, SELECT[0] - 0.06, SELECT[0])));
      const pivotX = W.x + W.w / 2;
      const pivotY = W.y + W.h / 2 + top;
      G.position.set((pivotX - vw / 2) * wpp, (vh / 2 - pivotY) * wpp, 0);
      G.rotation.set(tilt, 0, 0);
      G.updateMatrixWorld(true);

      const state4 = geometry.getAttribute("aState") as THREE.InstancedBufferAttribute;
      const size2 = geometry.getAttribute("aSize") as THREE.InstancedBufferAttribute;
      const H = hov.current;
      const R = rects.current;
      const P0 = pickRect.current;
      for (let i = 0; i < N; i++) {
        const f = T.from[i];
        const t = T.to[i];
        const c = T.cur[i];
        const fy = f.y - f.pan * pan;
        const ty = t.y - t.pan * pan;
        c.x = f.x + (t.x - f.x) * te;
        c.y = fy + (ty - fy) * te;
        c.s = f.s + (t.s - f.s) * te;
        c.z = f.z + (t.z - f.z) * te;
        c.dim = f.dim + (t.dim - f.dim) * te;

        const sl = slotOf(i, sel);
        const delay = (Math.hypot((sl % COLS) - CENTER_COL, Math.floor(sl / COLS)) / Math.hypot(CENTER_COL, 12)) * 0.12;
        // pf-001 is still C03's flying plane until C04's stage has fully arrived
        const appear = i === 1 ? (scroll >= is.top - 1 ? 1 : 0) : smooth(range(p, delay, delay + 0.06));
        let alpha = appear;
        let x = c.x;
        let y = c.y + top;
        let sw = w * c.s * (0.7 + 0.3 * appear);
        let sh = h * c.s * (0.7 + 0.3 * appear);
        let z = c.z - 0.3 * (1 - appear);
        let picked = 0;
        if (i !== 0) {
          c.dim = Math.max(c.dim, 0.9 * pick);
          z -= 0.25 * pick;
          alpha *= others;
        } else {
          // the ring un-draws on the way; a tiny positive value keeps the wall clip bypassed
          picked = pick > 0 ? Math.max(0.002, pick * (1 - range(hand, 0.55, 1))) : 0;
          const lift = 1 + 0.12 * pick * (1 - hand);
          sw *= lift;
          sh *= lift;
          z += 0.2 * pick * (1 - hand);
          if (F && hand > 0) {
            x += (F.x + F.w / 2 - x) * hand;
            y += (F.y + F.h / 2 + stTop - y) * hand;
            sw += (F.w - sw) * hand;
            sh += (F.h - sh) * hand;
          }
          if (arrived) alpha = 0;
          // on-screen rect: G is untilted by now, so only the perspective lift (z) scales it
          const k = CAM_Z / (CAM_Z - z);
          P0.x = pivotX + (x - pivotX) * k;
          P0.y = pivotY + (y - pivotY) * k;
          P0.w = sw * k;
          P0.h = sh * k;
        }
        const hover = i === H.id ? 1 : 0;
        if (hover) z += 0.08;

        tmp.p.set((x - pivotX) * wpp, (pivotY - y) * wpp, z);
        tmp.s.set(sw * wpp, sh * wpp, 1);
        tmp.m.compose(tmp.p, tmp.q, tmp.s);
        M.setMatrixAt(i, tmp.m);
        state4.setXYZW(i, c.dim, alpha, hover, picked);
        size2.setXY(i, sw, sh);

        // screen rect for hit-testing (projected centre ± projected half size)
        if (alpha > 0.5 && c.dim < 0.5) {
          tmp.v.copy(tmp.p).applyMatrix4(G.matrixWorld).project(state.camera);
          const sx = ((tmp.v.x + 1) / 2) * vw;
          const sy = ((1 - tmp.v.y) / 2) * vh;
          const k = CAM_Z / (CAM_Z - z);
          R[i * 4] = sx;
          R[i * 4 + 1] = sy;
          R[i * 4 + 2] = (sw * k) / 2;
          R[i * 4 + 3] = (sh * k) / 2;
        } else {
          R[i * 4 + 2] = 0;
        }
      }
      M.instanceMatrix.needsUpdate = true;
      state4.needsUpdate = true;
      size2.needsUpdate = true;
      M.count = N;

      // DOM caption that rides under the picked tile (what is moving, and where to)
      const PL = pickLabel.current;
      if (!PL.el) PL.el = document.querySelector<HTMLElement>("#index .c04-pick");
      if (PL.el) {
        const o = pick * (1 - range(hand, 0, 0.35));
        const key = o < 0.002 ? "0" : `${o.toFixed(2)}|${P0.x.toFixed(0)}|${(P0.y + P0.h / 2).toFixed(0)}|${(P0.w / 2).toFixed(0)}`;
        if (key !== PL.key) {
          PL.key = key;
          PL.el.style.opacity = o < 0.002 ? "0" : o.toFixed(2);
          if (o >= 0.002) PL.el.style.transform = `translate3d(${(P0.x - P0.w / 2).toFixed(1)}px, ${(P0.y + P0.h / 2 + 12).toFixed(1)}px, 0)`;
        }
      }

      // ── pointer: hover, lens, hover video ──
      const P = indexBus.pointer;
      const interactive = P.inside && p > 0.12 && p < SELECT[0] && !document.querySelector("dialog[open]");
      let hit = -1;
      if (interactive) {
        for (let i = 0; i < N; i++) {
          const hw = R[i * 4 + 2];
          if (hw && Math.abs(P.x - R[i * 4]) <= hw && Math.abs(P.y - R[i * 4 + 1]) <= R[i * 4 + 3]) {
            hit = i;
            break;
          }
        }
      }
      if (hit !== H.id) {
        if (hit >= 0) {
          H.id = hit;
          H.since = now;
        } else if (!H.lost) {
          H.lost = now;
        }
        if (hit >= 0) H.lost = 0;
      }
      if (H.id >= 0 && hit < 0 && H.lost && now - H.lost > LEAVE_MS) {
        H.id = -1;
        H.lost = 0;
      }
      indexBus.setHover(hit);

      const wantVideo = H.id >= 0 && hit === H.id && now - H.since > HOVER_VIDEO_MS && tier.tier !== "low";
      if (video) {
        if (wantVideo && H.video !== H.id) {
          H.video = H.id;
          videoPool.request(video, pfVideo(H.id), "play", 0);
        } else if (!wantVideo && H.video >= 0 && (H.id < 0 || H.id !== H.video)) {
          H.video = -1;
          videoPool.release(video);
        }
      }
      const showLens = H.video >= 0 && !!video && video.readyState >= 2;
      H.lensT += ((showLens ? 1 : 0) - H.lensT) * 0.2;
      const Lm = lens.current;
      if (Lm) {
        Lm.visible = H.lensT > 0.01 && H.video >= 0;
        if (Lm.visible) {
          const i = H.video;
          const sc = 1 + 0.6 * H.lensT;
          const rw = R[i * 4 + 2] * 2 || w;
          const rh = R[i * 4 + 3] * 2 || h;
          Lm.position.set((R[i * 4] - vw / 2) * wpp, (vh / 2 - R[i * 4 + 1]) * wpp, 0.3);
          Lm.scale.set(rw * sc * wpp, rh * sc * wpp, 1);
          lensMat.uniforms.uOpacity.value = H.lensT;
          (lensMat.uniforms.uSize.value as THREE.Vector2).set(rw * sc, rh * sc);
        }
      }

      H.lensOn += ((interactive ? 1 : 0) - H.lensOn) * 0.15;
      const u = material.uniforms;
      (u.uLens.value as THREE.Vector3).set(P.x * dpr, (vh - P.y) * dpr, LENS_R * dpr);
      u.uLensOn.value = H.lensOn < 0.002 ? 0 : H.lensOn;
      u.uDpr.value = dpr;
      u.uClipTop.value = (vh - (W.y + top)) * dpr;

      setContinuous(id, tweening || interactive || H.lensOn > 0.002 || H.lensT > 0.01 || H.video >= 0);
      if (director.debug.on) {
        director.debug.index = { p: +p.toFixed(3), pan: Math.round(pan), hover: H.id, video: H.video, tween: +te.toFixed(2) };
      }
    },
    0,
    root,
  );

  return (
    <group ref={root} visible={false}>
      <group ref={group}>
        <instancedMesh ref={mesh} args={[geometry, material, N]} frustumCulled={false} renderOrder={4} />
      </group>
      <mesh ref={lens} geometry={lensGeo} material={lensMat} visible={false} frustumCulled={false} renderOrder={6} />
    </group>
  );
}
