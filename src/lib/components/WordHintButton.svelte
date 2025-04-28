<script lang="ts">
	import { hintTarget, foundWords, hintFlashWord } from '$lib/stores/game';

	export let word: string;
	export let grid: string[][];

	// Reactive derived values
	$: isFound = $foundWords.has(word);
	$: isFlashing = $hintFlashWord === word;

	// When clicked, flash hint at first matching letter
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
	<span class="hint-found" class:animate-hintflash={isFlashing}>
		{word}
	</span>
{:else}
	<button
		on:click={showHint}
		class="hint-button"
		style="width: calc(({word.length}ch * 1.75) + 16px)"
	>
		{word.length}
	</button>
{/if}

<style>
	/* Found Word Appearance */
	.hint-found {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 1.5rem; /* 6 Tailwind units */
		padding: 0 0.5rem;
		border-radius: 9999px; /* full pill */
		background-color: #26c04c;
		color: white;
		font-weight: bold;
		font-size: 1rem;
		text-align: center;
		transition: all 0.3s ease;
	}

	/* Button to reveal hint */
	.hint-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 1.5rem;
		padding: 0 0.5rem;
		border-radius: 9999px;
		background-color: #e5e7eb; /* gray-200 */
		color: black;
		font-size: 1.125rem; /* text-lg */
		text-align: center;
		transition: all 0.3s ease;
	}

	/* Pop Animation for Found Hints */
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
