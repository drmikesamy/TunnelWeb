<script lang="ts">
  import { untrack, type Snippet } from 'svelte';
  import { draggable } from '@neodrag/svelte';
  import { windows, type DesktopWindow } from '$lib/stores/windows.svelte';
  import { viewport } from '$lib/stores/viewport.svelte';
  import WindowFrame from './WindowFrame.svelte';

  let {
    win,
    title,
    width = 460,
    height = 520,
    shakeKey = 0,
    onclose,
    children,
  }: {
    win: DesktopWindow;
    title: string;
    width?: number;
    height?: number;
    shakeKey?: number; // bump to shake the window (nudge)
    onclose?: () => void;
    children: Snippet;
  } = $props();

  let shaking = $state(false);
  let lastShake = untrack(() => shakeKey);
  $effect(() => {
    if (shakeKey === lastShake) return;
    lastShake = shakeKey;
    shaking = true;
    const t = setTimeout(() => (shaking = false), 600);
    return () => clearTimeout(t);
  });

  const focused = $derived(windows.focusedId === win.id);
  // On phones every window is full screen; elsewhere only when maximised.
  const full = $derived(win.maximized || viewport.mobile);
</script>

<!-- Hidden (not unmounted) when minimized so position and state are kept. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="positioner"
  class:full
  style:z-index={win.z}
  style:display={win.minimized ? 'none' : 'block'}
  use:draggable={{
    handle: '.fc-titlebar',
    cancel: '.fc-controls',
    bounds: 'parent',
    defaultPosition: { x: win.x, y: win.y },
    disabled: full,
  }}
  onpointerdown={() => windows.focus(win.id)}
>
  <WindowFrame
    {title}
    width={full ? undefined : width}
    height={full ? undefined : height}
    fill={full}
    maximized={win.maximized}
    {shaking}
    active={focused}
    onminimize={() => windows.minimize(win.id)}
    onmaximize={viewport.mobile ? undefined : () => windows.toggleMaximize(win.id)}
    onclose={() => (onclose ? onclose() : windows.close(win.id))}
  >
    {@render children()}
  </WindowFrame>
</div>

<style>
  .positioner {
    position: absolute;
    top: 0;
    left: 0;
  }
  /* Fill the desktop. !important beats neodrag's inline `translate`, which is
     kept so the window returns to where it was when restored. */
  .positioner.full {
    inset: 0;
    translate: none !important;
  }
</style>
