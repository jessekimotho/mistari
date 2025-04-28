<script lang="ts">
	import { hintTarget, foundWords, hintFlashWord } from '$lib/stores/game';

	export let word: string;
	export let grid: string[][];

	$: isFound = $foundWords.has(word);
	$: isFlashing = $hintFlashWord === word;

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
		class="text-md inline-flex h-6 items-center justify-center rounded-4xl bg-[#26c04c] px-8 text-center font-bold text-white transition-all"
		class:animate-hintflash={isFlashing}>{word}</span
	>
{:else}
	<button
		on:click={showHint}
		class="inline-flex h-6 items-center justify-center rounded-4xl bg-gray-200 text-center text-lg text-black"
		style="width: calc(({word.length}ch * 1.75) + 16px)"
	>
		{word.length}
	</button>
{/if}

<style>
	@keyframes hintflash {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.2);
		}
		100% {
			transform: scale(1);
		}
	}
	.animate-hintflash {
		animation: hintflash 600ms ease-in-out;
	}
</style>
