// C01 Hall: a long gallery whose walls, ceiling and floor are the 169 works (one 13×13 atlas). Depth
// fog falls to night, the far end is a paper-coloured opening that the scroll flies into.
export const hallVert = /* glsl */ `
attribute vec2 aCell;   // atlas column, row (row 0 = top of the image)
attribute vec2 aShade;  // brightness, surface (0 wall, 1 ceiling, 2 floor)
attribute float aVid;   // video slot 0..7, -1 = still print
attribute float aNeon;  // neon run phase 0..1, -1 = none
varying vec2 vUv;
varying vec2 vCell;
varying vec2 vShade;
varying float vDepth;
varying float vGlow;
varying float vVid;
varying float vNeon;
uniform float uPortalZ; // hall-space z of the opening
void main() {
  vUv = uv;
  vCell = aCell;
  vShade = aShade;
  vVid = aVid;
  vNeon = aNeon;
  vec4 lp = instanceMatrix * vec4(position, 1.0);
  vec4 mv = modelViewMatrix * lp;
  vDepth = -mv.z;
  // light spilling from the opening onto the last stretch of the hall
  vGlow = smoothstep(9.0, 0.0, abs(lp.z - uPortalZ));
  gl_Position = projectionMatrix * mv;
}
`;

export const hallFrag = /* glsl */ `
uniform sampler2D uAtlas;
uniform vec2 uGrid;
uniform vec3 uFog;
uniform vec3 uLight;
uniform float uFogNear;
uniform float uFogFar;
uniform float uOpacity;
// live video atlas (4×2 cells of 16:9, already cover-cropped); per-slot fade-in once a slot has frames
uniform sampler2D uVid;
uniform vec4 uVidReadyA;
uniform vec4 uVidReadyB;
// neon: now and then a light runs once round a print's edge, trailing a fading tail
uniform float uTime;
uniform vec3 uNeon;
uniform float uNeonAmt;
varying vec2 vUv;
varying vec2 vCell;
varying vec2 vShade;
varying float vDepth;
varying float vGlow;
varying float vVid;
varying float vNeon;

float neonRun(vec2 uv, float phase) {
  float r = fract(uTime * 0.085 + phase * 13.0) / 0.4;
  if (r >= 1.0) return 0.0;
  // edge distance and perimeter position in print-width units (16:9 print)
  float ex = min(uv.x, 1.0 - uv.x);
  float ey = min(uv.y, 1.0 - uv.y) * 0.5625;
  float ed = min(ex, ey);
  float s;
  if (ey < ex) s = uv.y < 0.5 ? uv.x : 1.5625 + (1.0 - uv.x);
  else s = uv.x > 0.5 ? 1.0 + uv.y * 0.5625 : 2.5625 + (1.0 - uv.y) * 0.5625;
  s /= 3.125;
  float d = r * 1.35 - s;
  if (d > 1.0) d -= 1.0;
  float tail = d >= 0.0 && d < 0.5 ? pow(1.0 - d / 0.5, 2.0) : 0.0;
  float env = sin(3.14159 * r);
  float core = 1.0 - smoothstep(0.003, 0.011, ed);
  float glow = exp(-ed * 45.0);
  return env * (tail * (core * 1.6 + glow * 0.55) + glow * 0.1);
}

void main() {
  vec2 uv = clamp(vUv, vec2(0.004), vec2(0.996));
  vec2 a = vec2((vCell.x + uv.x) / uGrid.x, 1.0 - (vCell.y + 1.0 - uv.y) / uGrid.y);
  vec3 c = texture2D(uAtlas, a).rgb;
  if (vVid > -0.5) {
    int s = int(vVid + 0.5);
    float ready = s < 4 ? uVidReadyA[s] : uVidReadyB[s - 4];
    if (ready > 0.0) {
      vec2 vc = vec2(mod(float(s), 4.0), floor(float(s) / 4.0));
      vec2 va = vec2((vc.x + uv.x) / 4.0, 1.0 - (vc.y + 1.0 - uv.y) / 2.0);
      c = mix(c, texture2D(uVid, va).rgb, ready);
    }
  }
  c *= vShade.x;
  // floor: glossy dark stone — the image only as a faint reflection-like tint
  if (vShade.y > 1.5) c = mix(uFog, c, 0.28);
  c = mix(c, uLight, vGlow * 0.16);
  // 1px-ish dark mat around each print
  vec2 e = min(vUv, 1.0 - vUv);
  float mat = smoothstep(0.0, 0.012, min(e.x, e.y * 1.78));
  c *= mix(0.25, 1.0, mat);
  float fog = smoothstep(uFogNear, uFogFar, vDepth);
  c = mix(c, uFog, fog);
  if (vNeon > -0.5 && uNeonAmt > 0.0) {
    float n = neonRun(vUv, vNeon) * uNeonAmt * (1.0 - fog * 0.6);
    c += uNeon * n + vec3(0.6) * n * n * 0.25;
  }
  gl_FragColor = vec4(c, uOpacity);
  #include <colorspace_fragment>
}
`;

