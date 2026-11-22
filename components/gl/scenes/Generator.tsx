"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { SceneProps } from "../registry";
import { director, registerWindow, setContinuous, setReady, useSceneFrame } from "../director";
import { frameFrag, genVert, inputFrag } from "../shaders/generator.glsl";
import { worldPerPx } from "../camera";
import { scrollEngine } from "@/lib/scroll";
import { asset, pfImage } from "@/lib/asset";
import { videoPool } from "@/lib/video-pool";
import { sourceSize } from "@/lib/cover";
import { lerp, offsetWithin, range, smooth, stageTop, type Box } from "@/lib/layout";
import { workflowStills } from "@/content/ai-workflow";
import { flags } from "@/content/flags";

const MIN_VW = 1024;
const OUT_VIDEO = "media/video/reel/mobile-01.mp4"; // 540×960; real aspect read from metadata

let domHeavy = false;
const enabled = (vw: number) => !scrollEngine.reducedMotion && vw >= MIN_VW && !domHeavy && flags.useWorkStillsInGenerator;

registerWindow("generator", (s) => {
  if (!enabled(s.vw)) return false;
  const rx = scrollEngine.section("ai-dev");
  if (!rx) return false;
  return s.scroll > rx.top - s.vh && s.scroll < rx.top + rx.height;
});

type Layout = { v: number; inputs: Box[]; frame: Box | null };

function measure(): Layout {
  const stage = document.querySelector<HTMLElement>("#ai-dev > .pin-stage");
  const frame = document.querySelector<HTMLElement>("#ai-dev .c07-frame");
  const lis = [...document.querySelectorAll<HTMLElement>("#ai-dev .c07-inputs li")];
  return {
    v: scrollEngine.layoutVersion,
    inputs: stage ? lis.map((li) => offsetWithin(li, stage)) : [],
    frame: frame && stage ? offsetWithin(frame, stage) : null,
  };
}

const bez = (a: number, b: number, c: number, d: number, t: number) => {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};

/**
 * Generator (C07-A). Five input stills leave their DOM slots along cubic paths into the 9:16 output
 * frame (p 0–0.21), the frame cycles the stills and dissolves into the output clip through
 * scan-line noise (p 0.2–0.45). Seven draws; DOM keeps the steps, script, captions and waveform.
 */
