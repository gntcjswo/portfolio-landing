/** Static-export-safe asset URL: relative to the HTML document, so `out/` works from any sub-folder. */
export const asset = (p: string) => "./" + p.replace(/^\.?\//, "");

export const pfThumb = (id: number) => asset(`media/img/pf16/p-${String(id).padStart(3, "0")}.jpg`);
export const pfImage = (id: number) => asset(`media/img/portfolio/pf-${String(id).padStart(3, "0")}.jpg`);
export const pfVideo = (id: number) => asset(`media/video/pf/p-${String(id).padStart(3, "0")}.mp4`);
