<script lang="ts">
  import { File as FileIcon } from '@lucide/svelte';
  import { session } from '$lib/stores/session.svelte';
  import { formatBytes } from '$lib/format';
  import { conversations } from '$lib/stores/conversations.svelte';
  import { contacts } from '$lib/stores/contacts.svelte';

  let { transferId }: { transferId: string } = $props();

  const t = $derived(conversations.transfers[transferId]);
  const mine = $derived(t?.senderId === session.me.id);
  const sender = $derived(t ? contacts.get(t.senderId) : undefined);
</script>

{#if t}
  <div class="card glass-panel">
    <div class="head">
      <span class="icon orb"><FileIcon size={17} /></span>
      <div class="meta">
        <strong title={t.fileName}>{t.fileName}</strong>
        <span class="muted">{formatBytes(t.size)}</span>
      </div>
    </div>

    {#if t.state === 'pending'}
      {#if mine}
        <p class="muted">Waiting for the other side to accept…</p>
        <button class="btn" onclick={() => conversations.cancelFile(t.id)}>Cancel</button>
      {:else}
        <p>{sender?.name} wants to send you this file.</p>
        <div class="actions">
          <button class="btn green" onclick={() => conversations.acceptFile(t.id)}>Accept</button>
          <button class="btn orange" onclick={() => conversations.declineFile(t.id)}>Decline</button>
        </div>
      {/if}
    {:else if t.state === 'transferring'}
      <div role="progressbar" aria-valuenow={Math.round(t.progress * 100)} aria-valuemin={0} aria-valuemax={100}><div style="width:{Math.round(t.progress * 100)}%"></div></div>
      <div class="row">
        <span class="muted">{mine ? 'Sending' : 'Receiving'}… {Math.round(t.progress * 100)}%</span>
        <button class="btn" onclick={() => conversations.cancelFile(t.id)}>Cancel</button>
      </div>
    {:else if t.state === 'done'}
      <div class="row">
        <span class="ok">✔ {mine ? 'Sent' : 'Received'} successfully.</span>
        {#if t.url}<a class="btn blue" href={t.url} download={t.fileName}>Save</a>{/if}
      </div>
    {:else if t.state === 'declined'}
      <p class="muted">Transfer declined.</p>
    {:else}
      <p class="muted">Transfer cancelled.</p>
    {/if}
  </div>
{/if}

<style>
  .card {
    max-width: 280px;
    padding: 8px 10px;
    margin: 4px 0;
  }
  .head {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .icon {
    flex: none;
    width: 34px;
    height: 34px;
  }
  .meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .meta strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  p {
    margin: 6px 0;
  }
  .actions,
  .row {
    display: flex;
    gap: 6px;
    align-items: center;
    justify-content: space-between;
  }
  .actions {
    justify-content: flex-start;
  }
  [role='progressbar'] {
    margin: 6px 0;
  }
  .ok {
    color: #137a2a;
    margin: 6px 0;
  }
</style>
