"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { SceneProps } from "../registry";
import { director, registerWindow, setReady, useSceneFrame } from "../director";
import {
  edgesFrag,
  edgesVert,
  layer0Frag,
  layer1Frag,
  layer2Frag,
  layer3Frag,
  layersVert,
  nodesFrag,
  nodesVert,
} from "../shaders/layers.glsl";
import { worldPerPx } from "../camera";
import { scrollEngine } from "@/lib/scroll";
import { easeInOutCubic, lerp, offsetWithin, range, smooth, stageTop, type Box } from "@/lib/layout";
import { asset, pfThumb } from "@/lib/asset";
import { sourceSize } from "@/lib/cover";
import { geoEdges, geoNodes } from "@/content/geo-nodes";

const PLANE_ASPECT = 1.45; // h / w
const COLS = 12;
const HANDOFF_WORK = 1; // pf-001 mir9 (same work as the L0 capture media/img/showcase/mir9.webp)
const MIN_VW = 1024;
/** C02 progress where the plane starts rising (C02's text lifts from C02_LIFT_FROM, see C02Shift) */
const RISE_FROM = 0.84;

const enabled = (vw: number) => !scrollEngine.reducedMotion && vw >= MIN_VW;

registerWindow("layers", (s) => {
  if (!enabled(s.vw)) return false;
  const ss = scrollEngine.section("shift");
  const ls = scrollEngine.section("layers");
  const is = scrollEngine.section("index");
  if (!ss || !ls) return false;
  const end = is ? is.top + 2 : ls.top + ls.height;
  return s.scroll >= ss.top + ss.S * RISE_FROM && s.scroll < end;
});

/** CPU pass over the capture: content cells (luminance std-dev) and 3+ cell answer runs → 12×rows RGBA. */
function analyse(img: HTMLImageElement | ImageBitmap) {
  const W = img.width;
  const H = img.height;
  const cell = W / COLS;
  const rows = Math.max(1, Math.floor(H / cell));
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(img, 0, 0);
  const px = g.getImageData(0, 0, W, H).data;
  const content = new Uint8Array(COLS * rows);
  const S = 10;
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < COLS; k++) {
      let sum = 0;
      let sum2 = 0;
      for (let j = 0; j < S; j++) {
        for (let i = 0; i < S; i++) {
          const x = Math.min(W - 1, Math.floor(k * cell + ((i + 0.5) / S) * cell));
          const y = Math.min(H - 1, Math.floor(r * cell + ((j + 0.5) / S) * cell));
          const o = (y * W + x) * 4;
          const l = (0.299 * px[o] + 0.587 * px[o + 1] + 0.114 * px[o + 2]) / 255;
          sum += l;
          sum2 += l * l;
        }
      }
      const mean = sum / (S * S);
      const v = sum2 / (S * S) - mean * mean;
      content[r * COLS + k] = v > 0.004 ? 1 : 0;
    }
  }
  const data = new Uint8Array(COLS * rows * 4);
  let bars = 0;
  for (let r = 0; r < rows; r++) {
    let k = 0;
    while (k < COLS) {
      if (!content[r * COLS + k]) {
        k++;
        continue;
      }
      let e = k;
      while (e < COLS && content[r * COLS + e]) e++;
      const len = e - k;
      for (let j = k; j < e; j++) {
        const o = (r * COLS + j) * 4;
        data[o] = 255;
        if (len >= 3) {
          data[o + 1] = 255;
          data[o + 2] = k * 20;
          data[o + 3] = len * 20;
        }
      }
      if (len >= 3) bars++;
      k = e;
    }
  }
  const tex = new THREE.DataTexture(data, COLS, rows, THREE.RGBAFormat);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  let cells = 0;
  for (const v of content) cells += v;
  return { tex, rows, cells, bars };
}

type Layout = {
  v: number;
  fig: Box | null;
  line: Box | null;
  tile: Box | null;
  deck: Box | null;
  labels: HTMLElement[];
};

