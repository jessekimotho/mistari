<script lang="ts">
	import { hintTarget, foundWords, hintFlashWord } from '$lib/stores/game';
	import { fade, scale } from 'svelte/transition';

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
		in:scale={{ duration: 300 }}
		out:fade={{ duration: 150 }}
		class="text-md inline-flex h-6 items-center justify-center rounded-4xl bg-[#26c04c] px-8 font-bold text-white transition-all"
		class:flashing={isFlashing}
	>
		{word}
	</span>
{:else}
	<button
		on:click={showHint}
		class="inline-flex h-6 items-center justify-center rounded-4xl bg-gray-200 text-lg text-black"
		style="width: calc(({word.length}ch * 1.75) + 16px)"
	>
		{word.length}
	</button>
{/if}

<style>
	@keyframes hintflash {
		0%,
		100% {
			transform: scale(1);
			box-shadow: 0 0 0 rgba(0, 0, 0, 0);
		}
		50% {
			transform: scale(1.15);
			box-shadow: 0 0 6px rgba(38, 192, 76, 0.8);
		}
	}
	.flashing {
		animation: hintflash 600ms ease-in-out;
	}
</style>
