import { coverUvGlsl } from "@/lib/cover";
// C04 Index wall. Instanced tiles sampling one 13×13 atlas.
export const indexVert = /* glsl */ `
attribute vec2 aCell;   // atlas column, row (row 0 = top of the image)
attribute vec4 aState;  // dim, alpha, hover, picked (C04 → C05 hand-off)
attribute vec2 aSize;   // tile size in CSS px (lens / corners / cover crop)
varying vec2 vUv;
varying vec2 vCell;
varying vec4 vState;
varying vec2 vSize;
void main() {
  vUv = uv;
  vCell = aCell;
  vState = aState;
  vSize = aSize;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}
`;

export const indexFrag = /* glsl */ `
uniform sampler2D uAtlas;
uniform vec2 uGrid;
uniform vec3 uLens;      // centre (drawing-buffer px), radius (drawing-buffer px)
uniform float uLensOn;
uniform float uDpr;
uniform float uClipTop;  // drawing-buffer y above which tiles fade out (wall top)
uniform vec3 uPaper;
uniform vec3 uInk;
uniform vec3 uSignal;
// pf-000 shows its own full-page capture (C05's first frame) instead of the 16:9 atlas cell:
// width-fit, top-aligned, exactly as Showcase draws it, so the hand-off is a straight swap
uniform sampler2D uPick;
uniform float uPickOn;
uniform float uPickAspect; // capture width / height
uniform float uPickRad;    // corner radius in px for pf-000 (grows to Showcase's 8px on arrival)
varying vec2 vUv;
varying vec2 vCell;
varying vec4 vState;
varying vec2 vSize;

vec3 cell(vec2 uv) {
  uv = clamp(uv, vec2(0.004), vec2(0.996));
  vec2 a = vec2((vCell.x + uv.x) / uGrid.x, 1.0 - (vCell.y + 1.0 - uv.y) / uGrid.y);
  return texture2D(uAtlas, a).rgb;
}

void main() {
  float alpha = vState.y;
  if (alpha < 0.003) discard;
  float clip = max(smoothstep(uClipTop, uClipTop - 28.0 * uDpr, gl_FragCoord.y), step(0.001, vState.w));
  if (clip < 0.003) discard;

  bool pk = uPickOn > 0.5 && vCell.x < 0.5 && vCell.y < 0.5;
  float box = vSize.x / max(vSize.y, 1.0);

  // lens: barrel magnification toward the pointer + RGB split
  vec2 d = uLens.xy - gl_FragCoord.xy;
  float r = length(d) / uLens.z;
  float k = uLensOn * (1.0 - smoothstep(0.0, 1.0, r));
  vec2 px = vSize * uDpr;
  vec2 lo = d / px * 0.18 * k * k;
  vec2 split = (r > 0.0001 ? normalize(d) : vec2(0.0)) * 1.5 * uDpr * k / px;

  vec3 c;
  if (pk) {
    vec2 u = clamp(vUv + lo, 0.0, 1.0);
    // top-aligned cover: a tall capture shows its top (f < 1); a capture wider than the tile is cropped in x
    float f = min(1.0, uPickAspect / box);
    float fx = min(1.0, box / uPickAspect);
    vec2 a = vec2(0.5 + (u.x - 0.5) * fx, 1.0 - (1.0 - u.y) * f);
    c = texture2D(uPick, a).rgb;
  } else {
    // cover crop: atlas cells are 16:9
    vec2 uv = vUv;
    float img = 16.0 / 9.0;
    if (box < img) uv.x = 0.5 + (uv.x - 0.5) * box / img;
    else uv.y = 0.5 + (uv.y - 0.5) * img / box;
    uv += lo;
    c = vec3(cell(uv + split).r, cell(uv).g, cell(uv - split).b);
  }

  float dim = vState.x;
  float g = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(c, vec3(g), dim);
  c = mix(c, uPaper, 0.68 * dim);

  // 2px rounded corners + 1px ink outline on hover
  vec2 p = vUv * vSize;
  vec2 q = min(p, vSize - p);
  float rad = pk ? uPickRad : 2.0;
  vec2 cq = max(vec2(rad) - q, 0.0);
  float corner = 1.0 - smoothstep(rad - 0.75, rad + 0.25, length(cq));
  float edge = 1.0 - smoothstep(0.6, 1.4, min(q.x, q.y));
  c = mix(c, uInk, edge * vState.z);
  // picked: 3px signal frame that draws itself around the tile (clockwise from top-left)
  float ring = 1.0 - smoothstep(2.4, 3.4, min(q.x, q.y));
  vec2 c0 = vUv - 0.5;
  float ang = fract(atan(-c0.x, c0.y) / 6.28318 + 0.875);
  float drawn = step(ang, vState.w * 1.02);
  c = mix(c, uSignal, ring * drawn * step(0.01, vState.w));

  gl_FragColor = vec4(c, alpha * corner * clip);
  #include <colorspace_fragment>
}
`;

export const lensVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const lensFrag = /* glsl */ `
uniform sampler2D uVideo;
uniform float uOpacity;
uniform vec2 uSize;
uniform float uVideoAspect; // video width / height (from loadedmetadata; 16:9 until known)
varying vec2 vUv;
${coverUvGlsl}
void main() {
  vec2 p = vUv * uSize;
  vec2 q = min(p, uSize - p);
  float rad = 6.0;
  vec2 cq = max(vec2(rad) - q, 0.0);
  float corner = 1.0 - smoothstep(rad - 0.75, rad + 0.25, length(cq));
  // cover: the clip fills the tile edge to edge whatever its aspect (cropped, never stretched)
  vec3 c = texture2D(uVideo, coverUv(vUv, uSize.x / max(uSize.y, 1.0), uVideoAspect)).rgb;
  gl_FragColor = vec4(c, uOpacity * corner);
  #include <colorspace_fragment>
}
`;
