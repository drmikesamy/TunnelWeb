<script lang="ts">
  import { Phone, PhoneOff, Video } from '@lucide/svelte';
  import { calls } from '$lib/stores/calls.svelte';
  import { contacts } from '$lib/stores/contacts.svelte';
  import { conversations } from '$lib/stores/conversations.svelte';
  import Avatar from '../common/Avatar.svelte';

  const inc = $derived(calls.incoming);
  const caller = $derived(inc ? contacts.get(inc.fromId) : undefined);
  const conv = $derived(inc ? conversations.get(inc.conversationId) : undefined);
</script>

{#if inc && caller}
  <div class="incoming glass-panel" role="alertdialog" aria-label="Incoming call">
    <div class="ring"><Avatar user={caller} size={56} /></div>
    <div class="text">
      <strong>{caller.name}</strong>
      <span>
        is {inc.media === 'video' ? 'video' : 'voice'} calling you{conv?.kind === 'room' ? ` in ${conv.name}` : ''}…
      </span>
    </div>
    <div class="actions">
      <button class="btn green" onclick={() => calls.accept()}>
        {#if inc.media === 'video'}<Video size={16} />{:else}<Phone size={16} />{/if} Answer
      </button>
      <button class="btn orange" onclick={() => calls.decline()}><PhoneOff size={16} /> Decline</button>
    </div>
  </div>
{/if}

<style>
  /* Slides up from the bottom-right, above the taskbar. */
  .incoming {
    position: fixed;
    right: 16px;
    bottom: 56px;
    z-index: 9000;
    width: min(280px, calc(100vw - 32px));
    padding: 14px;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 10px 12px;
    align-items: center;
    background: var(--glass-strong);
    animation: slide-up 0.35s ease-out;
  }
  .ring {
    border-radius: 24%;
    animation: pulse-ring 1.1s ease-out infinite;
  }
  .text {
    display: flex;
    flex-direction: column;
  }
  .actions {
    grid-column: 1 / -1;
    display: flex;
    gap: 8px;
  }
  .actions button {
    flex: 1;
  }
  @keyframes slide-up {
    from { transform: translateY(40px); opacity: 0; }
  }
</style>
