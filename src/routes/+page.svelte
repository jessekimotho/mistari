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

<main class="flex min-h-screen items-center justify-center bg-gray-100">
	<main class="flex min-h-screen max-w-[360px] flex-col items-center justify-center bg-gray-100">
		<div class="header mt-8 mb-4 flex w-full">
			<h1 class=" text-3xl font-bold"><img class="logo" src="/mistari.png" alt="" /></h1>
		</div>
		<div class="rest-of-content flex grow flex-col items-center justify-center bg-gray-100">
			<div class="mb-12 flex w-full flex-col">
				<h1 class="text-xl font-bold text-[#25a746]">#001 Chess Pieces</h1>
				<h2 class="author text-lg text-gray-500">by jesse</h2>
			</div>

			<Grid {grid} />

			<div class="mt-12 flex flex-wrap gap-2">
				{#each [...targetWords].sort((a, b) => a.length - b.length) as word (word)}
					<WordHintButton {word} {grid} />
				{/each}
			</div>
		</div>
	</main>
</main>

<style>
	.logo {
		width: 48px;
		height: 48px;
		padding: 8px;
		border-radius: 200px;
		background: rgb(229 231 235);
	}
</style>
