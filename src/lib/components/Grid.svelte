<script lang="ts">
  import Tile from './Tile.svelte';
  export let grid: string[][];
</script>

<div class="grid grid-cols-4 gap-2">
  {#each grid as row, rowIndex}
    {#each row as letter, colIndex}
      <Tile {letter} row={rowIndex} col={colIndex} />
    {/each}
  {/each}
</div>
