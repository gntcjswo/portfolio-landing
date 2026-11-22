// C04 DOM ↔ Index scene bridge: filter state flows to GL, pointer + picks flow back to the DOM.
type Pointer = { x: number; y: number; inside: boolean; moved: number };

class IndexBus {
  filter: string | null = null;
  filterVersion = 0;
  pointer: Pointer = { x: -1e4, y: -1e4, inside: false, moved: 0 };
  /** work id under the pointer (set by the scene), -1 = none */
  hover = -1;
  /** set by the Index scene: request a GL frame (the canvas renders on demand) */
  wake: () => void = () => {};
  private openFns = new Set<(id: number) => void>();
  private hoverFns = new Set<(id: number) => void>();

  setFilter(f: string | null) {
    if (f === this.filter) return;
    this.filter = f;
    this.filterVersion++;
    this.wake();
  }

  setPointer(x: number, y: number, inside: boolean) {
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.inside = inside;
    this.pointer.moved = performance.now();
    this.wake();
  }

  setHover(id: number) {
    if (id === this.hover) return;
    this.hover = id;
    this.hoverFns.forEach((f) => f(id));
  }

  pick() {
    if (this.hover >= 0) this.openFns.forEach((f) => f(this.hover));
  }

  onOpen(fn: (id: number) => void) {
    this.openFns.add(fn);
    return () => void this.openFns.delete(fn);
  }

  onHover(fn: (id: number) => void) {
    this.hoverFns.add(fn);
    return () => void this.hoverFns.delete(fn);
  }
}

export const indexBus = new IndexBus();
