"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { SceneProps } from "../registry";
import { director, registerWindow, setContinuous, setReady, useSceneFrame } from "../director";
import { basicVert, dustFrag, dustVert, haloFrag, hallFrag, hallVert, portalFrag, shellFrag, shellVert } from "../shaders/hall.glsl";
import { CAM_Z } from "../camera";
import { scrollEngine } from "@/lib/scroll";
import { asset } from "@/lib/asset";
import { coverRect } from "@/lib/cover";
import { boot } from "@/lib/boot";
import { mulberry32 } from "@/lib/random";
import { easeInOutCubic, range } from "@/lib/layout";

const COLS = 13;
const RINGS = 14;
const PER_RING = 12;
/** the closed room behind the entrance, where C01 starts (looking back at its wall) */
const BACK_RINGS = 7;
const BACK_Z = 18.8;
/** the back room is a wider, taller gallery; its front wall has the hall's opening cut into it */
const RHW = 6.4;
const RHH = 2.9;
const R_YS = [-1.95, -0.65, 0.65, 1.95];
/** back wall columns (2.6-wide cells) and back room ceiling/floor columns (1.3-wide cells) */
const R_XS = [-5.2, -2.6, 0, 2.6, 5.2];
const R_CX = [-5.85, -3.25, -0.65, 1.95, 4.55];
const R_PER_RING = R_YS.length * 2 + R_CX.length * 2;
const BACK_WALL = R_YS.length * R_XS.length;
const FRONT_WALL = R_YS.length * 2;
const N = RINGS * PER_RING + BACK_RINGS * R_PER_RING + BACK_WALL + FRONT_WALL;
/** C01 p: the camera turns from the closed back wall to the open hall, then travels it */
/** p 0 → TURN[0]: only backing away from the wall; the turn follows while the retreat eases out */
const TURN: [number, number] = [0.1, 0.32];
const TRAVEL: [number, number] = [0.26, 0.96];
/** how far the camera swings toward the -x wall at the middle of the turn */
const ORBIT = 4;
/** how much closer to the back wall the camera starts; it backs away by this much while turning */
const RETREAT = 6;
/** grid cell (every print sits centred in one): 2.6 along the print's width, 1.3 along its height */
const CW = 2.6;
const CH = 1.3;
const SP = 2.6; // ring spacing
const HW = 3.6; // half width
const HH = 2.1; // half height
const TW = 2.0; // print width (16:9)
const TH = TW * (9 / 16);
const Z0 = 2.4; // hall entrance, in front of the camera
const LEN = (RINGS - 1) * SP + 1.2;
const PORTAL_Z = -(LEN + 2.4);
/** camera → opening distance at rest, and at C01 p = 0.96 (just past covering a 35° FOV) */
const D0 = CAM_Z - Z0 - PORTAL_Z;
const D_STOP = 5;
const INTRO_MS = 2400;
const DUST = 680;

/** recorded site clips (media/video/hall/hall-*.mp4, 640×360), played on some prints (each twice, spread from the entrance to the far end) */
const VIDEOS = ["thomas", "mir9", "klb", "jotech", "roopi", "coasia", "dkm", "mobiis"];
/** ring → [slot in ring (0-5 walls: L/R at y -1.3, 0, 1.3; 6-11 ceiling/floor pairs), video] */
const VIDEO_TILES: [number, number, number][] = [
  [0, 2, 0], [1, 5, 1], [2, 8, 2], [2, 3, 3], [3, 4, 4], [4, 1, 5], [4, 6, 6], [5, 2, 7],
  [6, 3, 0], [7, 10, 1], [7, 0, 2], [8, 5, 3], [9, 2, 4], [10, 8, 5], [10, 1, 6], [11, 4, 7],
];
/** back room: [ring, slot (0-7 walls L/R per row from the bottom, 8-17 ceiling/floor pairs), video];
 * back wall [print (row-major from the bottom, 5 columns), video]; front wall [print (L rows, then R rows), video] */
const BACK_VIDEO_TILES: [number, number, number][] = [[0, 3, 4], [1, 4, 6], [2, 12, 0], [3, 1, 5], [4, 6, 7], [5, 2, 1], [6, 5, 3]];
const WALL_VIDEO_TILES: [number, number][] = [[6, 2], [8, 6], [12, 0], [17, 1]];
const FRONT_VIDEO_TILES: [number, number][] = [[2, 5], [5, 7]];
const VID_CW = 384;
const VID_CH = 216;
const VID_FRAME_MS = 33;

