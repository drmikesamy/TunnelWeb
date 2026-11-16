<script lang="ts">
  import type { Snippet } from 'svelte';
  import WindowFrame from './WindowFrame.svelte';

  let {
    title,
    width = 340,
    onclose,
    children,
    footer,
  }: { title: string; width?: number; onclose: () => void; children: Snippet; footer?: Snippet } = $props();
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="backdrop" onclick={(e) => e.target === e.currentTarget && onclose()}>
  <div role="dialog" aria-label={title}>
    <WindowFrame {title} {width} {onclose}>
      <div class="content">
        {@render children()}
        {#if footer}<div class="footer">{@render footer()}</div>{/if}
      </div>
    </WindowFrame>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: grid;
    place-items: center;
    background: rgba(0, 60, 70, 0.2);
    backdrop-filter: blur(2px);
  }
  [role='dialog'] {
    max-width: calc(100vw - 16px);
  }
  .content {
    padding: 12px;
  }
  .footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 12px;
  }
</style>
