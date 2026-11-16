<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Aero glass window chrome, hand-built in CSS: a blurred translucent pane with
   * light streaks and glowing edges. The caption buttons are CSS orbs (see .orb
   * in theme.css) with SVG glyphs on top. Only draws the chrome. Dragging and focus are handled by
   * Window.svelte. `.fc-titlebar` is the drag handle and `.fc-controls` is
   * excluded from dragging.
   */
  let {
    title,
    active = true,
    width,
    height,
    shaking = false,
    fill = false,
    maximized = false,
    onminimize,
    onmaximize,
    onclose,
    children,
  }: {
    title: string;
    active?: boolean;
    width?: number;
    height?: number;
    shaking?: boolean;
    fill?: boolean; // stretch to the parent (maximised / phone)
    maximized?: boolean;
    onminimize?: () => void;
    onmaximize?: () => void;
    onclose?: () => void;
    children: Snippet;
  } = $props();
</script>

<div
  class="frame"
  class:active
  class:shaking
  class:fill
  style:width={width ? `${width}px` : undefined}
  style:height={height ? `${height}px` : undefined}
>
  <!-- Decorative reflections on the glass. -->
  <div class="sheen" aria-hidden="true"></div>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fc-titlebar" ondblclick={(e) => !(e.target as HTMLElement).closest('.fc-controls') && onmaximize?.()}>
    <span class="title">{title}</span>
    <div class="fc-controls">
      {#if onminimize}
        <button class="cap orb" aria-label="Minimize" onclick={onminimize}>
          <svg viewBox="0 0 10 10" aria-hidden="true"><rect x="1" y="6.5" width="8" height="2.2" /></svg>
        </button>
      {/if}
      {#if onmaximize}
        <button class="cap orb" aria-label={maximized ? 'Restore' : 'Maximize'} onclick={onmaximize}>
          {#if maximized}
            <svg viewBox="0 0 10 10" aria-hidden="true">
              <path d="M3 1h6v6H7.4V2.6H3z" />
              <path d="M1 3h6v6H1zm1.4 2.2v2.4h3.2V5.2z" fill-rule="evenodd" />
            </svg>
          {:else}
            <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1h8v8H1zm1.5 2.4v4.1h5V3.4z" fill-rule="evenodd" /></svg>
          {/if}
        </button>
      {/if}
      {#if onclose}
        <button class="cap orb red" aria-label="Close" onclick={onclose}>
          <svg viewBox="0 0 10 10" aria-hidden="true">
            <path d="M1.6 0.4 5 3.8 8.4 0.4 9.6 1.6 6.2 5l3.4 3.4-1.2 1.2L5 6.2 1.6 9.6 0.4 8.4 3.8 5 0.4 1.6z" />
          </svg>
        </button>
      {/if}
    </div>
  </div>
  <div class="body">
    {@render children()}
  </div>
</div>

<style>
  /* ---- Glass pane ---------------------------------------------------------- */
  .frame {
    --frame-radius: 9px;
    position: relative;
    isolation: isolate;
    display: flex;
    flex-direction: column;
    max-width: 100%;
    padding: 0 8px 8px;
    border-radius: var(--frame-radius);
    color: var(--ink);
    font: 9pt 'Segoe UI', 'Noto Sans', sans-serif;
    /* Mostly clear glass with a faint icy tint; the blur does the frosting. */
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.22) 60px, rgba(255, 255, 255, 0.3)),
      linear-gradient(135deg, rgba(210, 248, 255, 0.35), rgba(0, 222, 221, 0.12) 55%, rgba(69, 226, 184, 0.18));
    backdrop-filter: blur(16px) saturate(1.7) brightness(1.08);
    -webkit-backdrop-filter: blur(16px) saturate(1.7) brightness(1.08);
    border: 1px solid rgba(20, 50, 60, 0.55); /* dark outer edge */
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.75), /* bright inner rim */
      inset 0 1px 0 1px rgba(255, 255, 255, 0.5),
      0 14px 38px rgba(0, 40, 50, 0.35),
      0 2px 8px rgba(0, 40, 50, 0.25);
    transition:
      box-shadow 0.25s,
      background 0.25s;
  }
  .frame.active {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.2) 60px, rgba(255, 255, 255, 0.28)),
      linear-gradient(135deg, rgba(200, 248, 255, 0.45), rgba(0, 222, 221, 0.24) 55%, rgba(69, 226, 184, 0.28));
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.85),
      inset 0 1px 0 1px rgba(255, 255, 255, 0.6),
      0 0 22px rgba(0, 222, 221, 0.35), /* soft aqua halo when focused */
      0 18px 48px rgba(0, 40, 50, 0.42),
      0 2px 10px rgba(0, 40, 50, 0.3);
  }
  .frame:not(.active) .title {
    opacity: 0.75;
  }
  .frame.fill {
    width: 100%;
    height: 100%;
    --frame-radius: 0px;
  }

  /* ---- Sheen: Aero's diagonal light streaks + a glossy top band ------------ */
  .sheen {
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    pointer-events: none;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.08) 16px, transparent 30px),
      linear-gradient(
        112deg,
        transparent 0 22%,
        rgba(255, 255, 255, 0.28) 24%,
        rgba(255, 255, 255, 0.06) 30%,
        transparent 34% 52%,
        rgba(255, 255, 255, 0.18) 54%,
        transparent 59% 74%,
        rgba(255, 255, 255, 0.12) 76%,
        transparent 80%
      );
  }

  /* ---- Title bar ----------------------------------------------------------- */
  .fc-titlebar {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    height: 30px;
    padding-left: 4px;
    cursor: grab;
    user-select: none;
  }
  .title {
    flex: 1;
    min-width: 0;
    padding-top: 7px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 9.5pt;
    color: #062830;
    /* Vista-style glow so the title reads on any background. */
    text-shadow:
      0 0 10px #fff,
      0 0 6px #fff,
      0 0 3px #fff;
  }

  /* ---- Caption buttons: CSS orbs with SVG glyphs ------------------------- */
  .fc-controls {
    display: flex;
    gap: 5px;
    padding: 6px 1px 0 0;
  }
  .cap {
    width: 19px;
    height: 19px;
    cursor: pointer;
    transition: filter 0.15s;
  }
  .cap svg {
    width: 9px;
    height: 9px;
    fill: #fff;
  }
  .cap:hover {
    filter: brightness(1.12) drop-shadow(0 0 4px rgba(255, 255, 255, 0.95));
  }
  .cap:active {
    filter: brightness(0.88);
  }
  .cap:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 1px;
  }
  /* Unfocused windows: grey orbs until hovered, like the glass they sit on. */
  .frame:not(.active) .cap:not(:hover) {
    --rim: #868c93;
    --edge: #9aa1a8;
    --base: #b3b9bf;
    --glow: #dce1e5;
  }

  /* ---- Client area: the opaque content panel set into the glass ------------ */
  .body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 3px;
    border: 1px solid rgba(20, 50, 60, 0.5);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(232, 250, 240, 0.97));
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.6);
  }

  .shaking {
    animation: shake 0.5s ease-in-out;
  }
</style>
