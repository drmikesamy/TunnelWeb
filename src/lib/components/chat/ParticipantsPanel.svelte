<script lang="ts">
  import type { Conversation } from '$lib/types';
  import { contacts } from '$lib/stores/contacts.svelte';
  import { session } from '$lib/stores/session.svelte';
  import Avatar from '../common/Avatar.svelte';
  import StatusOrb from '../common/StatusOrb.svelte';

  let { conversation }: { conversation: Conversation } = $props();
  const people = $derived([session.me, ...contacts.getMany(conversation.participantIds)]);
</script>

<section class="participants glass-panel">
  <h4>In this room ({people.length})</h4>
  <ul>
    {#each people as p (p.id)}
      <li>
        <Avatar user={p} size={26} />
        <span class="name">{p.id === session.me.id ? `${p.name} (you)` : p.name}</span>
        <StatusOrb status={p.status} size={10} />
        {#if conversation.typingIds.includes(p.id)}<span class="typing" title="typing">✎</span>{/if}
      </li>
    {/each}
  </ul>
</section>

<style>
  .participants {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 6px;
  }
  h4 {
    margin: 0 0 6px;
    font-size: 9pt;
    color: var(--ink-soft);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 0;
  }
  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .typing {
    color: var(--aqua-deep);
  }
</style>
