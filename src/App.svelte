<script lang="ts">
  import { Toaster } from 'svelte-sonner';
  import { windows } from '$lib/stores/windows.svelte';
  import { session } from '$lib/stores/session.svelte';
  import ContactListWindow from '$lib/components/contacts/ContactListWindow.svelte';
  import SignInWindow from '$lib/components/contacts/SignInWindow.svelte';
  import ConversationWindow from '$lib/components/chat/ConversationWindow.svelte';
  import CallWindow from '$lib/components/calls/CallWindow.svelte';
  import IncomingCallToast from '$lib/components/calls/IncomingCallToast.svelte';
  import Taskbar from '$lib/components/desktop/Taskbar.svelte';

  windows.open('contacts', '', { x: 24, y: 24 });
</script>

{#if session.signedIn}
  <main class="desktop">
    {#each windows.list as win (win.id)}
      {#if win.kind === 'contacts'}
        <ContactListWindow {win} />
      {:else if win.kind === 'conversation'}
        <ConversationWindow {win} />
      {:else if win.kind === 'call'}
        <CallWindow {win} />
      {/if}
    {/each}
  </main>
  <IncomingCallToast />
{:else}
  <SignInWindow />
{/if}

{#if session.signedIn && session.connection !== 'online'}
  <div class="connection btn orange" role="status">
    {session.connection === 'connecting' ? 'Connecting to the chat host…' : 'Lost connection to the chat host. Reconnecting…'}
  </div>
{/if}

<Taskbar />
<Toaster position="top-right" closeButton />

<style>
  .desktop {
    position: fixed;
    inset: 0 0 42px 0;
    overflow: hidden;
  }
  .connection {
    position: fixed;
    top: 10px;
    left: 50%;
    translate: -50% 0;
    z-index: 9500;
    cursor: default;
  }
</style>
