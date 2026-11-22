// Layers (C03). Four planes share one capture texture "window"
// (uScrollY + uv.y·uWindow, texture y down). The SEO/AEO cell analysis (luminance variance per
// 40px cell, 3+ cell runs) is done once on the CPU into a 12×rows data texture (uCells):
//   r = content cell, g = part of an answer run, b = run start (col·20/255), a = run length (len·20/255)
export const layersVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const common = /* glsl */ `
varying vec2 vUv;
uniform float uScrollY;
uniform float uWindow;
uniform float uReveal;
uniform float uOpacity;
uniform float uFill;
uniform vec3 uInk;
uniform vec3 uPaper;
uniform vec3 uTint;
uniform sampler2D uCells;
uniform vec2 uCellGrid;

float texY() { return uScrollY + (1.0 - vUv.y) * uWindow; }

// 1px hairline around the plane, in screen pixels
float border(float px) {
  vec2 fw = fwidth(vUv);
  vec2 e = min(vUv, 1.0 - vUv) / max(fw, vec2(1e-5));
  return 1.0 - smoothstep(px - 0.5, px + 0.5, min(e.x, e.y));
}

vec4 over(vec4 dst, vec3 c, float a) { return vec4(mix(dst.rgb, c, a), a + dst.a * (1.0 - a)); }
`;

/** L0 · 원본: capture window (+ desaturate when exploded, crossfade to the C04 tile thumbnail). */
export const layer0Frag = /* glsl */ `
${common}
uniform sampler2D uMap;
uniform sampler2D uThumb;
uniform float uDesat;
uniform float uThumbMix;
uniform vec2 uThumbScale;
void main() {
  vec4 c = texture2D(uMap, vec2(vUv.x, 1.0 - texY()));
  float g = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  c.rgb = mix(c.rgb, vec3(g), uDesat);
  vec3 th = texture2D(uThumb, (vUv - 0.5) * uThumbScale + 0.5).rgb;
  c.rgb = mix(c.rgb, th, uThumbMix);
  c.rgb = mix(c.rgb, uInk, border(1.0) * 0.18 * (1.0 - uThumbMix));
  gl_FragColor = vec4(c.rgb, uOpacity);
  #include <colorspace_fragment>
}
`;

/** L1 · SEO "구조": outlines of content cells + 12-column guides, drawn top → bottom. */
export const layer1Frag = /* glsl */ `
${common}
void main() {
  float ty = texY();
  vec2 cg = vec2(vUv.x * uCellGrid.x, ty * uCellGrid.y);
  vec2 ci = floor(cg);
  vec2 cf = fract(cg);
  vec4 cell = texture2D(uCells, (ci + 0.5) / uCellGrid);
  vec2 fw = max(fwidth(cg), vec2(1e-5));
  vec2 e = min(cf, 1.0 - cf) / fw;
  float edge = 1.0 - smoothstep(0.6, 1.8, min(e.x, e.y));
  float a = edge * cell.r * 0.85;
  float gx = abs(fract(vUv.x * 12.0 + 0.5) - 0.5) / max(fwidth(vUv.x * 12.0), 1e-5);
  a = max(a, (1.0 - smoothstep(0.0, 1.0, gx)) * 0.2);
  a *= step(1.0 - vUv.y, uReveal) * step(ty, 1.0);
  vec4 o = vec4(uPaper, uFill);
  o = over(o, uInk, border(1.0) * 0.35 * uFill / 0.3);
  o = over(o, uInk, a);
  gl_FragColor = vec4(o.rgb, o.a * uOpacity);
  #include <colorspace_fragment>
}
`;

/** L2 · AEO "답": rounded marker bars over 3+ cell runs; reveal sweeps left → right, staggered by row. */
export const layer2Frag = /* glsl */ `
${common}
float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
void main() {
  float ty = texY();
  vec2 cg = vec2(vUv.x * uCellGrid.x, ty * uCellGrid.y);
  vec2 ci = floor(cg);
  vec2 cf = fract(cg);
  vec4 cell = texture2D(uCells, (ci + 0.5) / uCellGrid);
  vec4 o = vec4(uPaper, uFill);
  o = over(o, uInk, border(1.0) * 0.35 * uFill / 0.3);
  if (cell.g > 0.5 && ty <= 1.0) {
    float start = floor(cell.b * 255.0 / 20.0 + 0.5);
    float len = floor(cell.a * 255.0 / 20.0 + 0.5);
    float rowY = clamp(((ci.y + 0.5) / uCellGrid.y - uScrollY) / uWindow, 0.0, 1.0);
    float lr = clamp(uReveal * 1.6 - rowY * 0.6, 0.0, 1.0);
    float x0 = start + 0.15;
    float x1 = mix(x0 + 0.01, start + len - 0.15, lr);
    vec2 p = vec2(cg.x, cf.y);
    vec2 c = vec2((x0 + x1) * 0.5, 0.5);
    vec2 hb = vec2((x1 - x0) * 0.5, 0.275);
    float d = sdRoundBox(p - c, hb, min(0.275, hb.x));
    float aa = max(fwidth(cg.x), 1e-4);
    float a = (1.0 - smoothstep(-aa, aa, d)) * step(0.001, lr) * 0.8;
    o = over(o, uTint, a);
  }
  gl_FragColor = vec4(o.rgb, o.a * uOpacity);
  #include <colorspace_fragment>
}
`;

/** L3 · GEO "엔티티": transparent plane with an entity-colour hairline; nodes/lines are separate draws. */
export const layer3Frag = /* glsl */ `
${common}
void main() {
  vec4 o = vec4(uPaper, uFill * 0.6);
  o = over(o, uTint, border(1.2) * 0.8 * uFill / 0.3);
  gl_FragColor = vec4(o.rgb, o.a * uOpacity);
  #include <colorspace_fragment>
}
`;

export const nodesVert = /* glsl */ `
attribute float aIndex;
uniform float uNodes;
uniform float uSize;
uniform float uPixelRatio;
varying float vOn;
void main() {
  vOn = clamp(uNodes - aIndex, 0.0, 1.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = uSize * uPixelRatio * (0.4 + 0.6 * vOn);
}
`;

export const nodesFrag = /* glsl */ `
uniform vec3 uTint;
uniform float uOpacity;
varying float vOn;
void main() {
  float r = length(gl_PointCoord - 0.5);
  float core = 1.0 - smoothstep(0.2, 0.24, r);
  float halo = (1.0 - smoothstep(0.42, 0.5, r)) * 0.22;
  float a = max(core, halo) * vOn * uOpacity;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uTint, a);
  #include <colorspace_fragment>
}
`;

export const edgesVert = /* glsl */ `
attribute vec3 aA;
attribute vec3 aB;
attribute float aEnd;
attribute float aK;
uniform float uNodes;
varying float vOn;
void main() {
  float g = clamp(uNodes - aK, 0.0, 1.0);
  vOn = step(0.001, g);
  vec3 p = mix(aA, aB, aEnd * g);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

export const edgesFrag = /* glsl */ `
uniform vec3 uTint;
uniform float uOpacity;
varying float vOn;
void main() {
  if (vOn < 0.5) discard;
  gl_FragColor = vec4(uTint, 0.85 * uOpacity);
  #include <colorspace_fragment>
}
`;
