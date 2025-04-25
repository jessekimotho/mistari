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
	<span
		class="just-fy-center text-md inline-flex items-center rounded-4xl bg-[#26c04c] px-8 text-center font-bold text-white"
		>{word}</span
	>
{:else}
	<button
		on:click={showHint}
		class="inline-flex items-center justify-center rounded-4xl bg-gray-200 text-center text-lg text-black transition hover:scale-105"
		style="width: calc(({word.length}ch * 1.75) + 16px)"
	>
		{word.length}
	</button>
{/if}
