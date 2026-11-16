<script lang="ts">
  import { MessageCircle, Phone, Users } from '@lucide/svelte';
  import { windows, type DesktopWindow } from '$lib/stores/windows.svelte';
  import { conversations } from '$lib/stores/conversations.svelte';
  import StatusOrb from '../common/StatusOrb.svelte';
  import { session } from '$lib/stores/session.svelte';

  let now = $state(new Date());
  $effect(() => {
    const t = setInterval(() => (now = new Date()), 10_000);
    return () => clearInterval(t);
  });

  function label(w: DesktopWindow): string {
    if (w.kind === 'contacts') return 'TunnelWeb';
    if (w.kind === 'call') return 'Call';
    const c = conversations.get(w.refId);
    return c ? conversations.title(c) : 'Conversation';
  }

  const unread = (w: DesktopWindow) => (w.kind === 'conversation' ? (conversations.get(w.refId)?.unread ?? 0) : 0);
</script>

<footer class="taskbar">
  <div class="items">
    {#each windows.list as w (w.id)}
      <button
        class="bare item"
        class:active={windows.focusedId === w.id && !w.minimized}
        class:flash={unread(w) > 0}
        onclick={() => windows.toggle(w.id)}
      >
        {#if w.kind === 'contacts'}<StatusOrb status={session.me.status} size={12} />
        {:else if w.kind === 'call'}<Phone size={14} />
        {:else if conversations.get(w.refId)?.kind === 'room'}<Users size={14} />
        {:else}<MessageCircle size={14} />{/if}
        <span class="label">{label(w)}</span>
        {#if unread(w)}<span class="badge orb orange">{unread(w)}</span>{/if}
      </button>
    {/each}
  </div>

  <div class="tray">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
</footer>

<style>
  .taskbar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: 42px;
    z-index: 8000;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 8px;
    background:
      linear-gradient(rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.06) 50%, rgba(0, 0, 0, 0.12) 51%),
      rgba(0, 55, 65, 0.82);
    border-top: 1px solid rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(10px);
  }
  .items {
    flex: 1;
    display: flex;
    gap: 4px;
    overflow: hidden;
  }
  .item {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    max-width: 180px;
    padding: 6px 10px;
    border-radius: 6px;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.35);
    background: linear-gradient(rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.05));
  }
  .item:hover,
  .item.active {
    background: linear-gradient(rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.15));
    border-color: rgba(255, 255, 255, 0.8);
  }
  .item.flash {
    background: linear-gradient(rgba(255, 220, 120, 0.9), rgba(245, 166, 35, 0.8));
  }
  .label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .badge {
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    font-size: 8pt;
    font-weight: 700;
  }
  @media (max-width: 700px) {
    .tray {
      display: none;
    }
    .item {
      max-width: 110px;
      padding: 6px 8px;
    }
  }
  .tray {
    color: #fff;
    font-size: 10pt;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    padding: 0 8px;
  }
</style>