function measure(): Layout {
  const lStage = document.querySelector<HTMLElement>("#layers > .pin-stage");
  const sStage = document.querySelector<HTMLElement>("#shift > .pin-stage");
  const fig = document.querySelector<HTMLElement>("#layers .c03-figure");
  const line = document.querySelector<HTMLElement>("#shift .c02-line");
  const iStage = document.querySelector<HTMLElement>("#index > .pin-stage");
  const tile = document.querySelector<HTMLElement>(`#index .c04-anchor[data-work="${HANDOFF_WORK}"]`);
  const deck = document.querySelector<HTMLElement>("#shift .c02-deck");
  return {
    deck: deck && sStage && deck.offsetWidth ? offsetWithin(deck, sStage) : null,
    v: scrollEngine.layoutVersion,
    fig: fig && lStage ? offsetWithin(fig, lStage) : null,
    line: line && sStage ? offsetWithin(line, sStage) : null,
    tile: tile && iStage && tile.offsetWidth ? offsetWithin(tile, iStage) : null,
    labels: [...document.querySelectorAll<HTMLElement>("#layers .c03-gl-label")],
  };
}

const ink = new THREE.Color("#111110");
const paper = new THREE.Color("#f2f0e9");
const marker = new THREE.Color("#ddf160");
const entity = new THREE.Color("#ac60ff");

function makeLayer(frag: string, tint: THREE.Color) {
  return new THREE.ShaderMaterial({
    vertexShader: layersVert,
    fragmentShader: frag,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
    uniforms: {
      uScrollY: { value: 0 },
      uWindow: { value: 0.33 },
      uReveal: { value: 0 },
      uOpacity: { value: 1 },
      uFill: { value: 0 },
      uInk: { value: ink },
      uPaper: { value: paper },
      uTint: { value: tint },
      uCells: { value: null },
      uCellGrid: { value: new THREE.Vector2(COLS, 53) },
      uMap: { value: null },
      uThumb: { value: null },
      uDesat: { value: 0 },
      uThumbMix: { value: 0 },
      uThumbScale: { value: new THREE.Vector2(1, 1) },
    },
  });
}

/**
 * Layers (C03 HTML·CSS·JS exploded axonometric). Four planes (base page / HTML cells / CSS bars / JS
 * hairline) + JS-layer Points + LineSegments = 6 draws. The plane rect is derived from DOM boxes:
 * rises below the C02 reading line, centres in `.c03-figure`, then shrinks onto the C04 pf-001
 * tile thumbnail (where the Index scene takes over).
 */