const PAPER = new THREE.Color("#f2f0e9");
const NIGHT = new THREE.Color("#0f0f0e");

registerWindow("hall", (s) => {
  const q = scrollEngine.section("q");
  if (!q) return false;
  return s.scroll < q.top + (scrollEngine.reducedMotion ? q.height : q.S + 1);
});

const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

function buildTiles() {
  const rnd = mulberry32(2026);
  const ids = Array.from({ length: 169 }, (_, i) => i);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3(TW, TH, 1);
  const mats: THREE.Matrix4[] = [];
  const cell = new Float32Array(N * 2);
  const shade = new Float32Array(N * 2);
  const vid = new Float32Array(N).fill(-1);
  const neon = new Float32Array(N).fill(-1);
  const backBase = RINGS * PER_RING;
  const wallBase = backBase + BACK_RINGS * R_PER_RING;
  const frontBase = wallBase + BACK_WALL;
  for (const [r, j, v] of VIDEO_TILES) vid[r * PER_RING + j] = v;
  for (const [r, j, v] of BACK_VIDEO_TILES) vid[backBase + r * R_PER_RING + j] = v;
  for (const [w, v] of WALL_VIDEO_TILES) vid[wallBase + w] = v;
  for (const [w, v] of FRONT_VIDEO_TILES) vid[frontBase + w] = v;
  let k = 0;
  const put = (x: number, y: number, z: number, rx: number, ry: number, rz: number, bright: number, surface: number) => {
    p.set(x, y, z);
    q.setFromEuler(e.set(rx, ry, rz));
    mats.push(m.compose(p, q, s).clone());
    const id = ids[k % ids.length];
    cell[k * 2] = id % COLS;
    cell[k * 2 + 1] = Math.floor(id / COLS);
    shade[k * 2] = bright;
    shade[k * 2 + 1] = surface;
    // neon run phase for roughly one print in five (not on the dim floor)
    if (surface !== 2 && rnd() < 0.22) neon[k] = rnd();
    k++;
  };
  // ceiling/floor prints lie lengthwise (their width along z), so every surface shares the same cells
  const ring = (z: number, hw: number, hh: number, ys: number[], xs: number[]) => {
    for (const y of ys) {
      put(-hw, y, z, 0, Math.PI / 2, 0, 1, 0);
      put(hw, y, z, 0, -Math.PI / 2, 0, 1, 0);
    }
    for (const x of xs) {
      put(x, hh, z, Math.PI / 2, 0, Math.PI / 2, 0.5, 1);
      put(x, -hh, z, -Math.PI / 2, 0, Math.PI / 2, 1, 2);
    }
  };
  const hallXs = [
    [-2.6, 0, 2.6],
    [-1.3, 1.3, 2.6],
    [-2.6, 0, 1.3],
    [-1.3, 1.3, -2.6],
  ];
  for (let r = 0; r < RINGS; r++) ring(-(r * SP + 1.2), HW, HH, [-1.3, 0, 1.3], hallXs[r % 4]);
  for (let r = 0; r < BACK_RINGS; r++) ring(r * SP + 1.4, RHW, RHH, R_YS, R_CX);
  // the closed back wall, facing down the hall
  for (const y of R_YS) for (const x of R_XS) put(x, y, BACK_Z, 0, Math.PI, 0, 1, 0);
  // the front wall either side of the opening, facing the back room
  for (const x of [-5.2, 5.2]) for (const y of R_YS) put(x, y, 0.02, 0, 0, 0, 1, 0);
  return { mats, cell, shade, vid, neon };
}

