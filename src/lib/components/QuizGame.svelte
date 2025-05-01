<script lang="ts">
	import Grid from './Grid.svelte';
	import WordHintButton from './WordHintButton.svelte';
	import { targetWords } from '$lib/stores/game';
	import type { Quiz } from '$lib/types';

	export let selectedQuiz: Quiz;
</script>

<div class="mb-8">
	<h1 class="text-xl font-bold text-[#25a746]">
		#{selectedQuiz.id.toString().padStart(3, '0')}
		{selectedQuiz.title}
	</h1>
	<h2 class="text-lg text-gray-500">by {selectedQuiz.author}</h2>
</div>

<Grid grid={selectedQuiz.grid} />

<div class="mt-8 flex flex-wrap gap-2">
	{#each [...$targetWords].sort((a, b) => a.length - b.length) as word (word)}
		<WordHintButton {word} grid={selectedQuiz.grid} />
	{/each}
</div>
