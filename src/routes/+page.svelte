<script lang="ts">
	import Grid from '$lib/components/Grid.svelte';
	import { currentWord, selectedTiles, targetWords, foundWords } from '$lib/stores/game';
	import WordHintButton from '$lib/components/WordHintButton.svelte';

	const grid = [
		['T', 'O', 'P', 'A'],
		['H', 'G', 'E', 'W'],
		['S', 'I', 'N', 'E'],
		['B', 'K', 'Q', 'U']
	];
</script>

<main class="flex min-h-screen flex-col items-center justify-center bg-gray-100">
	<h1 class="mb-4 text-3xl font-bold">Mistari 🧠</h1>

	<Grid {grid} />

	<div class="mt-2 flex flex-wrap justify-center gap-2">
		{#each [...targetWords].sort((a, b) => a.length - b.length) as word (word)}
			<WordHintButton {word} {grid} />
		{/each}
	</div>
</main>
