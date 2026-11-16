<script lang="ts">
  import { MicOff } from '@lucide/svelte';
  import type { User } from '$lib/types';
  import Avatar from '../common/Avatar.svelte';
  import { media } from '$lib/media/engine.svelte';

  let {
    user,
    isMe = false,
    video = false,
    speaking = false,
    muted = false,
    stream = null,
    compact = false,
  }: {
    user: User;
    isMe?: boolean;
    video?: boolean;
    speaking?: boolean;
    muted?: boolean;
    stream?: MediaStream | null;
    compact?: boolean;
  } = $props();

  let videoEl = $state<HTMLVideoElement>();
  $effect(() => {
    if (videoEl) videoEl.srcObject = stream;
  });

  // Live remote video: the engine draws decoded frames into this canvas.
  let canvas = $state<HTMLCanvasElement>();
  const remoteLive = $derived(!isMe);
  $effect(() => {
    if (remoteLive && canvas) return media.attachCanvas(user.id, canvas);
  });
  const showCanvas = $derived(remoteLive && !!media.remoteVideo[user.id]);
</script>

<div class="tile" class:video class:speaking style="--h:{user.hue}">
  {#if remoteLive}
    <canvas bind:this={canvas} class:hidden={!showCanvas}></canvas>
  {/if}
  {#if video && stream}
    <video bind:this={videoEl} autoplay muted playsinline></video>
  {:else if !showCanvas}
    <!-- No video (yet): display picture on a tinted background. -->
    <div class="backdrop"></div>
    <div class="avatar-wrap"><Avatar {user} size={compact ? 56 : 84} /></div>
  {/if}
  <div class="label">
    {#if muted}<MicOff size={12} />{/if}
    {isMe ? 'You' : user.name}
  </div>
</div>

<style>
  .tile {
    position: relative;
    overflow: hidden;
    border-radius: 12px;
    border: 2px solid rgba(255, 255, 255, 0.8);
    background: rgba(0, 60, 70, 0.35);
    min-height: 120px;
    display: grid;
    place-items: center;
    transition: box-shadow 0.2s;
  }
  .tile.speaking {
    border-color: var(--orb-green);
    box-shadow: 0 0 0 2px var(--orb-green), 0 0 18px color-mix(in srgb, var(--orb-green) 60%, transparent);
  }
  .backdrop {
    position: absolute;
    inset: 0;
    background: linear-gradient(160deg, hsl(var(--h) 45% 30%), hsl(calc(var(--h) + 60) 50% 18%));
  }
  .avatar-wrap {
    position: relative;
    border-radius: 24%;
  }
  .speaking .avatar-wrap {
    animation: pulse-ring 1.2s ease-out infinite;
  }
  canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    background: #000;
  }
  canvas.hidden {
    display: none;
  }
  video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scaleX(-1); /* mirror your own camera */
  }
  .label {
    position: absolute;
    left: 8px;
    bottom: 6px;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 999px;
    color: #fff;
    font-weight: 600;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
  }
</style>
