<script lang="ts">
  import type { User } from '$lib/types';

  let { user, size = 40, ring = false }: { user: User; size?: number; ring?: boolean } = $props();

  const initials = $derived(
    user.name
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase(),
  );

  const RING: Record<string, string> = {
    online: 'var(--orb-green)',
    busy: 'var(--orb-red)',
    phone: 'var(--orb-red)',
    offline: 'var(--orb-grey)',
  };
  const ringColor = $derived(RING[user.status] ?? 'var(--orb-amber)');
</script>

<div
  class="avatar"
  class:ring
  style="--h:{user.hue};--ring:{ringColor};width:{size}px;height:{size}px;font-size:{size * 0.38}px"
  title={user.name}
>
  <span>{initials}</span>
</div>

<style>
  /* Display picture: rounded glossy tile with initials. */
  .avatar {
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 22%;
    color: #fff;
    font-weight: 700;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
    background:
      linear-gradient(rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.05) 48%, transparent 50%),
      linear-gradient(160deg, hsl(var(--h) 80% 62%), hsl(calc(var(--h) + 40) 75% 42%));
    border: 2px solid #fff;
    box-shadow: 0 1px 4px rgba(0, 60, 70, 0.35);
    user-select: none;
  }
  .avatar.ring {
    box-shadow: 0 0 0 2px var(--ring), 0 1px 6px rgba(0, 60, 70, 0.4);
  }
</style>
