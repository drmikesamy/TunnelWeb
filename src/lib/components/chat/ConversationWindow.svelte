<script lang="ts">
  import { Info, PhoneCall } from '@lucide/svelte';
  import type { DesktopWindow } from '$lib/stores/windows.svelte';
  import { windows } from '$lib/stores/windows.svelte';
  import { conversations } from '$lib/stores/conversations.svelte';
  import { contacts } from '$lib/stores/contacts.svelte';
  import { session } from '$lib/stores/session.svelte';
  import { calls } from '$lib/stores/calls.svelte';
  import { STATUS_LABELS, formatTime } from '$lib/format';
  import Window from '../common/Window.svelte';
  import Avatar from '../common/Avatar.svelte';
  import ConversationToolbar from './ConversationToolbar.svelte';
  import MessageList from './MessageList.svelte';
  import Composer from './Composer.svelte';
  import ParticipantsPanel from './ParticipantsPanel.svelte';

  let { win }: { win: DesktopWindow } = $props();

  const conv = $derived(conversations.get(win.refId));
  const others = $derived(conv ? contacts.getMany(conv.participantIds) : []);
  const contact = $derived(conv?.kind === 'direct' ? others[0] : undefined);
  const typingNames = $derived(conv ? contacts.getMany(conv.typingIds).map((u) => u.name.split(' ')[0]) : []);
  const lastReceived = $derived(conv?.messages.findLast((m) => m.senderId !== session.me.id && m.kind === 'text'));
  const call = $derived(calls.active?.conversationId === conv?.id ? calls.active : null);

  // Reading the window clears its unread count.
  $effect(() => {
    if (conv && windows.focusedId === win.id && conv.unread) conv.unread = 0;
  });

  let dragging = $state(false);
  function drop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    if (conv && e.dataTransfer?.files.length) conversations.sendFiles(conv.id, [...e.dataTransfer.files]);
  }
</script>

{#if conv}
  <Window {win} title="{conversations.title(conv)} – Conversation" width={640} height={540} shakeKey={conv.nudgeCount}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="layout"
      ondragover={(e) => {
        e.preventDefault();
        dragging = true;
      }}
      ondragleave={() => (dragging = false)}
      ondrop={drop}
    >
      <ConversationToolbar conversation={conv} />

      <div class="main">
        <div class="chat">
          <div class="to glass-panel">
            To: <strong>{others.map((u) => u.name).join(', ') || 'nobody yet'}</strong>
            {#if contact?.email}<span class="muted">&lt;{contact.email}&gt;</span>{/if}
          </div>

          {#if contact && contact.status !== 'online'}
            <div class="infobar">
              <Info size={14} />
              {contact.name} may not reply because their status is set to {STATUS_LABELS[contact.status].replace('Appear ', '')}.
            </div>
          {/if}

          {#if call}
            <button class="btn green callbar" onclick={() => windows.focus(`call:${call.id}`)}>
              <PhoneCall size={14} /> {call.state === 'outgoing' ? 'Calling…' : 'Call in progress'} – click to show
            </button>
          {/if}

          <MessageList conversation={conv} />

          <div class="statusline muted">
            {#if typingNames.length}
              {typingNames.join(', ')} {typingNames.length > 1 ? 'are' : 'is'} typing a message…
            {:else if lastReceived}
              Last message received at {formatTime(lastReceived.sentAt)}.
            {:else}
              &nbsp;
            {/if}
          </div>

          <Composer conversationId={conv.id} />
        </div>

        <aside class="side">
          {#if contact}
            <div class="dp glass-panel"><Avatar user={contact} size={110} ring /></div>
          {:else}
            <ParticipantsPanel conversation={conv} />
          {/if}
          <div class="dp glass-panel"><Avatar user={session.me} size={contact ? 110 : 80} ring /></div>
        </aside>
      </div>

      {#if dragging}<div class="dropzone">Drop files to send them 📁</div>{/if}
    </div>
  </Window>
{/if}

<style>
  .layout {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .main {
    flex: 1;
    min-height: 0;
    display: flex;
    gap: 8px;
    padding: 8px;
  }
  .chat {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .to {
    padding: 5px 8px;
  }
  .infobar {
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 4px 8px;
    background: #fffbe0;
    border: 1px solid #e7d58a;
    border-radius: 4px;
  }
  .callbar {
    align-self: flex-start;
  }
  .statusline {
    min-height: 14px;
    font-size: 8pt;
  }
  .side {
    width: 140px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  @media (max-width: 700px) {
    .side {
      display: none;
    }
    .main {
      padding: 6px;
    }
  }
  .dp {
    display: grid;
    place-items: center;
    padding: 10px;
  }
  .dropzone {
    position: absolute;
    inset: 6px;
    display: grid;
    place-items: center;
    border: 3px dashed var(--aqua-deep);
    border-radius: 10px;
    background: rgba(0, 222, 221, 0.18);
    font-size: 14pt;
    font-weight: 700;
    color: var(--ink);
    pointer-events: none;
  }
</style>
