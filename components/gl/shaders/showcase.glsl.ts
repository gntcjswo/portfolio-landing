// C05 Showcase: a tall capture scrolled inside a window plane that bends with scroll velocity; the
// next capture slides over it from below (parallax: the outgoing page drifts up and darkens under a
// soft contact shadow, the incoming one travels slower than its edge and settles from a slight zoom).
export const showcaseVert = /* glsl */ `
uniform float uBend;
uniform float uDepth;   // plane height in world units (bend scales with it)
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  float y = uv.y - 0.5;
  p.z -= uBend * y * y * 2.0 * uDepth;
  p.y *= 1.0 - abs(uBend) * 0.04;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

export const showcaseFrag = /* glsl */ `
uniform sampler2D uMapA;
uniform sampler2D uMapA2;
uniform sampler2D uMapB;
uniform sampler2D uMapB2;
uniform float uSplitA;
uniform float uSplitB;
uniform float uOffsetA;
uniform float uWinA;
uniform float uWinB;
uniform float uTransition; // eased 0..1
uniform float uOpacity;
uniform vec2 uSize;
varying vec2 vUv;

vec3 capture(sampler2D top, sampler2D bottom, float split, float ty, float x) {
  // ty: 0 = top of the full capture; textures are flipY (v = 1 is the image top)
  vec3 a = texture2D(top, vec2(x, 1.0 - clamp(ty / split, 0.0, 1.0))).rgb;
  vec3 b = texture2D(bottom, vec2(x, 1.0 - clamp((ty - split) / max(1.0 - split, 1e-4), 0.0, 1.0))).rgb;
  return mix(a, b, step(split, ty));
}

void main() {
  float t = uTransition;
  float ty = 1.0 - vUv.y;          // 0 = top of the window
  float edgeY = 1.0 - t;           // incoming page's top edge

  // outgoing: drifts up by 18% of the window and darkens toward the edge
  float tyA = min(ty + 0.18 * t, 1.0);
  vec3 a = capture(uMapA, uMapA2, uSplitA, uOffsetA + tyA * uWinA, vUv.x);
  float shade = 0.55 * t + 0.35 * (1.0 - smoothstep(0.0, 0.12, edgeY - ty)) * step(0.001, t);
  a *= 1.0 - shade;

  // incoming: lags its edge by 35% (parallax) and settles from a 6% zoom
  float k = 1.0 - 0.06 * (1.0 - t);
  float tyB = max(ty - 0.35 * (1.0 - t), 0.0);
  vec2 bUv = vec2(0.5 + (vUv.x - 0.5) * k, 0.5 + (tyB - 0.5) * k);
  vec3 b = capture(uMapB, uMapB2, uSplitB, clamp(bUv.y, 0.0, 1.0) * uWinB, bUv.x);

  float inB = step(edgeY, ty) * step(0.001, t);
  vec3 c = mix(a, b, inB);
  // hairline highlight on the incoming edge
  c = mix(c, vec3(1.0), 0.18 * inB * (1.0 - smoothstep(0.0, 1.5, (ty - edgeY) * uSize.y)));

  vec2 p = vUv * uSize;
  vec2 q = min(p, uSize - p);
  float rad = 8.0;
  vec2 cq = max(vec2(rad) - q, 0.0);
  float corner = 1.0 - smoothstep(rad - 0.75, rad + 0.25, length(cq));
  gl_FragColor = vec4(c, uOpacity * corner);
  #include <colorspace_fragment>
}
`;