export function Generator({ id, tier }: SceneProps) {
  domHeavy = tier.domHeavyChapters;
  const root = useRef<THREE.Group>(null);
  const inputs = useRef<(THREE.Mesh | null)[]>([]);
  const frame = useRef<THREE.Mesh>(null);
  const [stills, setStills] = useState<THREE.Texture[] | null>(null);

  const [wanted, setWanted] = useState(false);
  useEffect(() => {
    if (wanted) return;
    return scrollEngine.onFrame((s) => {
      const rx = scrollEngine.section("ai-dev");
      if (rx && enabled(s.vw) && s.scroll > rx.top - s.vh * 2.5) setWanted(true);
    });
  }, [wanted]);
  useEffect(() => {
    if (!wanted) return;
    let dead = false;
    let loaded: THREE.Texture[] = [];
    const loader = new THREE.TextureLoader();
    Promise.all(workflowStills.map((s) => loader.loadAsync(pfImage(s.id)))).then(
      (ts) => {
        loaded = ts;
        if (dead) return ts.forEach((t) => t.dispose());
        for (const t of ts) {
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = 4;
        }
        setStills(ts);
        director.dirty = true;
      },
      () => {},
    );
    return () => {
      dead = true;
      loaded.forEach((t) => t.dispose());
    };
  }, [wanted]);

  const plane = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const inputMats = useMemo(
    () =>
      workflowStills.map(
        () =>
          new THREE.ShaderMaterial({
            vertexShader: genVert,
            fragmentShader: inputFrag,
            transparent: true,
            depthWrite: false,
            depthTest: false,
            uniforms: { uMap: { value: null }, uOpacity: { value: 1 }, uSize: { value: new THREE.Vector2(1, 1) }, uMapAspect: { value: 1 } },
          }),
      ),
    [],
  );
  const frameMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: genVert,
        fragmentShader: frameFrag,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          uS0: { value: null },
          uS1: { value: null },
          uS2: { value: null },
          uS3: { value: null },
          uS4: { value: null },
          uVideo: { value: null },
          uVideoOn: { value: 0 },
          uVideoAspect: { value: 9 / 16 },
          uStillAspect: { value: 1 },
          uGen: { value: 0 },
          uFill: { value: 0 },
          uTime: { value: 0 },
          uSize: { value: new THREE.Vector2(1, 1) },
          uBase: { value: new THREE.Color("#1a1a18") },
          uSeam: { value: new THREE.Color("#ddf160") },
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
  // VideoTexture re-uploads with texImage2D (no fixed storage), so only the aspect needs tracking
  useEffect(() => {
    if (!video) return;
    const onMeta = () => {
      if (video.videoWidth && video.videoHeight) frameMat.uniforms.uVideoAspect.value = video.videoWidth / video.videoHeight;
    };
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("resize", onMeta);
    return () => {
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("resize", onMeta);
    };
  }, [video, frameMat]);
  const videoTex = useMemo(() => {
    if (!video) return null;
    const t = new THREE.VideoTexture(video);
    t.colorSpace = THREE.SRGBColorSpace;
    t.generateMipmaps = false;
    return t;
  }, [video]);

  useEffect(() => {
    if (!stills) return;
    stills.forEach((t, i) => {
      const { w, h } = sourceSize(t.image);
      inputMats[i].uniforms.uMap.value = t;
      inputMats[i].uniforms.uMapAspect.value = w && h ? w / h : 1;
      frameMat.uniforms[`uS${i}`].value = t;
    });
    // all stills share one aspect in the frame shader (480² portfolio images); use the first as reference
    const s0 = sourceSize(stills[0]?.image);
    frameMat.uniforms.uStillAspect.value = s0.w && s0.h ? s0.w / s0.h : 1;
    frameMat.uniforms.uVideo.value = videoTex;
  }, [stills, inputMats, frameMat, videoTex]);

  useEffect(
    () => () => {
      plane.dispose();
      inputMats.forEach((m) => m.dispose());
      frameMat.dispose();
      videoTex?.dispose();
      if (video) videoPool.release(video);
      setReady(id, false);
      setContinuous(id, false);
    },
    [plane, inputMats, frameMat, video, videoTex, id],
  );

  const layout = useRef<Layout>({ v: -1, inputs: [], frame: null });
  const videoOn = useRef(false);

  useSceneFrame(
    id,
    (_p, state) => {
      const R = root.current;
      const ok = !!stills && enabled(state.size.width);
      setReady(id, ok);
      if (R) R.visible = ok;
      if (!R || !ok) return;
      if (layout.current.v !== scrollEngine.layoutVersion) layout.current = measure();
      const L = layout.current;
      const rx = scrollEngine.section("ai-dev");
      if (!L.frame || !rx || L.inputs.length < workflowStills.length) return;

      const vw = state.size.width;
      const vh = state.size.height;
      const wpp = worldPerPx(vh);
      const scroll = director.scroll;
      const p = scrollEngine.progress("ai-dev");
      const top = stageTop(rx, scroll, true);
      const X = (px: number) => (px - vw / 2) * wpp;
      const Y = (py: number) => (vh / 2 - py) * wpp;

      const F = L.frame;
      const fcx = F.x + F.w / 2;
      const fcy = F.y + F.h / 2 + top;

      L.inputs.forEach((b, i) => {
        const m = inputs.current[i];
        if (!m) return;
        const t = smooth(range(p, i * 0.025, 0.11 + i * 0.025));
        const x0 = b.x + b.w / 2;
        const y0 = b.y + b.h / 2 + top;
        const x = bez(x0, x0 + (fcx - x0) * 0.1, fcx, fcx, t);
        const y = bez(y0, y0 - 160, F.y + top - 120, fcy, t);
        const size = lerp(b.w, F.w * 0.2, t);
        m.position.set(X(x), Y(y), 0.01 * i);
        m.rotation.z = (-(i - 2) * 2 * Math.PI) / 180 * (1 - t);
        m.scale.set(size * wpp, size * wpp, 1);
        const u = inputMats[i].uniforms;
        u.uOpacity.value = 1 - range(t, 0.82, 1);
        (u.uSize.value as THREE.Vector2).set(size, size);
        m.visible = u.uOpacity.value > 0.002;
      });

      const fm = frame.current!;
      fm.position.set(X(fcx), Y(fcy), -0.01);
      fm.scale.set(F.w * wpp, F.h * wpp, 1);
      const fu = frameMat.uniforms;
      fu.uGen.value = range(p, 0.2, 0.45);
      fu.uFill.value = range(p, 0.1, 0.2);
      fu.uTime.value = state.clock.elapsedTime;
      (fu.uSize.value as THREE.Vector2).set(F.w, F.h);

      const wantVideo = p > 0.28 && !!video;
      if (wantVideo !== videoOn.current && video) {
        videoOn.current = wantVideo;
        if (wantVideo) videoPool.request(video, asset(OUT_VIDEO), "play", 1);
        else videoPool.release(video);
      }
      const playing = videoOn.current && !!video && video.readyState >= 2 && !video.paused;
      fu.uVideoOn.value = playing ? 1 : 0;
      if (playing && video.videoHeight) fu.uVideoAspect.value = video.videoWidth / video.videoHeight;
      setContinuous(id, playing || (fu.uGen.value > 0 && fu.uGen.value < 1));

      if (director.debug.on) director.debug.generator = {
          p: +p.toFixed(3),
          gen: +fu.uGen.value.toFixed(2),
          video: playing ? `${video.videoWidth}x${video.videoHeight}` : false,
          frame: `${Math.round(F.w)}x${Math.round(F.h)}`,
        };
    },
    0,
    root,
  );

  // leaving the window releases the decoder
  useEffect(() => {
    const off = scrollEngine.onFrame(() => {
      if (!director.visible.has(id) && videoOn.current && video) {
        videoOn.current = false;
        videoPool.release(video);
      }
    });
    return off;
  }, [id, video]);

  return (
    <group ref={root} visible={false}>
      <mesh ref={frame} geometry={plane} material={frameMat} frustumCulled={false} renderOrder={7} />
      {workflowStills.map((s, i) => (
        <mesh
          key={s.id}
          ref={(el) => void (inputs.current[i] = el)}
          geometry={plane}
          material={inputMats[i]}
          frustumCulled={false}
          renderOrder={8 + i}
        />
      ))}
    </group>
  );
}
