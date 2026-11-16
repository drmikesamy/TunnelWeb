<script lang="ts">
  import { Paperclip, Vibrate } from '@lucide/svelte';
  import { fontStyle } from '$lib/fonts';
  import { session } from '$lib/stores/session.svelte';
  import { conversations } from '$lib/stores/conversations.svelte';
  import FontPicker from './FontPicker.svelte';
  import EmoticonPicker from './EmoticonPicker.svelte';

  let { conversationId }: { conversationId: string } = $props();
  let text = $state('');
  let input: HTMLTextAreaElement;
  let fileInput: HTMLInputElement;

  function send() {
    conversations.send(conversationId, text);
    text = '';
    input.focus();
  }

  function insert(emoji: string) {
    const start = input.selectionStart ?? text.length;
    const end = input.selectionEnd ?? text.length;
    text = text.slice(0, start) + emoji + text.slice(end);
    queueMicrotask(() => {
      input.focus();
      input.selectionStart = input.selectionEnd = start + emoji.length;
    });
  }
</script>

<div class="composer glass-panel">
  <div class="tools">
    <FontPicker />
    <EmoticonPicker onpick={insert} />
    <button class="tool" title="Send a nudge" onclick={() => conversations.nudge(conversationId)}><Vibrate size={16} /></button>
    <button class="tool" title="Send a file" onclick={() => fileInput.click()}><Paperclip size={16} /></button>
    <input
      type="file"
      multiple
      hidden
      bind:this={fileInput}
      onchange={(e) => {
        conversations.sendFiles(conversationId, [...(e.currentTarget.files ?? [])]);
        e.currentTarget.value = '';
      }}
    />
  </div>
  <div class="input-row">
    <textarea
      bind:this={input}
      bind:value={text}
      style={fontStyle(session.me.font)}
      placeholder="Type a message…"
      oninput={() => conversations.typing(conversationId)}
      onkeydown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          send();
        }
      }}
    ></textarea>
    <button class="btn blue" disabled={!text.trim()} onclick={send}>Send</button>
  </div>
</div>

<style>
  .composer {
    padding: 4px 6px 6px;
  }
  .tools {
    display: flex;
    gap: 2px;
    margin-bottom: 4px;
  }
  .input-row {
    display: flex;
    gap: 6px;
    align-items: stretch;
  }
  textarea {
    flex: 1;
    height: 56px;
    resize: none;
    box-sizing: border-box;
  }
  .input-row .btn {
    --h: 34px;
    align-self: flex-end;
  }
</style>
