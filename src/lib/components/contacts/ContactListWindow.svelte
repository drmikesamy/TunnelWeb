<script lang="ts">
  import { UserPlus } from '@lucide/svelte';
  import { windows, type DesktopWindow } from '$lib/stores/windows.svelte';
  import { contacts } from '$lib/stores/contacts.svelte';
  import { conversations } from '$lib/stores/conversations.svelte';
  import { calls } from '$lib/stores/calls.svelte';
  import InviteDialog from './InviteDialog.svelte';
  import type { User } from '$lib/types';
  import Window from '../common/Window.svelte';
  import MenuBar, { type Menu } from '../common/MenuBar.svelte';
  import ProfileHeader from './ProfileHeader.svelte';
  import ContactGroup from './ContactGroup.svelte';
  import RoomList from '../rooms/RoomList.svelte';
  import CreateRoomDialog from '../rooms/CreateRoomDialog.svelte';

  let { win }: { win: DesktopWindow } = $props();

  let tab = $state<'contacts' | 'rooms'>('contacts');
  let search = $state('');
  let dialog = $state<'room' | 'invite' | null>(null);
  /** There's no address book: you add people by inviting them. */
  const addContact = () => (dialog = 'invite');

  const filtered = $derived(
    contacts.list.filter((c) => (c.name + c.email).toLowerCase().includes(search.trim().toLowerCase())),
  );

  // Online contacts go in their groups; offline contacts share one group at the bottom, as in the original app.
  const groups = $derived.by(() => {
    const map = new Map<string, User[]>();
    for (const c of filtered.filter((c) => c.status !== 'offline')) {
      map.set(c.group, [...(map.get(c.group) ?? []), c]);
    }
    const offline = filtered.filter((c) => c.status === 'offline');
    return [...map.entries(), ...(offline.length ? [['Offline', offline] as [string, User[]]] : [])];
  });

  function call(c: User, media: 'audio' | 'video') {
    calls.start(conversations.ensureDirect(c.id), media);
  }

  const menus: Menu[] = [
    {
      label: 'Contacts',
      items: [
        { label: 'Invite a friend…', onclick: addContact },
        { label: 'Create a chatroom…', onclick: () => (dialog = 'room') },
      ],
    },
    {
      label: 'Help',
      items: [{ label: 'About TunnelWeb', onclick: () => alert('TunnelWeb — peer-to-peer chat over p2p-tunnel.') }],
    },
  ];
</script>

<Window {win} title="TunnelWeb" width={330} height={600} onclose={() => windows.minimize(win.id)}>
  <MenuBar {menus} />
  <ProfileHeader />

  <div role="tablist" class="tabs">
    <button role="tab" class={tab === 'contacts' ? 'btn blue' : ''} aria-selected={tab === 'contacts'} onclick={() => (tab = 'contacts')}>Contacts</button>
    <button role="tab" class={tab === 'rooms' ? 'btn blue' : ''} aria-selected={tab === 'rooms'} onclick={() => (tab = 'rooms')}>
      Chatrooms ({conversations.rooms.length})
    </button>
  </div>

  <div role="tabpanel" class="panel">
    {#if tab === 'contacts'}
      <div class="toolbar">
        <input type="search" placeholder="Search contacts…" bind:value={search} />
        <button class="tool" title="Invite a friend" onclick={addContact}><UserPlus size={16} /></button>
      </div>
      <div class="list">
        {#each groups as [name, members] (name)}
          <ContactGroup {name} {members} onopen={(c) => conversations.openDirect(c.id)} oncall={call} />
        {:else}
          {#if search}
            <p class="muted">No contacts match “{search}”.</p>
          {:else}
            <div class="empty">
              <p>Nobody else is here yet.</p>
              <button class="btn green" onclick={addContact}>Invite a friend</button>
            </div>
          {/if}
        {/each}
      </div>
    {:else}
      <div class="list"><RoomList oncreate={() => (dialog = 'room')} /></div>
    {/if}
  </div>

</Window>

{#if dialog === 'room'}<CreateRoomDialog onclose={() => (dialog = null)} />{/if}
{#if dialog === 'invite'}<InviteDialog onclose={() => (dialog = null)} />{/if}

<style>
  /* Segmented glass tabs */
  .tabs {
    display: flex;
    margin: 0 8px 6px;
    padding: 2px;
    border-radius: 999px;
    border: 1px solid var(--field-border);
    background: rgba(255, 255, 255, 0.6);
  }
  .tabs button {
    --h: 26px;
    flex: 1;
  }
  /* Unselected tabs are flat; the selected one is a blue .btn pill. */
  .tabs button:not(.btn) {
    height: 26px;
    padding: 0 8px;
    border: none;
    border-radius: 999px;
    background: transparent;
  }
  .tabs button:not(.btn):hover {
    background: rgba(0, 222, 221, 0.12);
  }
  .panel {
    flex: 1;
    min-height: 0;
    margin: 0 8px 8px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    border-radius: 8px;
    border: 1px solid rgba(0, 120, 130, 0.2);
    background: rgba(255, 255, 255, 0.75);
  }
  .toolbar {
    display: flex;
    gap: 4px;
    align-items: center;
    margin-bottom: 6px;
  }
  .toolbar input {
    flex: 1;
  }
  .list {
    flex: 1;
    overflow: auto;
  }
  .empty {
    text-align: center;
    padding: 24px 8px;
  }
</style>
