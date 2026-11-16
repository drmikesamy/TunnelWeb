<script lang="ts">
  import { contacts } from '$lib/stores/contacts.svelte';
  import { conversations } from '$lib/stores/conversations.svelte';
  import Dialog from '../common/Dialog.svelte';
  import ContactPicker from '../common/ContactPicker.svelte';

  let { onclose }: { onclose: () => void } = $props();
  let name = $state('');
  let selected = $state<string[]>([]);

  function create() {
    conversations.createRoom(name, selected);
    onclose();
  }
</script>

<Dialog title="Create a Chatroom" width={360} {onclose}>
  <div class="field">
    <label for="room-name">Room name</label>
    <input id="room-name" placeholder="e.g. Weekend plans 🎉" bind:value={name} />
  </div>
  <p>Invite contacts:</p>
  <ContactPicker options={contacts.list} bind:selected />
  {#snippet footer()}
    <button class="btn" onclick={onclose}>Cancel</button>
    <button class="btn blue" disabled={!selected.length} onclick={create}>Create room</button>
  {/snippet}
</Dialog>
