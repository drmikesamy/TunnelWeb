<script lang="ts">
  import type { Status } from '$lib/types';
  import { STATUS_LABELS } from '$lib/format';

  let { status, size = 12 }: { status: Status; size?: number } = $props();

  // Orb artwork per status (see .orb in theme.css; red and grey are tinted).
  const COLOR: Record<Status, string> = {
    online: 'green',
    busy: 'red',
    phone: 'red',
    away: 'orange',
    brb: 'orange',
    lunch: 'orange',
    offline: 'grey',
  };
</script>

<span
  class="orb {COLOR[status]}"
  style="width:{size}px;height:{size}px"
  title={STATUS_LABELS[status]}
  role="img"
  aria-label={STATUS_LABELS[status]}
></span>

<style>
  span {
    flex: none;
    vertical-align: middle;
  }
</style>
