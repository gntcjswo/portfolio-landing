// Cover-fit helpers shared by the GL scenes.
//
// three r0.187 allocates a non-video texture's GPU storage with texStorage2D at its FIRST upload;
// later uploads use texSubImage2D into that fixed size. Swapping a different-sized image/canvas into
// an existing Texture therefore fills only one corner (smaller) or fails (larger). Rules:
//   1. never reassign `texture.image` to a source of another size — dispose and create a new Texture;
//   2. a canvas used as a texture is sized once; sources are drawn into it with cover math;
//   3. when a source aspect may differ from the plane, the shader cover-crops with `coverUv`.

/** source rect that cover-crops a sw×sh source into a box of aspect `box` (= w / h), centred */
export function coverRect(sw: number, sh: number, box: number) {
  let w = sw;
  let h = sh;
  if (sw / sh > box) w = sh * box;
  else h = sw / box;
  return { sx: (sw - w) / 2, sy: (sh - h) / 2, sw: w, sh: h };
}

/** GLSL: cover-crop uv for a texture of aspect `tex` shown in a box of aspect `box` (both w / h) */
export const coverUvGlsl = /* glsl */ `
vec2 coverUv(vec2 uv, float box, float tex) {
  vec2 s = box > tex ? vec2(1.0, tex / box) : vec2(box / tex, 1.0);
  return (uv - 0.5) * s + 0.5;
}
`;

/** pixel size of a loaded texture source (image, canvas, video, ImageBitmap); 0×0 when unknown */
export function sourceSize(src: unknown): { w: number; h: number } {
  const s = src as { naturalWidth?: number; naturalHeight?: number; videoWidth?: number; videoHeight?: number; width?: number; height?: number } | null;
  if (!s) return { w: 0, h: 0 };
  const w = s.naturalWidth || s.videoWidth || s.width || 0;
  const h = s.naturalHeight || s.videoHeight || s.height || 0;
  return { w, h };
}