/** room panels (walls, ceiling, floor from the back wall to the opening + the back wall), one draw */
function buildShell() {
  const g = 0.06;
  const pos: number[] = [];
  const grid: number[] = [];
  const idx: number[] = [];
  const quad = (c: [number, number, number][], gr: [number, number][]) => {
    const o = pos.length / 3;
    c.forEach((v) => pos.push(...v));
    gr.forEach((v) => grid.push(...v));
    idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
  };
  // grid in cell units (lines at integers): rings are centred 1.3 past a z joint, so joints sit at
  // z = 0.1 + 2.6k; across a surface the joints are offset by `oc` so the print columns/rows are centred
  const gz = (z: number) => (z - 0.1) / CW;
  // walls, ceiling and floor of a box between z0 and z1
  const tube = (X: number, Y: number, z0: number, z1: number, oc: number) => {
    const gc = (v: number) => (v - oc) / CH;
    quad([[-X, -Y, z1], [-X, -Y, z0], [-X, Y, z0], [-X, Y, z1]], [[gz(z1), gc(-Y)], [gz(z0), gc(-Y)], [gz(z0), gc(Y)], [gz(z1), gc(Y)]]);
    quad([[X, -Y, z0], [X, -Y, z1], [X, Y, z1], [X, Y, z0]], [[gz(z0), gc(-Y)], [gz(z1), gc(-Y)], [gz(z1), gc(Y)], [gz(z0), gc(Y)]]);
    quad([[-X, Y, z0], [X, Y, z0], [X, Y, z1], [-X, Y, z1]], [[gc(-X), gz(z0)], [gc(X), gz(z0)], [gc(X), gz(z1)], [gc(-X), gz(z1)]]);
    quad([[-X, -Y, z1], [X, -Y, z1], [X, -Y, z0], [-X, -Y, z0]], [[gc(-X), gz(z1)], [gc(X), gz(z1)], [gc(X), gz(z0)], [gc(-X), gz(z0)]]);
  };
  // a wall rectangle at z (x0..x1, y0..y1); its prints are centred on x = 2.6k, y = ±0.65, ±1.95
  const gx = (x: number) => (x - CW / 2) / CW;
  const gy = (y: number) => y / CH;
  const wall = (z: number, x0: number, x1: number, y0: number, y1: number) =>
    quad([[x1, y0, z], [x0, y0, z], [x0, y1, z], [x1, y1, z]], [[gx(x1), gy(y0)], [gx(x0), gy(y0)], [gx(x0), gy(y1)], [gx(x1), gy(y1)]]);
  const X = HW + g;
  const Y = HH + g;
  const RX = RHW + g;
  const RY = RHH + g;
  tube(X, Y, PORTAL_Z, 0, CH / 2);
  tube(RX, RY, 0, BACK_Z + g, 0);
  wall(BACK_Z + g, -RX, RX, -RY, RY);
  // front wall of the back room, with the hall's opening cut out
  const zf = -g;
  wall(zf, -RX, -X, -RY, RY);
  wall(zf, X, RX, -RY, RY);
  wall(zf, -X, X, Y, RY);
  wall(zf, -X, X, -RY, -Y);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("aGrid", new THREE.Float32BufferAttribute(grid, 2));
  geo.setIndex(idx);
  return geo;
}

type VideoAtlas = {
  videos: HTMLVideoElement[];
  ready: number[];
  /** a frame of video i has been drawn into its cell (ready only ramps after that, so no empty cell shows) */
  painted: boolean[];
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  tex: THREE.CanvasTexture;
  drawn: number;
  playing: boolean;
};

/**
 * Texture-size rule (three r0.187): a non-video texture's GPU storage is allocated with texStorage2D at
 * its FIRST upload and later uploads go through texSubImage2D into that fixed size. So this canvas is
 * sized once here and never resized, `tex.image` is never reassigned, and every source (video of any
 * size / aspect) is cover-cropped by drawImage into its fixed 384×216 cell — it always fills the cell
 * edge to edge. If the atlas ever has to change size, dispose the texture and create a new one.
 */
function createVideoAtlas(): VideoAtlas {
  const canvas = document.createElement("canvas");
  canvas.width = VID_CW * 4;
  canvas.height = VID_CH * 2;
  const ctx = canvas.getContext("2d")!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 4;
  const videos = VIDEOS.map((n) => {
    const v = document.createElement("video");
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = "auto";
    v.setAttribute("aria-hidden", "true");
    v.src = asset(`media/video/hall/hall-${n}.mp4`);
    return v;
  });
  return { videos, ready: VIDEOS.map(() => 0), painted: VIDEOS.map(() => false), canvas, ctx, tex, drawn: 0, playing: false };
}

