<script lang="ts">
	import Grid from '$lib/components/Grid.svelte';
	import { currentWord, selectedTiles, targetWords, foundWords } from '$lib/stores/game';

	const letterGrid = [
		['T', 'O', 'P', 'A'],
		['H', 'G', 'E', 'W'],
		['S', 'I', 'N', 'E'],
		['B', 'K', 'Q', 'U']
	];
</script>

<main class="flex min-h-screen flex-col items-center justify-center bg-gray-100">
	<h1 class="mb-4 text-3xl font-bold">Mistari 🧠</h1>

	<p class="mb-2 text-xl text-gray-700">
		Word: <span class="font-mono text-black">{$currentWord}</span>
	</p>

	<Grid grid={letterGrid} />

	{#if $selectedTiles.length}
		<button
			class="mt-4 rounded bg-red-500 px-4 py-2 text-white"
			on:click={() => {
				selectedTiles.set([]);
				currentWord.set('');
			}}
		>
			Clear
		</button>
		<button
			class="mt-2 rounded bg-green-600 px-4 py-2 text-white"
			on:click={() => {
				if (targetWords.includes($currentWord.toUpperCase())) {
					foundWords.update((set) => new Set([...set, $currentWord.toUpperCase()]));
				}
				selectedTiles.set([]);
				currentWord.set('');
			}}
		>
			Submit Word
		</button>
	{/if}

	<p class="mt-4 text-lg">Found: {$foundWords.size} / {targetWords.length}</p>
	<ul class="mt-2 flex flex-wrap gap-2">
		{#each [...$foundWords] as word}
			<li class="rounded bg-green-200 px-2 py-1">{word}</li>
		{/each}
	</ul>
</main>
