<script lang="ts">
	import { hintTarget, foundWords } from '$lib/stores/game';

	export let word: string;
	export let grid: string[][];

	$: isFound = $foundWords.has(word);

	function showHint() {
		const letter = word[0];
		for (let r = 0; r < grid.length; r++) {
			for (let c = 0; c < grid[r].length; c++) {
				if (grid[r][c] === letter) {
					hintTarget.set({ row: r, col: c });
					setTimeout(() => hintTarget.set(null), 800);
					return;
				}
			}
		}
	}
</script>

{#if isFound}
	<span class="rounded-4xl border bg-green-200 px-3 font-mono text-lg">{word}</span>
{:else}
	<button
		on:click={showHint}
		class="inline-block rounded-4xl border bg-white text-center font-mono text-lg text-black transition hover:scale-105"
		style="width: calc({word.length}ch * 1.75)"
	>
		{word.length}
	</button>
{/if}
