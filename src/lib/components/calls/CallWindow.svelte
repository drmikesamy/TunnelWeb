<script lang="ts">
  import { MonitorUp } from '@lucide/svelte';
  import type { DesktopWindow } from '$lib/stores/windows.svelte';
  import { calls } from '$lib/stores/calls.svelte';
  import { contacts } from '$lib/stores/contacts.svelte';
  import { conversations } from '$lib/stores/conversations.svelte';
  import { session } from '$lib/stores/session.svelte';
  import { formatDuration } from '$lib/format';
  import { media } from '$lib/media/engine.svelte';
  import { viewport } from '$lib/stores/viewport.svelte';
  import Window from '../common/Window.svelte';
  import CallTile from './CallTile.svelte';
  import CallControls from './CallControls.svelte';

  let { win }: { win: DesktopWindow } = $props();

  const call = $derived(calls.active?.id === win.refId ? calls.active : null);
  const conv = $derived(call ? conversations.get(call.conversationId) : undefined);
  const remote = $derived(call ? contacts.getMany(call.participantIds) : []);
  const people = $derived(remote.length + 1);
  // Phones are tall and narrow: one column for a 1:1 call, two for groups.
  const cols = $derived(viewport.mobile ? (people <= 2 ? 1 : 2) : Math.ceil(Math.sqrt(people)));
  const title = $derived(
    `${call?.media === 'video' ? 'Video' : 'Voice'} call – ${conv ? conversations.title(conv) : remote.map((u) => u.name).join(', ')}`,
  );

  // Call timer
  let now = $state(Date.now());
  $effect(() => {
    const t = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(t);
  });

</script>

{#if call}
  <Window {win} {title} width={remote.length > 2 ? 760 : 620} height={remote.length > 2 ? 580 : 480} onclose={() => calls.hangup()}>
    <div class="call">
      <div class="status">
        {#if call.state === 'outgoing'}
          <span class="ringing">📞 Calling {remote.map((u) => u.name.split(' ')[0]).join(', ')}…</span>
        {:else}
          <span class="live">● Connected</span> · {formatDuration(now - (call.startedAt ?? now))}
          · {remote.length + 1} people
        {/if}
        {#if media.error}<span class="warn">⚠ {media.error}</span>{/if}
        {#if call.media === 'video' && !media.supported}<span class="warn">⚠ This browser can't send or show video (no WebCodecs).</span>{/if}
        {#if call.sharing}<span class="sharing"><MonitorUp size={12} /> You are sharing your screen</span>{/if}
      </div>

      <div class="grid" style="--cols:{cols}">
        {#each remote as u (u.id)}
          <CallTile
            user={u}
            video={call.media === 'video' && call.state === 'active'}
            speaking={call.speakingId === u.id}
            compact={remote.length > 3}
          />
        {/each}
        <CallTile
          user={session.me}
          isMe
          video={call.media === 'video' && call.cameraOn}
          speaking={call.speakingId === session.me.id}
          muted={call.muted}
          stream={media.localStream}
          compact={remote.length > 3}
        />
      </div>

      <CallControls {call} />
    </div>
  </Window>
{/if}

<style>
  .call {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background:
      radial-gradient(ellipse at 50% 0%, rgba(0, 222, 221, 0.35), transparent 60%),
      linear-gradient(#0b4a55, #062a31);
    color: #fff;
  }
  .status {
    padding: 8px 12px;
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
  }
  .warn {
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(245, 166, 35, 0.75);
  }
  .live {
    color: #7dff9a;
    font-weight: 700;
  }
  .ringing {
    animation: blink 1.2s ease-in-out infinite;
  }
  .sharing {
    margin-left: auto;
    display: inline-flex;
    gap: 4px;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(45, 184, 45, 0.6);
  }
  .grid {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: repeat(var(--cols), 1fr);
    grid-auto-rows: 1fr;
    gap: 8px;
    padding: 0 10px;
  }
  @keyframes blink {
    50% { opacity: 0.5; }
  }
</style>
