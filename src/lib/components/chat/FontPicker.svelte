<script lang="ts">
  import { Bold, Italic, Type } from '@lucide/svelte';
  import { CHAT_FONTS, FONT_SIZES, fontStyle } from '$lib/fonts';
  import { session } from '$lib/stores/session.svelte';
  import Popover from '../common/Popover.svelte';

  const font = $derived(session.me.font);
</script>

<Popover>
  {#snippet trigger(toggle)}
    <button class="tool" title="Change font" onclick={toggle}><Type size={16} /></button>
  {/snippet}
  {#snippet children()}
    <div class="font-picker">
      <div class="row">
        <select value={font.family} onchange={(e) => session.setFont({ family: e.currentTarget.value })}>
          {#each Object.keys(CHAT_FONTS) as family (family)}
            <option value={family} style="font-family:{CHAT_FONTS[family]}">{family}</option>
          {/each}
        </select>
        <select value={font.size} onchange={(e) => session.setFont({ size: +e.currentTarget.value })}>
          {#each FONT_SIZES as size (size)}<option value={size}>{size}</option>{/each}
        </select>
      </div>
      <div class="row">
        <button class="tool" class:pressed={font.bold} title="Bold" onclick={() => session.setFont({ bold: !font.bold })}><Bold size={14} /></button>
        <button class="tool" class:pressed={font.italic} title="Italic" onclick={() => session.setFont({ italic: !font.italic })}><Italic size={14} /></button>
        <label class="color">
          Colour
          <input type="color" value={font.color} oninput={(e) => session.setFont({ color: e.currentTarget.value })} />
        </label>
      </div>
      <div class="preview" style={fontStyle(font)}>The quick brown fox 🦊</div>
    </div>
  {/snippet}
</Popover>

<style>
  .font-picker {
    width: 240px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .row {
    display: flex;
    gap: 4px;
    align-items: center;
  }
  .row select:first-child {
    flex: 1;
  }
  .color {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
  }
  .color input {
    width: 28px;
    height: 22px;
    padding: 0;
    border: none;
    background: none;
  }
  .preview {
    padding: 6px;
    background: #fff;
    border-radius: 4px;
    border: 1px solid #cde;
  }
</style>
