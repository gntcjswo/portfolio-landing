"use client";
import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction, type BloomEffect, type VignetteEffect } from "postprocessing";
import type { Object3D } from "three";
import { chapterById, type SceneId } from "@/content/chapters";
import { scrollEngine } from "@/lib/scroll";
import { boot } from "@/lib/boot";
import { range } from "@/lib/layout";
import { downgradeTier, type TierInfo } from "@/lib/tier";
import { director, directorWantsFrame, onSceneChange, updateDirector } from "./director";
import { sceneRegistry } from "./registry";
import { CAM_Z, FOV } from "./camera";

const sceneIds = Object.keys(sceneRegistry) as SceneId[];
const T0 = typeof performance === "undefined" ? 0 : performance.now();

/** Wires R3F's on-demand loop to the shared scroll loop and counts rendered frames. */
function SceneDirector({ debug, tier }: { debug: boolean; tier: TierInfo }) {
  const advance = useThree((s) => s.advance);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const setDpr = useThree((s) => s.setDpr);

  // One rAF for the whole page: the scroll loop renders R3F synchronously via advance()
  // (frameloop "never"), only when something moved, a scene animates, or layout/visibility changed.
  useEffect(() => {
    let layoutSeen = -1;
    const off = scrollEngine.onFrame((s) => updateDirector(s, true));
    scrollEngine.glNeedsFrame = () => {
      const layout = scrollEngine.layoutVersion !== layoutSeen;
      layoutSeen = scrollEngine.layoutVersion;
      return directorWantsFrame() || director.dirty || layout;
    };
    scrollEngine.invalidate = () => {
      if (!director.visible.size) return;
      director.dirty = false;
      advance((performance.now() - T0) / 1000, true);
    };
    director.dirty = true;
    return () => {
      off();
      scrollEngine.invalidate = null;
      scrollEngine.glNeedsFrame = null;
    };
  }, [advance]);
  const invalidate = () => {
    director.dirty = true;
  };

  // context loss twice → tier none (DOM fallback for every chapter)
  useEffect(() => {
    let losses = 0;
    const c = gl.domElement;
    const onLost = (e: Event) => {
      e.preventDefault();
      if (++losses >= 2) downgradeTier("webgl context lost twice");
    };
    c.addEventListener("webglcontextlost", onLost);
    return () => c.removeEventListener("webglcontextlost", onLost);
  }, [gl]);

  // C00: compile every scene's programs while the boot overlay is up (hidden objects included)
  useEffect(() => {
    let dead = false;
    const run = () => {
      if (dead) return;
      const hidden: Object3D[] = [];
      scene.traverse((o) => {
        if (!o.visible) {
          hidden.push(o);
          o.visible = true;
        }
      });
      gl.compileAsync(scene, camera)
        .catch(() => {})
        .finally(() => {
          hidden.forEach((o) => (o.visible = false));
          boot.mark("gl");
          invalidate();
        });
    };
    const id = window.setInterval(() => {
      if (director.ready.has("hall")) {
        window.clearInterval(id);
        run();
      }
    }, 50);
    const cap = window.setTimeout(() => boot.mark("gl"), 2400);
    return () => {
      dead = true;
      window.clearInterval(id);
      window.clearTimeout(cap);
    };
  }, [gl, scene, camera]); // eslint-disable-line react-hooks/exhaustive-deps

  // runtime monitor: only contiguous frames count, compared with the page's own rAF rate
  // (a throttled browser is not a slow GPU); 3 slow windows → DPR −0.25, twice → tier down
  const perf = useRef({ acc: 0, frames: 0, loop0: 0, slow: 0, declines: 0, dpr: tier.dpr[1] });
  useFrame((_s, delta) => {
    director.rendered++;
    const m = perf.current;
    if (delta > 0.1) return;
    if (!m.frames) m.loop0 = scrollEngine.stats.frames;
    m.acc += delta;
    m.frames++;
    if (m.acc < 1) return;
    const fps = m.frames / m.acc;
    const loopFps = (scrollEngine.stats.frames - m.loop0) / m.acc;
    m.acc = 0;
    m.frames = 0;
    director.debug.fps = Math.round(fps);
    if (!directorWantsFrame()) return;
    m.slow = fps < 40 && fps < loopFps * 0.8 ? m.slow + 1 : 0;
    if (m.slow < 3) return;
    m.slow = 0;
    m.declines++;
    if (m.declines >= 2) {
      m.declines = -Infinity;
      if (tier.tier !== "low") downgradeTier("PerformanceMonitor: 2 declines");
    } else {
      m.dpr = Math.max(1, m.dpr - 0.25);
      setDpr([1, m.dpr]);
    }
  }, -1);

  useEffect(() => {
    if (debug) director.debug.on = true;
    const w = window as unknown as Record<string, unknown>;
    w.__wsDirector = director;
    if (!debug) return;
    w.__wsGL = gl;
    // debug: synchronous render cost (CPU + GPU, forced by a 1px readPixels) independent of vsync caps
    w.__wsBench = (n = 60) => {
      const ctx = gl.getContext();
      const px = new Uint8Array(4);
      const t: number[] = [];
      for (let i = 0; i < n; i++) {
        const a = performance.now();
        advance((a - T0) / 1000, true);
        ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, px);
        t.push(performance.now() - a);
      }
      t.sort((x, y) => x - y);
      return { n, p50: +t[n >> 1].toFixed(2), p95: +t[Math.floor(n * 0.95)].toFixed(2), max: +t[n - 1].toFixed(2) };
    };
  }, [debug, gl, advance]);

  return (
    <>
      {sceneIds.map((id) => {
        const Scene = sceneRegistry[id];
        return <Scene key={id} id={id} debug={debug} tier={tier} />;
      })}
    </>
  );
}

