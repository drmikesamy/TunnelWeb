<script lang="ts">
  import { PhoneCall } from '@lucide/svelte';
  import type { Message } from '$lib/types';
  import { fontStyle } from '$lib/fonts';
  import { formatTime } from '$lib/format';
  import { session } from '$lib/stores/session.svelte';
  import { contacts } from '$lib/stores/contacts.svelte';
  import FileTransferCard from './FileTransferCard.svelte';

  /** `showHeader` is false when the previous message came from the same sender. */
  let { message, showHeader = true }: { message: Message; showHeader?: boolean } = $props();

  const sender = $derived(contacts.get(message.senderId));
  const name = $derived(message.senderId === session.me.id ? 'You' : (sender?.name ?? 'Unknown'));
</script>

{#if message.kind === 'system'}
  <div class="system">{message.text}</div>
{:else if message.kind === 'call'}
  <div class="system call"><PhoneCall size={12} /> {message.text} <span class="time">{formatTime(message.sentAt)}</span></div>
{:else if message.kind === 'nudge'}
  <div class="nudge">
    {message.senderId === session.me.id ? 'You have just sent a nudge.' : `${name} has just sent you a nudge!`}
  </div>
{:else}
  <div class="message">
    {#if showHeader}
      <div class="header">{name} says: <span class="time">{formatTime(message.sentAt)}</span></div>
    {/if}
    {#if message.kind === 'file' && message.fileTransferId}
      <div class="body"><FileTransferCard transferId={message.fileTransferId} /></div>
    {:else}
      <div class="body text" style={fontStyle(message.font)}>{message.text}</div>
    {/if}
  </div>
{/if}

<style>
  .message {
    margin: 2px 0;
  }
  .header {
    color: var(--ink-soft);
    margin-top: 6px;
  }
  .time {
    font-size: 7.5pt;
    opacity: 0.7;
  }
  .body {
    padding-left: 14px;
  }
  .text {
    white-space: pre-wrap;
    word-break: break-word;
  }
  .system {
    color: var(--ink-soft);
    font-style: italic;
    margin: 6px 0;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .nudge {
    margin: 6px 0;
    padding: 4px 8px;
    border-left: 3px solid var(--orb-amber);
    background: rgba(245, 166, 35, 0.12);
    font-weight: 600;
  }
</style>