export function Layers({ id }: SceneProps) {
  const group = useRef<THREE.Group>(null);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  // texW/texH and thumbAspect are measured from the loaded files (no hard-coded capture size)
  const [tex, setTex] = useState<{
    map: THREE.Texture;
    thumb: THREE.Texture;
    cells: THREE.DataTexture;
    rows: number;
    texW: number;
    texH: number;
    thumbAspect: number;
  } | null>(null);

  const mats = useMemo(
    () => [makeLayer(layer0Frag, ink), makeLayer(layer1Frag, ink), makeLayer(layer2Frag, marker), makeLayer(layer3Frag, entity)],
    [],
  );
  const nodeMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: nodesVert,
        fragmentShader: nodesFrag,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        uniforms: { uNodes: { value: 0 }, uSize: { value: 30 }, uPixelRatio: { value: 1 }, uTint: { value: entity }, uOpacity: { value: 1 } },
      }),
    [],
  );
  const edgeMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: edgesVert,
        fragmentShader: edgesFrag,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        uniforms: { uNodes: { value: 0 }, uTint: { value: entity }, uOpacity: { value: 1 } },
      }),
    [],
  );
  const plane = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const nodeGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(geoNodes.flatMap((n) => [n.x - 0.5, 0.5 - n.y, 0])), 3));
    g.setAttribute("aIndex", new THREE.BufferAttribute(new Float32Array(geoNodes.map((_, i) => i)), 1));
    return g;
  }, []);
  const edgeGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const P = (i: number) => [geoNodes[i].x - 0.5, 0.5 - geoNodes[i].y, 0];
    const aA: number[] = [];
    const aB: number[] = [];
    const aEnd: number[] = [];
    const aK: number[] = [];
    for (const [a, b] of geoEdges) {
      const [from, to] = a < b ? [a, b] : [b, a];
      for (const end of [0, 1]) {
        aA.push(...P(from));
        aB.push(...P(to));
        aEnd.push(end);
        aK.push(to);
      }
    }
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(aA), 3));
    g.setAttribute("aA", new THREE.BufferAttribute(new Float32Array(aA), 3));
    g.setAttribute("aB", new THREE.BufferAttribute(new Float32Array(aB), 3));
    g.setAttribute("aEnd", new THREE.BufferAttribute(new Float32Array(aEnd), 1));
    g.setAttribute("aK", new THREE.BufferAttribute(new Float32Array(aK), 1));
    return g;
  }, []);
  useEffect(
    () => () => {
      mats.forEach((m) => m.dispose());
      nodeMat.dispose();
      edgeMat.dispose();
      plane.dispose();
      nodeGeo.dispose();
      edgeGeo.dispose();
    },
    [mats, nodeMat, edgeMat, plane, nodeGeo, edgeGeo],
  );

  // textures load when C03 is within ~1.5 screens (progressive)
  const [wanted, setWanted] = useState(false);
  useEffect(() => {
    if (wanted) return;
    return scrollEngine.onFrame((s) => {
      const ls = scrollEngine.section("layers");
      if (ls && enabled(s.vw) && s.scroll > ls.top - s.vh * 2.5) setWanted(true);
    });
  }, [wanted]);

  useEffect(() => {
    if (!wanted) return;
    let dead = false;
    const loader = new THREE.TextureLoader();
    Promise.all([loader.loadAsync(asset("media/img/showcase/mir9.webp")), loader.loadAsync(pfThumb(HANDOFF_WORK))]).then(
      ([map, thumb]) => {
        if (dead) {
          map.dispose();
          thumb.dispose();
          return;
        }
        for (const t of [map, thumb]) {
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = 4;
        }
        map.minFilter = THREE.LinearMipmapLinearFilter;
        const a = analyse(map.image as HTMLImageElement);
        director.debug.layersCells = { rows: a.rows, cells: a.cells, bars: a.bars };
        const ms = sourceSize(map.image);
        const ts = sourceSize(thumb.image);
        setTex({
          map,
          thumb,
          cells: a.tex,
          rows: a.rows,
          texW: ms.w || 480,
          texH: ms.h || 1394,
          thumbAspect: ts.w && ts.h ? ts.w / ts.h : 16 / 9,
        });
      },
      () => {},
    );
    return () => {
      dead = true;
    };
  }, [wanted]);
  useEffect(
    () => () => {
      tex?.map.dispose();
      tex?.thumb.dispose();
      tex?.cells.dispose();
    },
    [tex],
  );

  useEffect(() => {
    if (!tex) return;
    for (const m of mats) {
      m.uniforms.uMap.value = tex.map;
      m.uniforms.uThumb.value = tex.thumb;
      m.uniforms.uCells.value = tex.cells;
      (m.uniforms.uCellGrid.value as THREE.Vector2).set(COLS, tex.rows);
    }
  }, [tex, mats]);

  useEffect(() => () => setReady(id, false), [id]);

  const layout = useRef<Layout>({ v: -1, fig: null, line: null, tile: null, deck: null, labels: [] });
  // C02's DOM page card hands over to the plane past p 0.84 only once the plane can draw
  useEffect(() => {
    if (!tex) return;
    document.documentElement.dataset.glLayers = "1";
    return () => void delete document.documentElement.dataset.glLayers;
  }, [tex]);
  const labelState = useRef<string[]>([]);
  const v3 = useMemo(() => new THREE.Vector3(), []);

  useSceneFrame(
    id,
    (_p, state) => {
      const ok = !!tex && enabled(state.size.width);
      setReady(id, ok);
      const G = group.current;
      if (!G || !ok || !tex) {
        if (G) G.visible = false;
        return;
      }
      const T = tex;
      if (layout.current.v !== scrollEngine.layoutVersion) layout.current = measure();
      const L = layout.current;
      const ls = scrollEngine.section("layers");
      const ss = scrollEngine.section("shift");
      const is = scrollEngine.section("index");
      if (!L.fig || !ls || !ss) return;

      const vw = state.size.width;
      const vh = state.size.height;
      const wpp = worldPerPx(vh);
      const scroll = director.scroll;
      const p = scrollEngine.progress("layers");
      // rects in viewport px (cx, cy, w, h)
      const fig = L.fig;
      const ph = Math.min(fig.h * 0.8, fig.w * 0.62 * PLANE_ASPECT);
      const pw = ph / PLANE_ASPECT;
      const cx = fig.x + fig.w / 2;
      // rise: one continuous move from below the viewport (as C02's text lifts) onto C03's figure slot
      // *as it rises* — growing and turning into its 3D stance on the way, landing exactly when C03 pins
      const rk = range(scroll, ss.top + ss.S * RISE_FROM, ls.top);
      const rise = 0.5 * (1 - Math.pow(1 - rk, 3)) + 0.5 * smooth(rk);
      const settle = rise;
      const back = smooth(range(p, 0.8, 0.9));
      // leads C03's rising stage (half its offset), so it is already on screen while C02 lifts away
      const lt = stageTop(ls, scroll, true);
      const cyFig = fig.y + fig.h / 2 + (lt > 0 ? lt * 0.5 : lt);
      // lifts off C02's deck (its last card is this page, same rect), then grows while it travels
      // onto the figure slot
      const D = L.deck;
      const st = stageTop(ss, scroll, true);
      const s0 = D ? D.h / ph : Math.min(1, (vh * 0.24) / ph);
      const pop = D ? 1 : smooth(range(rk, 0, 0.14));
      const grow = lerp(s0, 1, rise) * (0.35 + 0.65 * pop);
      const rx0 = D ? D.x + D.w / 2 : vw / 2;
      const ry0 = D ? D.y + D.h / 2 + st : Math.min(vh * 0.76, vh - ph * s0 * 0.5 - 28);
      let rx = lerp(rx0, cx, rise);
      let ry = lerp(ry0, Math.min(cyFig, Math.max(ry0, fig.y + fig.h / 2)), rise);
      let rw = pw * grow;
      let rh = ph * grow;
      // hand-off: only during the one screen where C03's stage leaves and C04's arrives, so both the
      // start (moving up with C03) and the target tile (coming up with C04) are on screen
      const travel = is ? range(scroll, ls.top + ls.S, is.top) : 0;
      const shrink = easeInOutCubic(travel);
      if (L.tile && is) {
        const t = L.tile;
        const ty = t.y + stageTop(is, scroll, true);
        rx = lerp(rx, t.x + t.w / 2, shrink);
        ry = lerp(ry, ty + t.h / 2, shrink);
        rw = lerp(rw, t.w, shrink);
        rh = lerp(rh, t.h, shrink);
      }
      if (travel >= 1) {
        G.visible = false;
        return;
      }

      const rot = settle * (1 - back);
      // the layers start separating the moment it lands
      const explode = smooth(range(p, 0.01, 0.14)) * (1 - range(p, 0.8, 0.9));
      G.position.set((rx - vw / 2) * wpp, (vh / 2 - ry) * wpp, 0);
      // off the deck it starts flat (it *is* the card), swings out mid-flight and settles into its stance
      const swing = D ? 4 * rise * (1 - rise) : 1 - rise;
      G.rotation.set(-0.52 * rot, 0.62 * rot - 0.34 * swing, 0.06 * swing);
      G.scale.setScalar(1 - 0.16 * explode);

      const gap = 0.42 * ((ph * wpp) / 2.6) * explode;
      const win = Math.min(1, (rh / rw) * (T.texW / T.texH));
      // the capture already scrolls a little during the rise, so the page is never a still image
      const scrollY = Math.min(1 - win, 0.06 * rise + 0.49 * range(p, 0.1, 0.8));
      const overlay = 1 - range(p, 0.86, 0.94);
      const reveal = [1, range(p, 0.2, 0.4), range(p, 0.4, 0.6), 1];
      const boxAspect = rw / rh;
      const imgAspect = T.thumbAspect;
      for (let k = 0; k < 4; k++) {
        const m = meshes.current[k];
        if (!m) continue;
        m.scale.set(rw * wpp, rh * wpp, 1);
        m.position.z = (k - 1.5) * gap;
        const u = mats[k].uniforms;
        u.uWindow.value = win;
        u.uScrollY.value = scrollY;
        u.uReveal.value = reveal[k];
        u.uFill.value = 0.16 * explode;
        u.uOpacity.value = (k === 0 ? 1 : overlay * smooth(range(rk, 0.05, 0.3))) * pop;
        if (k === 0) {
          u.uDesat.value = 0.4 * smooth(range(explode, 0.5, 1));
          u.uThumbMix.value = range(travel, 0.35, 0.9);
          (u.uThumbScale.value as THREE.Vector2).set(Math.min(1, boxAspect / imgAspect), Math.min(1, imgAspect / boxAspect));
        }
        m.visible = k === 0 || overlay > 0.001;
      }
      const nodes = 12 * range(p, 0.6, 0.8);
      nodeMat.uniforms.uNodes.value = nodes;
      nodeMat.uniforms.uPixelRatio.value = state.viewport.dpr;
      nodeMat.uniforms.uOpacity.value = overlay;
      edgeMat.uniforms.uNodes.value = nodes;
      edgeMat.uniforms.uOpacity.value = overlay;

      // GEO DOM labels: project node positions to the pinned stage (transform writes only)
      G.updateMatrixWorld(true);
      const l3 = meshes.current[3];
      const sTop = stageTop(ls, scroll, true);
      L.labels.forEach((el, i) => {
        const on = Math.max(0, Math.min(1, nodes - i)) * overlay;
        let css = "0";
        let tr = "";
        if (on > 0.001 && l3) {
          const n = geoNodes[i];
          v3.set(n.x - 0.5, 0.5 - n.y, 0).applyMatrix4(l3.matrixWorld).project(state.camera);
          const x = ((v3.x + 1) / 2) * vw;
          const y = ((1 - v3.y) / 2) * vh - sTop;
          css = on.toFixed(2);
          tr = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        }
        const key = css + tr;
        if (labelState.current[i] === key) return;
        labelState.current[i] = key;
        el.style.opacity = css;
        if (tr) el.style.transform = tr;
      });

      if (director.debug.on) {
        const l0 = meshes.current[0]!;
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const [a, b] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
          v3.set(a, b, 0).applyMatrix4(l0.matrixWorld).project(state.camera);
          const x = ((v3.x + 1) / 2) * vw;
          const y = ((1 - v3.y) / 2) * vh;
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }
        director.debug.layers = {
          p: +p.toFixed(4),
          plane: [x0, y0, x1 - x0, y1 - y0].map((v) => +v.toFixed(1)),
          tile: L.tile && is ? [L.tile.x, L.tile.y + stageTop(is, scroll, true), L.tile.w, L.tile.h].map((v) => +v.toFixed(1)) : null,
        };
      }
    },
    0,
    group,
  );

  return (
    <group ref={group} visible={false}>
      {mats.map((m, k) => (
        <mesh key={k} ref={(el) => void (meshes.current[k] = el)} geometry={plane} material={m} renderOrder={k}>
          {k === 3 ? (
            <>
              <lineSegments geometry={edgeGeo} material={edgeMat} renderOrder={4} frustumCulled={false} />
              <points geometry={nodeGeo} material={nodeMat} renderOrder={5} frustumCulled={false} />
            </>
          ) : null}
        </mesh>
      ))}
    </group>
  );
}
