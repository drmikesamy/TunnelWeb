<script lang="ts">
  import type { Status } from '$lib/types';
  import { STATUS_LABELS } from '$lib/format';
  import StatusOrb from '../common/StatusOrb.svelte';

  let { status, onchange }: { status: Status; onchange: (s: Status) => void } = $props();
  const options = Object.entries(STATUS_LABELS) as [Status, string][];
</script>

<label class="status">
  <StatusOrb {status} size={11} />
  <select value={status} onchange={(e) => onchange(e.currentTarget.value as Status)}>
    {#each options as [value, label] (value)}
      <option {value}>({label})</option>
    {/each}
  </select>
</label>

<style>
  .status {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  select {
    font-size: 8.5pt;
    min-height: 20px;
    padding: 0 18px 0 4px;
  }
</style>
