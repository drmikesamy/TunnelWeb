<script lang="ts">
  import { tick } from 'svelte';
  import type { Conversation } from '$lib/types';
  import MessageView from './Message.svelte';

  let { conversation }: { conversation: Conversation } = $props();
  let scroller: HTMLDivElement;

  // Stick to the bottom whenever a message arrives.
  $effect(() => {
    void conversation.messages.length;
    tick().then(() => scroller?.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' }));
  });
</script>

<div class="messages" bind:this={scroller}>
  <div class="notice">🔒 Never give out your password or credit card number in an instant message conversation.</div>
  {#each conversation.messages as m, i (m.id)}
    {@const prev = conversation.messages[i - 1]}
    <MessageView message={m} showHeader={!prev || prev.senderId !== m.senderId || prev.kind !== 'text'} />
  {/each}
</div>

<style>
  .messages {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.85);
    border: 1px solid rgba(0, 120, 130, 0.3);
    border-radius: 6px;
  }
  .notice {
    color: var(--ink-soft);
    padding-bottom: 6px;
    margin-bottom: 4px;
    border-bottom: 1px dashed rgba(0, 120, 130, 0.25);
  }
</style>
