<script lang="ts">
  import type { Snippet } from 'svelte';

  /** Trigger + floating panel that closes when clicking outside. */
  let {
    trigger,
    children,
    align = 'left',
    open = $bindable(false),
  }: {
    trigger: Snippet<[() => void]>;
    children: Snippet<[() => void]>;
    align?: 'left' | 'right';
    open?: boolean;
  } = $props();

  let root: HTMLElement;
  const toggle = () => (open = !open);
  const close = () => (open = false);
</script>

<svelte:window onpointerdown={(e) => open && !root.contains(e.target as Node) && close()} />

<span class="pop" bind:this={root}>
  {@render trigger(toggle)}
  {#if open}
    <div class="panel glass-panel {align}">{@render children(close)}</div>
  {/if}
</span>

<style>
  .pop {
    position: relative;
    display: inline-flex;
  }
  .panel {
    position: absolute;
    bottom: calc(100% + 6px);
    z-index: 50;
    padding: 8px;
    max-width: calc(100vw - 24px);
    background: rgba(255, 255, 255, 0.96);
  }
  .panel.left {
    left: 0;
  }
  .panel.right {
    right: 0;
  }
</style>
