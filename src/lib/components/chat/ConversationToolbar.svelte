<script lang="ts">
  import { FolderUp, LogOut, Phone, UserPlus, Video } from '@lucide/svelte';
  import type { Conversation } from '$lib/types';
  import { contacts } from '$lib/stores/contacts.svelte';
  import { conversations } from '$lib/stores/conversations.svelte';
  import { calls } from '$lib/stores/calls.svelte';
  import Popover from '../common/Popover.svelte';
  import ContactPicker from '../common/ContactPicker.svelte';

  let { conversation }: { conversation: Conversation } = $props();
  let fileInput: HTMLInputElement;
  let inviteIds = $state<string[]>([]);

  const invitable = $derived(contacts.list.filter((c) => !conversation.participantIds.includes(c.id)));
  const inCall = $derived(calls.active?.conversationId === conversation.id);
</script>

<nav class="toolbar">
  <Popover align="left">
    {#snippet trigger(toggle)}
      <button class="tool" onclick={toggle}><UserPlus size={22} /><span>Invite</span></button>
    {/snippet}
    {#snippet children(close)}
      <div class="invite">
        <strong>Invite someone to this conversation</strong>
        <ContactPicker options={invitable} bind:selected={inviteIds} />
        <button
          class="btn blue"
          disabled={!inviteIds.length}
          onclick={() => {
            conversations.invite(conversation.id, inviteIds);
            inviteIds = [];
            close();
          }}>Invite</button
        >
      </div>
    {/snippet}
  </Popover>

  <button class="tool" onclick={() => fileInput.click()}><FolderUp size={22} /><span>Send Files</span></button>
  <input
    type="file"
    multiple
    hidden
    bind:this={fileInput}
    onchange={(e) => {
      conversations.sendFiles(conversation.id, [...(e.currentTarget.files ?? [])]);
      e.currentTarget.value = '';
    }}
  />
  <button class="tool" disabled={inCall} onclick={() => calls.start(conversation.id, 'audio')}><Phone size={22} /><span>Voice</span></button>
  <button class="tool" disabled={inCall} onclick={() => calls.start(conversation.id, 'video')}><Video size={22} /><span>Video</span></button>

  {#if conversation.kind === 'room'}
    <button class="tool leave" onclick={() => conversations.leave(conversation.id)}><LogOut size={22} /><span>Leave</span></button>
  {/if}
</nav>

<style>
  .toolbar {
    display: flex;
    gap: 2px;
    padding: 4px 6px;
    border-bottom: 1px solid rgba(0, 120, 130, 0.2);
    background: linear-gradient(rgba(255, 255, 255, 0.9), rgba(220, 250, 242, 0.6));
  }
  .toolbar .tool {
    color: var(--aqua-deep);
  }
  .toolbar .tool span {
    color: var(--ink);
    font-size: 8pt;
  }
  .toolbar .tool:disabled {
    opacity: 0.4;
  }
  .leave {
    margin-left: auto;
  }
  .invite {
    width: 220px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  /* Invite panel drops down instead of up. */
  .toolbar :global(.panel) {
    bottom: auto;
    top: calc(100% + 4px);
  }
</style>
