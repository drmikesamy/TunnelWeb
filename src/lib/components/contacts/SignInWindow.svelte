<script lang="ts">
  import { session } from '$lib/stores/session.svelte';
  import WindowFrame from '../common/WindowFrame.svelte';

  let name = $state('');
  let personalMessage = $state('');

  function submit(e: SubmitEvent) {
    e.preventDefault();
    if (name.trim()) session.signIn(name, personalMessage);
  }
</script>

<div class="center">
  <WindowFrame title="TunnelWeb – Sign in" width={340}>
    <form class="signin" onsubmit={submit}>
      <div class="logo">
        <span class="orb logo-orb"></span><span class="orb green logo-orb"></span>
        <strong>Tunnel</strong>Web
      </div>
      <p class="muted">Pick a display name. Everyone connected to this chat will see it.</p>
      <div class="field">
        <label for="si-name">Display name</label>
        <!-- svelte-ignore a11y_autofocus -->
        <input id="si-name" maxlength="40" autofocus bind:value={name} placeholder="e.g. Potato123" />
      </div>
      <div class="field">
        <label for="si-pm">Personal message (optional)</label>
        <input id="si-pm" maxlength="80" bind:value={personalMessage} placeholder="♫ Listening to…" />
      </div>
      <button class="btn blue" type="submit" disabled={!name.trim()}>Sign in</button>
    </form>
  </WindowFrame>
</div>

<style>
  .center {
    position: fixed;
    inset: 0 0 42px 0;
    display: grid;
    place-items: center;
    padding: 8px;
  }
  .signin {
    padding: 18px;
    display: flex;
    flex-direction: column;
  }
  .logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-size: 18pt;
    color: var(--aqua-deep);
    margin-bottom: 6px;
  }
  .logo-orb {
    width: 20px;
    height: 20px;
    margin-right: 3px;
  }
  .logo-orb.green {
    margin-right: 8px;
  }
  p {
    text-align: center;
    margin: 0 0 14px;
  }
  .btn {
    align-self: center;
    padding: 7px 28px;
    margin-top: 4px;
  }
</style>
