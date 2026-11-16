<script lang="ts">
  import { Users } from '@lucide/svelte';
  import { conversations } from '$lib/stores/conversations.svelte';
  import { contacts } from '$lib/stores/contacts.svelte';

  let { oncreate }: { oncreate: () => void } = $props();
</script>

<ul class="rooms">
  {#each conversations.rooms as room (room.id)}
    <li>
      <button class="bare room" onclick={() => conversations.open(room.id)}>
        <span class="icon orb"><Users size={15} /></span>
        <span class="text">
          <strong>{room.name}</strong>
          <span class="muted">{contacts.getMany(room.participantIds).map((u) => u.name.split(' ')[0]).join(', ')}</span>
        </span>
        {#if room.unread}<span class="badge orb orange">{room.unread}</span>{/if}
      </button>
    </li>
  {:else}
    <li class="muted empty">No chatrooms yet.</li>
  {/each}
</ul>
<div class="create">
  <button class="btn green" onclick={oncreate}>+ Create chatroom</button>
</div>

<style>
  .rooms {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .room {
    all: unset;
    box-sizing: border-box;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 6px;
    border: 1px solid transparent;
    cursor: pointer;
  }
  .room:hover {
    background: linear-gradient(rgba(255, 255, 255, 0.95), rgba(200, 245, 235, 0.9));
    border-color: rgba(0, 170, 180, 0.45);
  }
  .icon {
    flex: none;
    width: 30px;
    height: 30px;
  }
  .text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .text .muted {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .badge {
    min-width: 20px;
    height: 20px;
    padding: 0 4px;
    font-size: 8pt;
    font-weight: 700;
  }
  .empty {
    padding: 10px;
  }
  .create {
    padding: 10px;
    text-align: center;
  }
</style>
