<script lang="ts">
  import type { User } from '$lib/types';
  import ContactRow from './ContactRow.svelte';

  let {
    name,
    members,
    onopen,
    oncall,
  }: {
    name: string;
    members: User[];
    onopen: (c: User) => void;
    oncall: (c: User, media: 'audio' | 'video') => void;
  } = $props();

  const onlineCount = $derived(members.filter((m) => m.status !== 'offline').length);
</script>

<details open>
  <summary><strong>{name}</strong> <span class="muted">({onlineCount}/{members.length})</span></summary>
  <ul>
    {#each members as c (c.id)}
      <ContactRow contact={c} onopen={() => onopen(c)} oncall={(m) => oncall(c, m)} />
    {/each}
  </ul>
</details>

<style>
  details {
    margin-bottom: 4px;
  }
  summary {
    padding: 3px 4px;
    cursor: pointer;
    color: var(--ink);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
</style>
