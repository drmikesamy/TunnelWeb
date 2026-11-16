export type WindowKind = 'contacts' | 'conversation' | 'call';

export interface DesktopWindow {
  id: string; // `${kind}:${refId}`
  kind: WindowKind;
  refId: string;
  x: number;
  y: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
}

class WindowStore {
  list = $state<DesktopWindow[]>([]);
  focusedId = $state<string | null>(null);
  #z = 10;
  #cascade = 0;

  get(id: string) {
    return this.list.find((w) => w.id === id);
  }

  isOpen(kind: WindowKind, refId: string) {
    return !!this.get(`${kind}:${refId}`);
  }

  open(kind: WindowKind, refId = '', pos?: { x: number; y: number }) {
    const id = `${kind}:${refId}`;
    if (!this.get(id)) {
      const step = (this.#cascade++ % 6) * 28;
      this.list.push({ id, kind, refId, x: pos?.x ?? 340 + step, y: pos?.y ?? 40 + step, z: 0, minimized: false, maximized: false });
    }
    this.focus(id);
  }

  /** Open without stealing focus (used when a message pops a window open). */
  openInBackground(kind: WindowKind, refId = '') {
    const previous = this.focusedId;
    this.open(kind, refId);
    if (previous && previous !== `${kind}:${refId}`) this.focus(previous);
  }

  focus(id: string) {
    const w = this.get(id);
    if (!w) return;
    w.z = ++this.#z;
    w.minimized = false;
    this.focusedId = id;
  }

  toggleMaximize(id: string) {
    const w = this.get(id);
    if (!w) return;
    w.maximized = !w.maximized;
    this.focus(id);
  }

  minimize(id: string) {
    const w = this.get(id);
    if (w) w.minimized = true;
    if (this.focusedId === id) this.focusedId = null;
  }

  /** Taskbar click: focus, or minimize if already focused. */
  toggle(id: string) {
    const w = this.get(id);
    if (!w) return;
    if (this.focusedId === id && !w.minimized) this.minimize(id);
    else this.focus(id);
  }

  close(id: string) {
    this.list = this.list.filter((w) => w.id !== id);
    if (this.focusedId === id) this.focusedId = null;
  }
}

export const windows = new WindowStore();
