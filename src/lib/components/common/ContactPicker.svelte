<script lang="ts">
  import type { User } from '$lib/types';
  import StatusOrb from './StatusOrb.svelte';

  /** Checkbox list of contacts. `selected` is bindable. */
  let { options, selected = $bindable([]) }: { options: User[]; selected?: string[] } = $props();
</script>

<ul class="picker">
  {#each options as c (c.id)}
    <li>
      <input type="checkbox" id="pick-{c.id}" value={c.id} bind:group={selected} />
      <label for="pick-{c.id}"><StatusOrb status={c.status} size={10} /> {c.name}</label>
    </li>
  {:else}
    <li class="muted">Nobody to add.</li>
  {/each}
</ul>

<style>
  .picker {
    max-height: 200px;
    overflow: auto;
    margin: 6px 0 0;
    padding: 4px 6px;
    list-style: none;
    border: 1px solid var(--field-border);
    border-radius: 6px;
    background: #fff;
  }
  li {
    display: flex;
    align-items: center;
    padding: 2px 0;
  }
  label {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
</style>
