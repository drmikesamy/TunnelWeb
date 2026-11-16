/** Screen traits the layout adapts to. */
class Viewport {
  /** Phone-sized screen: windows go full screen and can't be dragged. */
  mobile = $state(false);
  /** No hover (touch screens): single tap opens things instead of double-click. */
  touch = $state(false);

  constructor() {
    this.#watch('(max-width: 700px)', (v) => (this.mobile = v));
    this.#watch('(hover: none)', (v) => (this.touch = v));
  }

  #watch(query: string, set: (matches: boolean) => void) {
    const mq = window.matchMedia(query);
    set(mq.matches);
    mq.addEventListener('change', (e) => set(e.matches));
  }
}

export const viewport = new Viewport();
