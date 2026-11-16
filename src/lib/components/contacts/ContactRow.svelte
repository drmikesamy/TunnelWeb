<script lang="ts">
  import { Phone, Video } from '@lucide/svelte';
  import type { User } from '$lib/types';
  import { STATUS_LABELS } from '$lib/format';
  import StatusOrb from '../common/StatusOrb.svelte';
  import { viewport } from '$lib/stores/viewport.svelte';

  let {
    contact,
    onopen,
    oncall,
  }: { contact: User; onopen: () => void; oncall: (media: 'audio' | 'video') => void } = $props();

  const offline = $derived(contact.status === 'offline');
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<li
  class="row"
  class:offline
  tabindex="0"
  ondblclick={onopen}
  onclick={(e) => viewport.touch && !(e.target as HTMLElement).closest('.actions') && onopen()}
  onkeydown={(e) => e.key === 'Enter' && onopen()}
  title="Double-click to start a conversation"
>
  <StatusOrb status={contact.status} />
  <span class="text">
    <span class="name">{contact.name}</span>
    {#if contact.status !== 'online'}<span class="muted"> ({STATUS_LABELS[contact.status].replace('Appear ', '')})</span>{/if}
    {#if contact.personalMessage}<span class="pm"> – {contact.personalMessage}</span>{/if}
  </span>
  {#if !offline}
    <span class="actions">
      <button class="tool" title="Voice call" onclick={() => oncall('audio')}><Phone size={13} /></button>
      <button class="tool" title="Video call" onclick={() => oncall('video')}><Video size={13} /></button>
    </span>
  {/if}
</li>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 6px 3px 14px;
    border-radius: 4px;
    border: 1px solid transparent;
    cursor: default;
    min-height: 22px;
  }
  .row:hover,
  .row:focus {
    outline: none;
    background: linear-gradient(rgba(255, 255, 255, 0.95), rgba(200, 245, 235, 0.9));
    border-color: rgba(0, 170, 180, 0.45);
  }
  .text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .name {
    color: var(--ink);
  }
  .offline .name {
    color: var(--ink-soft);
  }
  .pm {
    font-style: italic;
    color: var(--ink-soft);
  }
  .actions {
    display: none;
  }
  .row:hover .actions {
    display: flex;
  }
  @media (hover: none) {
    .actions {
      display: flex;
    }
  }
  .actions .tool {
    padding: 2px 4px;
  }
</style>
