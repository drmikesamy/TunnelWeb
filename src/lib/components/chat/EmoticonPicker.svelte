<script lang="ts">
  import 'emoji-picker-element';
  import dataSource from 'emoji-picker-element-data/en/emojibase/data.json?url';
  import { Smile } from '@lucide/svelte';
  import Popover from '../common/Popover.svelte';

  let { onpick }: { onpick: (emoji: string) => void } = $props();
  let picker = $state<HTMLElement>();

  $effect(() => {
    if (!picker) return;
    const handler = (e: Event) => {
      const unicode = (e as CustomEvent<{ unicode?: string }>).detail.unicode;
      if (unicode) onpick(unicode);
    };
    picker.addEventListener('emoji-click', handler);
    return () => picker?.removeEventListener('emoji-click', handler);
  });
</script>

<Popover>
  {#snippet trigger(toggle)}
    <button class="tool" title="Emoticons" onclick={toggle}><Smile size={16} /></button>
  {/snippet}
  {#snippet children()}
    <emoji-picker class="light" data-source={dataSource} bind:this={picker}></emoji-picker>
  {/snippet}
</Popover>

<style>
  emoji-picker {
    --background: transparent;
    --border-color: rgba(0, 150, 160, 0.3);
    --indicator-color: var(--aqua-deep);
    --button-active-background: rgba(0, 222, 221, 0.25);
    --num-columns: 8;
    height: 300px;
    width: min(340px, calc(100vw - 48px));
  }
</style>