/** cover-crops each playing video into its 16:9 cell (always the full cell, whatever the video size) */
function drawVideoAtlas(A: VideoAtlas) {
  let any = false;
  A.videos.forEach((v, i) => {
    if (v.readyState < 2 || !v.videoWidth || !v.videoHeight) return;
    const r = coverRect(v.videoWidth, v.videoHeight, VID_CW / VID_CH);
    A.ctx.drawImage(v, r.sx, r.sy, r.sw, r.sh, (i % 4) * VID_CW, Math.floor(i / 4) * VID_CH, VID_CW, VID_CH);
    A.painted[i] = true;
    any = true;
  });
  if (any) A.tex.needsUpdate = true;
}

/**
 * Hall (C01 key visual). One InstancedMesh (168 prints from the portfolio atlas on both walls, the
 * ceiling and a glossy floor) + the paper opening at the far end + a halo + dust = 4 draws. The hall
 * is moved toward the fixed camera (a dolly) by C01's progress and turned around the camera by the
 * pointer; at p = 1 the opening covers the screen and C01's own background has already switched to
 * paper, so C02 arrives on the same paper.
 */
export function Hall({ id, tier }: SceneProps) {
  const root = useRef<THREE.Group>(null);
  const pivot = useRef<THREE.Group>(null);
  const hall = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const [atlas, setAtlas] = useState<THREE.Texture | null>(null);
  const reduced = tier.reducedMotion;

  useEffect(() => {
    let dead = false;
    let tex: THREE.Texture | null = null;
    new THREE.TextureLoader().loadAsync(asset("media/atlas/pf-atlas-192.jpg")).then(
      (t) => {
        boot.mark("atlas");
        if (dead) return t.dispose();
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        tex = t;
        setAtlas(t);
        director.dirty = true;
      },
      () => boot.mark("atlas"),
    );
    return () => {
      dead = true;
      tex?.dispose();
    };
  }, []);

  const tiles = useMemo(() => buildTiles(), []);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    g.setAttribute("aCell", new THREE.InstancedBufferAttribute(tiles.cell, 2));
    g.setAttribute("aShade", new THREE.InstancedBufferAttribute(tiles.shade, 2));
    g.setAttribute("aVid", new THREE.InstancedBufferAttribute(tiles.vid, 1));
    g.setAttribute("aNeon", new THREE.InstancedBufferAttribute(tiles.neon, 1));
    return g;
  }, [tiles]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: hallVert,
        fragmentShader: hallFrag,
        transparent: true,
        depthWrite: true,
        depthTest: true,
        uniforms: {
          uAtlas: { value: null },
          uGrid: { value: new THREE.Vector2(COLS, COLS) },
          uFog: { value: NIGHT.clone() },
          uLight: { value: PAPER.clone() },
          uFogNear: { value: 6 },
          uFogFar: { value: 30 },
          uOpacity: { value: 0 },
          uPortalZ: { value: PORTAL_Z },
          uVid: { value: null },
          uVidReadyA: { value: new THREE.Vector4() },
          uVidReadyB: { value: new THREE.Vector4() },
          uTime: { value: 0 },
          uNeon: { value: new THREE.Color("#ff5ca8") },
          uNeonAmt: { value: 1 },
        },
      }),
    [],
  );
  const shellGeo = useMemo(() => buildShell(), []);
  const shellMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: shellVert,
        fragmentShader: shellFrag,
        transparent: true,
        depthWrite: true,
        depthTest: true,
        side: THREE.DoubleSide,
        uniforms: {
          uFog: { value: NIGHT.clone() },
          uLight: { value: PAPER.clone() },
          uBase: { value: new THREE.Color("#141413") },
          uLine: { value: new THREE.Color("#3b3a36") },
          uFogNear: { value: 6 },
          uFogFar: { value: 30 },
          uOpacity: { value: 0 },
          uPortalZ: { value: PORTAL_Z },
        },
      }),
    [],
  );
  const plane = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const portalMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: basicVert,
        fragmentShader: portalFrag,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        uniforms: { uColor: { value: PAPER.clone() }, uOpacity: { value: 0 }, uGlow: { value: 1 } },
      }),
    [],
  );
  const haloMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: basicVert,
        fragmentShader: haloFrag,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: new THREE.Color("#fff3dc") }, uOpacity: { value: 0 } },
      }),
    [],
  );
  const dustGeo = useMemo(() => {
    const rnd = mulberry32(77);
    const pos = new Float32Array(DUST * 3);
    const seed = new Float32Array(DUST);
    for (let i = 0; i < DUST; i++) {
      pos.set([(rnd() * 2 - 1) * (HW - 0.3), (rnd() * 2 - 1) * (HH - 0.2), BACK_Z - 0.5 - rnd() * (LEN + BACK_Z - 0.5)], i * 3);
      seed[i] = rnd();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    return g;
  }, []);
  const dustMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: dustVert,
        fragmentShader: dustFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
          uLen: { value: LEN },
          uColor: { value: new THREE.Color("#ffe9c4") },
          uOpacity: { value: 0 },
        },
      }),
    [],
  );

  useEffect(() => {
    material.uniforms.uAtlas.value = atlas;
  }, [material, atlas]);
  useEffect(() => {
    const M = mesh.current;
    if (!M) return;
    tiles.mats.forEach((m, i) => M.setMatrixAt(i, m));
    M.instanceMatrix.needsUpdate = true;
  }, [tiles]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      shellGeo.dispose();
      shellMat.dispose();
      plane.dispose();
      portalMat.dispose();
      haloMat.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      setReady(id, false);
      setContinuous(id, false);
    },
    [geometry, material, shellGeo, shellMat, plane, portalMat, haloMat, dustGeo, dustMat, id],
  );

  // pointer → look direction (fine pointers only), smoothed in the frame loop
  const look = useRef({ tx: 0, ty: 0, x: 0, y: 0, moved: 0 });
  useEffect(() => {
    if (reduced) return;
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      look.current.tx = Math.max(-1, Math.min(1, (e.clientX / window.innerWidth) * 2 - 1));
      look.current.ty = Math.max(-1, Math.min(1, (e.clientY / window.innerHeight) * 2 - 1));
      look.current.moved = performance.now();
      director.dirty = true;
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [reduced]);

  const intro = useRef(0);

  // video prints: created after the boot overlay lifts, paused whenever the hall stops rendering
  const vids = useRef<VideoAtlas | null>(null);
  const lastFrame = useRef(0);
  const videosAllowed = !reduced && tier.tier !== "low" && tier.tier !== "none";
  useEffect(() => {
    if (!videosAllowed) return;
    const timer = window.setInterval(() => {
      const A = vids.current;
      if (A?.playing && performance.now() - lastFrame.current > 250) {
        A.playing = false;
        A.videos.forEach((v) => v.pause());
      }
    }, 300);
    return () => {
      window.clearInterval(timer);
      const A = vids.current;
      vids.current = null;
      if (!A) return;
      A.videos.forEach((v) => {
        v.pause();
        v.removeAttribute("src");
        v.load();
      });
      A.tex.dispose();
    };
  }, [videosAllowed]);

  useSceneFrame(
    id,
    (_p, state, delta) => {
      const ok = !!atlas;
      setReady(id, ok);
      const H = hall.current;
      const P = pivot.current;
      if (!ok || !H || !P) return;
      const now = performance.now();
      const p = reduced ? 0 : scrollEngine.progress("q");
      const t = state.clock.elapsedTime;

      // intro: the hall slides in from the dark once the boot overlay lifts
      if (!reduced && boot.finished && !intro.current) intro.current = Math.max(now, boot.finishedAt);
      const ie = reduced ? 1 : intro.current ? easeOutExpo(Math.min(1, (now - intro.current) / INTRO_MS)) : 0;

      // apparent size of the opening goes as 1/distance: half of the approach is interpolated in log
      // space so it grows evenly instead of exploding over the last few percent
      const k0 = range(p, TRAVEL[0], TRAVEL[1]);
      const e = 0.25 * easeInOutSine(k0) + 0.75 * k0;
      const d = 0.5 * (D0 + (D_STOP - D0) * e) + 0.5 * D0 * Math.pow(D_STOP / D0, e);
      const dolly = D0 - d;
      const aspect = state.size.width / state.size.height;
      H.scale.x = Math.min(1, Math.max(0.42, aspect / 1.5));
      // start close to the closed back wall and back away from it while turning (the same -z direction
      // the travel then carries on in)
      const rb = range(p, 0, TURN[1]);
      const retreat = reduced ? 1 : 1 - (1 - rb) * (1 - rb);
      H.position.z = Z0 + dolly - RETREAT * (1 - retreat) - 3.5 * (1 - ie) - CAM_Z;

      // look around the camera: pointer + a slow idle sway
      const L = look.current;
      const k = 1 - Math.exp(-delta / 0.35);
      L.x += (L.tx - L.x) * k;
      L.y += (L.ty - L.y) * k;
      const calm = 1 - range(p, 0.75, 0.95);
      const sway = reduced ? 0 : Math.sin(t * 0.17) * 0.012;
      // start facing the closed back wall; the first stretch of scroll turns the camera round to the hall
      const turn = reduced ? 1 : easeInOutCubic(range(p, TURN[0], TURN[1]));
      P.rotation.y = Math.PI * (1 - turn) + (-L.x * 0.085 + sway) * calm;
      // …along an arc: mid-turn the camera stands back from the wall it faces (+x), so the room reads
      H.position.x = ORBIT * Math.sin(Math.PI * turn) * H.scale.x;
      P.rotation.x = (-L.y * 0.05 + Math.sin(t * 0.13) * 0.006) * calm;

      const u = material.uniforms;
      u.uOpacity.value = ie;
      u.uFogFar.value = 30 - 10 * range(p, 0.4, 1);
      u.uTime.value = t;
      u.uNeonAmt.value = reduced ? 0 : ie;
      const su = shellMat.uniforms;
      su.uOpacity.value = ie;
      su.uFogFar.value = u.uFogFar.value;

      const near = range(p, 0.8, 0.95);
      portalMat.uniforms.uOpacity.value = ie;
      portalMat.uniforms.uGlow.value = 1 - near;
      haloMat.uniforms.uOpacity.value = ie * (0.55 + 0.25 * range(p, 0.2, 0.8)) * (1 - near);
      dustMat.uniforms.uTime.value = t;
      dustMat.uniforms.uPixelRatio.value = state.viewport.dpr;
      dustMat.uniforms.uOpacity.value = ie * 0.9 * (1 - near);

      lastFrame.current = now;
      if (videosAllowed && boot.finished && !vids.current) {
        vids.current = createVideoAtlas();
        u.uVid.value = vids.current.tex;
        if (director.debug.on) (window as unknown as { __hallVideos?: HTMLVideoElement[] }).__hallVideos = vids.current.videos;
      }
      const A = vids.current;
      if (A) {
        if (!A.playing) {
          A.playing = true;
          A.videos.forEach((v) => void v.play().catch(() => {}));
        }
        if (now - A.drawn >= VID_FRAME_MS) {
          A.drawn = now;
          drawVideoAtlas(A);
        }
        A.videos.forEach((v, i) => {
          if (v.readyState >= 2 && A.painted[i]) A.ready[i] = Math.min(1, A.ready[i] + delta / 0.8);
        });
        (u.uVidReadyA.value as THREE.Vector4).fromArray(A.ready, 0);
        (u.uVidReadyB.value as THREE.Vector4).fromArray(A.ready, 4);
      }

      const idle = now - L.moved > 1500 && Math.abs(L.tx - L.x) < 0.001 && Math.abs(L.ty - L.y) < 0.001;
      setContinuous(id, !reduced && (ie < 1 || !idle || tier.tier !== "low" || !!A));
      if (director.debug.on) director.debug.hall = {
          p: +p.toFixed(3),
          dolly: +dolly.toFixed(2),
          intro: +ie.toFixed(2),
          vid: A ? `${A.videos.filter((v) => !v.paused).length}/${A.ready.filter((r) => r >= 1).length}` : "off",
        };
    },
    0,
    root,
  );

  return (
    <group ref={root} visible={false}>
      <group ref={pivot} position={[0, 0, CAM_Z]}>
        <group ref={hall}>
          <mesh geometry={shellGeo} material={shellMat} frustumCulled={false} renderOrder={0} />
          <instancedMesh ref={mesh} args={[geometry, material, N]} frustumCulled={false} renderOrder={1} />
          <mesh geometry={plane} material={portalMat} position={[0, 0, PORTAL_Z]} scale={[HW * 2, HH * 2, 1]} renderOrder={2} />
          <mesh geometry={plane} material={haloMat} position={[0, 0, PORTAL_Z + 0.2]} scale={[HW * 5, HH * 5, 1]} renderOrder={3} />
          <points geometry={dustGeo} material={dustMat} frustumCulled={false} renderOrder={4} />
        </group>
      </group>
    </group>
  );
}