/** Noise + Vignette always (paper 0.15 / night 0.45); Bloom only on night chapters for tier "all". */
function Post({ tier }: { tier: TierInfo }) {
  const vignette = useRef<VignetteEffect>(null);
  const bloom = useRef<BloomEffect>(null);
  useFrame(() => {
    const night = chapterById[director.chapter].tone === "night";
    // the hall ends with the paper door filling the screen; any vignette there reads as dirty corners
    const k = director.chapter === "q" ? 1 - range(scrollEngine.progress("q"), 0.8, 0.94) : 1;
    if (vignette.current) vignette.current.darkness = (night ? 0.45 : 0.15) * k;
    if (bloom.current) bloom.current.intensity = night ? 0.35 * k : 0;
  });
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Noise opacity={0.035} blendFunction={BlendFunction.SOFT_LIGHT} />
      <Vignette ref={vignette} darkness={0.15} offset={0.3} />
      {tier.post === "all" ? (
        <Bloom ref={bloom} intensity={0} luminanceThreshold={0.72} mipmapBlur resolutionScale={0.5} />
      ) : (
        <></>
      )}
    </EffectComposer>
  );
}

/**
 * The single persistent WebGL canvas: fixed, between the chapter backgrounds
 * and their content, pointer-events none, rendered on demand from the shared scroll loop; it fades
 * to opacity 0 and stops rendering when no scene is visible.
 */
export default function StageCanvas({ tier, debug }: { tier: TierInfo; debug: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => {
      if (!wrap.current) return;
      wrap.current.dataset.scene = director.scene ?? "none";
      wrap.current.dataset.active = director.visible.size ? "1" : "0";
    };
    sync();
    return onSceneChange(sync);
  }, []);

  return (
    <div ref={wrap} className="stage" aria-hidden="true" data-active="0" data-debug={debug ? "1" : "0"}>
      <Canvas
        frameloop="never"
        dpr={tier.dpr}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance", stencil: false, depth: true }}
        camera={{ position: [0, 0, CAM_Z], fov: FOV, near: 0.1, far: 100 }}
        style={{ pointerEvents: "none" }}
      >
        <SceneDirector debug={debug} tier={tier} />
        {tier.post !== "off" ? <Post tier={tier} /> : null}
      </Canvas>
    </div>
  );
}
