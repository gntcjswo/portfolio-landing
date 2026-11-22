// C00 boot progress, bound to real tasks only:
// Paperlogy 5Medium + 7Bold, the small work atlas, and the GL shader compile.
export type BootTask = "font5" | "font7" | "atlas" | "gl";
const TASKS: BootTask[] = ["font5", "font7", "atlas", "gl"];

const done = new Set<BootTask>();
const listeners = new Set<(p: number) => void>();
const finishListeners = new Set<() => void>();
let finished = false;
let finishedAt = 0;

export const boot = {
  get progress() {
    return done.size / TASKS.length;
  },
  get finished() {
    return finished;
  },
  /** performance.now() when the overlay started lifting (0 = not yet) */
  get finishedAt() {
    return finishedAt;
  },
  mark(t: BootTask) {
    if (done.has(t)) return;
    done.add(t);
    performance.mark("boot:" + t);
    const p = this.progress;
    listeners.forEach((l) => l(p));
  },
  onProgress(fn: (p: number) => void) {
    listeners.add(fn);
    fn(this.progress);
    return () => {
      listeners.delete(fn);
    };
  },
  finish() {
    if (finished) return;
    finished = true;
    finishedAt = performance.now();
    performance.mark("boot:finish");
    finishListeners.forEach((l) => l());
  },
  onFinish(fn: () => void) {
    if (finished) fn();
    else finishListeners.add(fn);
    return () => {
      finishListeners.delete(fn);
    };
  },
};
