// Decoder budget: at most 2 playing videos and 3 holding a src, page-wide.
// Clients are DOM <video> elements and the videos behind GL VideoTextures.
export type VideoPriority = 0 | 1 | 2; // 0 = active, 1 = next, 2 = other
type Want = "play" | "load" | "none";

type Entry = { el: HTMLVideoElement; src: string; priority: VideoPriority; want: Want; order: number };

const MAX_PLAYING = 2;
const MAX_SRC = 3;

class VideoPool {
  private entries = new Map<HTMLVideoElement, Entry>();
  private seq = 0;
  private scheduled = false;

  /** Ask for a video to be loaded or played. Call again whenever priority / want change. */
  request(el: HTMLVideoElement, src: string, want: Want, priority: VideoPriority = 2) {
    const prev = this.entries.get(el);
    this.entries.set(el, { el, src, want, priority, order: prev?.order ?? this.seq++ });
    this.schedule();
  }

  release(el: HTMLVideoElement) {
    if (!this.entries.has(el)) return;
    this.entries.delete(el);
    this.unload(el);
  }

  get stats() {
    let playing = 0;
    let withSrc = 0;
    for (const { el } of this.entries.values()) {
      if (!el.paused) playing++;
      if (el.getAttribute("src")) withSrc++;
    }
    return { playing, withSrc, registered: this.entries.size };
  }

  private schedule() {
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      this.apply();
    });
  }

  private unload(el: HTMLVideoElement) {
    if (!el.getAttribute("src")) return;
    el.pause();
    el.removeAttribute("src");
    el.load();
  }

  private apply() {
    const wanted = [...this.entries.values()]
      .filter((e) => e.want !== "none")
      .sort((a, b) => a.priority - b.priority || (a.want === "play" ? -1 : 1) - (b.want === "play" ? -1 : 1) || a.order - b.order);
    const keep = new Set(wanted.slice(0, MAX_SRC).map((e) => e.el));
    let playing = 0;
    for (const e of this.entries.values()) {
      if (!keep.has(e.el)) {
        this.unload(e.el);
        continue;
      }
      if (e.el.getAttribute("src") !== e.src) e.el.setAttribute("src", e.src);
    }
    for (const e of wanted) {
      if (!keep.has(e.el)) continue;
      if (e.want === "play" && playing < MAX_PLAYING) {
        playing++;
        if (e.el.paused) e.el.play().catch(() => {});
      } else if (!e.el.paused) {
        e.el.pause();
      }
    }
  }
}

export const videoPool = new VideoPool();
