import { coverUvGlsl } from "@/lib/cover";
import { simplex3 } from "./noise.glsl";

// C07-A Generator: input stills fly into a 9:16 output frame, cycle, then
// dissolve into the output video through scan-line noise.
export const genVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const inputFrag = /* glsl */ `
uniform sampler2D uMap;
uniform float uOpacity;
uniform vec2 uSize;
uniform float uMapAspect; // image width / height (measured after load)
varying vec2 vUv;
${coverUvGlsl}
void main() {
  vec2 p = vUv * uSize;
  vec2 q = min(p, uSize - p);
  float rad = 4.0;
  vec2 cq = max(vec2(rad) - q, 0.0);
  float corner = 1.0 - smoothstep(rad - 0.75, rad + 0.25, length(cq));
  gl_FragColor = vec4(texture2D(uMap, coverUv(vUv, uSize.x / max(uSize.y, 1.0), uMapAspect)).rgb, uOpacity * corner);
  #include <colorspace_fragment>
}
`;

export const frameFrag = /* glsl */ `
uniform sampler2D uS0;
uniform sampler2D uS1;
uniform sampler2D uS2;
uniform sampler2D uS3;
uniform sampler2D uS4;
uniform sampler2D uVideo;
uniform float uVideoOn;
uniform float uGen;
uniform float uFill;
uniform float uTime;
uniform vec2 uSize;
uniform vec3 uBase;
uniform vec3 uSeam;
varying vec2 vUv;
${simplex3}

/** cover: texture of aspect src shown in a box of aspect dst (both w / h) */
vec2 coverFit(vec2 uv, float src, float dst) {
  return src > dst
    ? vec2(0.5 + (uv.x - 0.5) * dst / src, uv.y)
    : vec2(uv.x, 0.5 + (uv.y - 0.5) * src / dst);
}

uniform float uVideoAspect;
uniform float uStillAspect; // stills width / height (480² → 1), measured after load

vec3 still(float k, vec2 uv) {
  // stills cover-cropped into the frame (9:16), whatever their own aspect
  vec2 s = coverFit(uv, uStillAspect, uSize.x / max(uSize.y, 1.0));
  vec3 c = texture2D(uS0, s).rgb;
  c = mix(c, texture2D(uS1, s).rgb, step(0.5, k));
  c = mix(c, texture2D(uS2, s).rgb, step(1.5, k));
  c = mix(c, texture2D(uS3, s).rgb, step(2.5, k));
  c = mix(c, texture2D(uS4, s).rgb, step(3.5, k));
  return c;
}


void main() {
  float k = mod(floor(uGen * 10.0), 5.0);
  vec3 s = still(k, vUv);
  vec3 v = uVideoOn > 0.5 ? texture2D(uVideo, coverFit(vUv, uVideoAspect, uSize.x / max(uSize.y, 1.0))).rgb : s;

  float n = snoise(vec3(vUv.x * 4.0, vUv.y * 40.0, uTime * 0.35)) * 0.5 + 0.5;
  float th = clamp((uGen - 0.5) * 2.0, 0.0, 1.0) * 1.04 - 0.02;
  float m = step(n, th);
  vec3 c = mix(s, v, m);
  float live = step(0.001, th) * step(th, 0.999);
  c = mix(c, uSeam, (1.0 - smoothstep(0.0, 0.018, abs(n - th))) * live);

  // scan lines while generating
  float gen = step(0.001, uGen) * step(uGen, 0.999);
  c *= 1.0 - 0.08 * gen * (0.5 + 0.5 * sin(vUv.y * uSize.y * 1.6));
  c = mix(uBase, c, uFill);

  vec2 p = vUv * uSize;
  vec2 q = min(p, uSize - p);
  float rad = 10.0;
  vec2 cq = max(vec2(rad) - q, 0.0);
  float corner = 1.0 - smoothstep(rad - 0.75, rad + 0.25, length(cq));
  gl_FragColor = vec4(c, corner);
  #include <colorspace_fragment>
}
`;
