<script lang="ts">
  import { Mic, MicOff, MonitorUp, PhoneOff, UserPlus, Video, VideoOff } from '@lucide/svelte';
  import type { Call } from '$lib/types';
  import { calls } from '$lib/stores/calls.svelte';
  import { contacts } from '$lib/stores/contacts.svelte';
  import Popover from '../common/Popover.svelte';
  import ContactPicker from '../common/ContactPicker.svelte';

  let { call }: { call: Call } = $props();
  let addIds = $state<string[]>([]);

  const addable = $derived(contacts.list.filter((c) => c.status !== 'offline' && !call.participantIds.includes(c.id)));
</script>

<div class="controls">
  <button class="orb" class:grey={call.muted} title={call.muted ? 'Unmute' : 'Mute'} onclick={() => calls.toggleMute()}>
    {#if call.muted}<MicOff size={20} />{:else}<Mic size={20} />{/if}
  </button>
  <button class="orb" class:grey={!call.cameraOn} title={call.cameraOn ? 'Turn camera off' : 'Turn camera on'} onclick={() => calls.toggleCamera()}>
    {#if call.cameraOn}<Video size={20} />{:else}<VideoOff size={20} />{/if}
  </button>
  <button class="orb" class:green={call.sharing} title="Share screen" onclick={() => calls.toggleShare()}>
    <MonitorUp size={20} />
  </button>

  <Popover>
    {#snippet trigger(toggle)}
      <button class="orb" title="Add people to the call" onclick={toggle}><UserPlus size={20} /></button>
    {/snippet}
    {#snippet children(close)}
      <div class="add">
        <strong>Add to call</strong>
        <ContactPicker options={addable} bind:selected={addIds} />
        <button
          class="btn blue"
          disabled={!addIds.length}
          onclick={() => {
            addIds.forEach((id) => calls.addParticipant(id));
            addIds = [];
            close();
          }}>Add</button
        >
      </div>
    {/snippet}
  </Popover>

  <button class="orb red hangup" title="Hang up" onclick={() => calls.hangup()}><PhoneOff size={20} /></button>
</div>

<style>
  .controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 10px;
  }
  .hangup {
    width: 52px;
    height: 52px;
  }
  .add {
    width: 220px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
</style>
