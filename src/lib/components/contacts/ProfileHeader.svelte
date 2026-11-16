<script lang="ts">
  import { session } from '$lib/stores/session.svelte';
  import Avatar from '../common/Avatar.svelte';
  import StatusMenu from './StatusMenu.svelte';

  let editingName = $state(false);
</script>

<header class="profile glass-panel">
  <Avatar user={session.me} size={60} ring />
  <div class="info">
    <div class="name-row">
      {#if editingName}
        <!-- svelte-ignore a11y_autofocus -->
        <input
          class="name-input"
          value={session.me.name}
          autofocus
          onblur={(e) => {
            session.setName(e.currentTarget.value);
            editingName = false;
          }}
          onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      {:else}
        <button class="bare name" title="Click to change your display name" onclick={() => (editingName = true)}>
          {session.me.name}
        </button>
      {/if}
      <StatusMenu status={session.me.status} onchange={(s) => session.setStatus(s)} />
    </div>
    <input
      class="pm"
      placeholder="<Type a personal message>"
      value={session.me.personalMessage}
      onchange={(e) => session.setPersonalMessage(e.currentTarget.value)}
    />
  </div>
</header>

<style>
  .profile {
    display: flex;
    gap: 10px;
    padding: 10px;
    margin: 8px;
    align-items: center;
  }
  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .name-row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .name {
    all: unset;
    font-size: 12pt;
    font-weight: 700;
    color: var(--ink);
    cursor: text;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .name-input {
    font-size: 11pt;
    width: 150px;
  }
  .pm {
    width: 100%;
    box-sizing: border-box;
    font-style: italic;
    background: rgba(255, 255, 255, 0.6);
  }
</style>
