<script lang="ts" module>
  export interface MenuItem {
    label: string;
    onclick: () => void;
  }
  export interface Menu {
    label: string;
    items: MenuItem[];
  }
</script>

<script lang="ts">

  let { menus }: { menus: Menu[] } = $props();

  function run(item: MenuItem, e: MouseEvent) {
    (e.currentTarget as HTMLElement).blur(); // closes the focus-driven menu
    item.onclick();
  }
</script>

<!-- Dropdowns open while their item has focus (click or Tab), so no JS state is needed. -->
<ul role="menubar">
  {#each menus as menu (menu.label)}
    <li role="menuitem" tabindex="0" aria-haspopup="true">
      {menu.label}
      <ul role="menu">
        {#each menu.items as item (item.label)}
          <li role="menuitem"><button class="bare" onclick={(e) => run(item, e)}>{item.label}</button></li>
        {/each}
      </ul>
    </li>
  {/each}
</ul>

<style>
  [role='menubar'] {
    position: relative;
    z-index: 100;
    display: flex;
    margin: 0;
    padding: 2px 4px;
    list-style: none;
    border-bottom: 1px solid rgba(0, 120, 130, 0.15);
    background: linear-gradient(#fff 40%, #eafbf6);
  }
  [role='menubar'] > li {
    position: relative;
    padding: 3px 9px;
    border-radius: 5px;
    cursor: default;
    outline: none;
  }
  [role='menubar'] > li:hover,
  [role='menubar'] > li:focus-within {
    color: #fff;
    background: linear-gradient(rgba(255, 255, 255, 0.35), transparent 55%), var(--aqua-deep);
  }
  [role='menu'] {
    display: none;
    position: absolute;
    top: calc(100% + 2px);
    left: 0;
    min-width: 190px;
    margin: 0;
    padding: 4px;
    list-style: none;
    color: var(--ink);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 0 0 1px rgba(0, 110, 120, 0.3), 0 8px 20px rgba(0, 70, 80, 0.25);
    backdrop-filter: blur(10px);
  }
  [role='menubar'] > li:focus-within > [role='menu'] {
    display: block;
  }
  [role='menu'] button {
    display: block;
    width: 100%;
    box-sizing: border-box;
    padding: 5px 10px;
    border-radius: 5px;
  }
  [role='menu'] button:hover,
  [role='menu'] button:focus-visible {
    background: linear-gradient(#f2fffc, #c9f4ea);
    box-shadow: inset 0 0 0 1px rgba(0, 170, 180, 0.4);
  }
</style>
