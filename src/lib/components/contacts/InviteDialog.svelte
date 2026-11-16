<script lang="ts">
  import { Copy, Check } from '@lucide/svelte';
  import { backend } from '$lib/backend';
  import Dialog from '../common/Dialog.svelte';

  let { onclose }: { onclose: () => void } = $props();
  let invite = $state<string | null>(null);
  let copied = $state(false);

  // The tunnel can take a few seconds to come up after launch, so poll until it has.
  $effect(() => {
    let stop = false;
    const poll = async () => {
      invite = await backend.invite();
      if (!invite && !stop) setTimeout(poll, 2000);
    };
    poll();
    return () => (stop = true);
  });

  async function copy() {
    if (!invite) return;
    await navigator.clipboard?.writeText(invite).catch(() => {});
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }
</script>

<Dialog title="Invite a friend" width={460} {onclose}>
  {#if invite}
    <p>Send this command to a friend. They paste it into a terminal (Node.js needed) and TunnelWeb opens in their browser, connected to you:</p>
    <div class="cmd">
      <code>{invite}</code>
      <button class="tool" title="Copy" onclick={copy}>
        {#if copied}<Check size={16} />{:else}<Copy size={16} />{/if}
      </button>
    </div>
    <p class="muted">The connection is peer-to-peer and encrypted. Anyone with the command can join while this chat is running.</p>
  {:else}
    <p class="muted">Starting the secure tunnel… this usually takes a few seconds.</p>
    <div role="progressbar" class="indeterminate"><div></div></div>
  {/if}
  {#snippet footer()}
    <button class="btn" onclick={onclose}>Close</button>
    {#if invite}<button class="btn blue" onclick={copy}>{copied ? 'Copied!' : 'Copy command'}</button>{/if}
  {/snippet}
</Dialog>

<style>
  p {
    margin: 0 0 10px;
  }
  .cmd {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 8px 10px;
    margin-bottom: 10px;
    border-radius: 8px;
    border: 1px solid var(--field-border);
    background: #0b3b4a;
  }
  code {
    flex: 1;
    color: #7dffd9;
    font: 9pt 'Source Code Pro', monospace;
    word-break: break-all;
    user-select: all;
  }
  .cmd .tool {
    color: #fff;
  }
  .indeterminate > div {
    width: 35%;
    animation: slide 1.2s ease-in-out infinite alternate;
  }
  @keyframes slide {
    from { margin-left: 0; }
    to { margin-left: 65%; }
  }
</style>