// the room itself: dark panels with a faint joint grid whose cells frame the prints, so the closed
// back of the hall reads as a room (aGrid = surface coordinates in cell units)
export const shellVert = /* glsl */ `
attribute vec2 aGrid;
uniform float uPortalZ;
varying vec2 vGrid;
varying float vDepth;
varying float vGlow;
void main() {
  vGrid = aGrid;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  vGlow = smoothstep(9.0, 0.0, abs(position.z - uPortalZ));
  gl_Position = projectionMatrix * mv;
}
`;

export const shellFrag = /* glsl */ `
uniform vec3 uFog;
uniform vec3 uLight;
uniform vec3 uBase;
uniform vec3 uLine;
uniform float uFogNear;
uniform float uFogFar;
uniform float uOpacity;
varying vec2 vGrid;
varying float vDepth;
varying float vGlow;
void main() {
  // vGrid is in cell units: joints at integers, each cell framing one print slot
  vec2 g = vGrid;
  vec2 w = fwidth(g);
  vec2 f = abs(fract(g + 0.5) - 0.5) / max(w, vec2(1e-4));
  float line = 1.0 - min(min(f.x, f.y), 1.0);
  // fade the lines where they get sub-pixel (no moiré down the hall)
  line *= 1.0 - smoothstep(0.08, 0.3, max(w.x, w.y));
  vec3 c = mix(uBase, uLine, line);
  c = mix(c, uLight, vGlow * 0.12);
  float fog = smoothstep(uFogNear, uFogFar, vDepth);
  c = mix(c, uFog, fog);
  gl_FragColor = vec4(c, uOpacity);
  #include <colorspace_fragment>
}
`;

export const portalFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uGlow;
varying vec2 vUv;
void main() {
  // flat paper with a soft bright rim while it is still far away
  vec2 e = min(vUv, 1.0 - vUv);
  float rim = 1.0 - smoothstep(0.0, 0.08, min(e.x, e.y));
  vec3 c = uColor + rim * uGlow * 0.08;
  gl_FragColor = vec4(c, uOpacity);
  #include <colorspace_fragment>
}
`;

export const basicVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const haloFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float a = pow(max(0.0, 1.0 - d), 2.2);
  gl_FragColor = vec4(uColor, a * uOpacity);
  #include <colorspace_fragment>
}
`;

export const dustVert = /* glsl */ `
attribute float aSeed;
uniform float uTime;
uniform float uPixelRatio;
uniform float uLen;
varying float vA;
void main() {
  vec3 p = position;
  p.y += sin(uTime * 0.2 + aSeed * 40.0) * 0.08;
  p.x += cos(uTime * 0.15 + aSeed * 23.0) * 0.06;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float d = -mv.z;
  vA = smoothstep(0.4, 2.0, d) * (1.0 - smoothstep(10.0, 22.0, d));
  gl_PointSize = (1.2 + aSeed * 2.4) * uPixelRatio * (6.0 / max(d, 0.5));
  gl_Position = projectionMatrix * mv;
}
`;

export const dustFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vA * uOpacity;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor, a);
  #include <colorspace_fragment>
}
`;
