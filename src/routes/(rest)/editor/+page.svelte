<script lang="ts">
	import { onMount } from 'svelte';
	import PuzzleWorker from '$lib/worker/puzzle.worker.ts?worker';

	let worker: Worker;
	let loading = false;
	let words: string[] = ['PAWN', 'BISHOP', 'KNIGHT', 'QUEEN', 'KING'];
	let newWord = '';
	let grid: string[][] = [];
	let placed: string[] = [];
	let skipped: string[] = [];

	function generate() {
		loading = true;
		worker = new PuzzleWorker();
		worker.postMessage({ words });
		worker.onmessage = (e) => {
			const { grid: g, placed: p, skipped: s } = e.data;
			grid = g;
			placed = p;
			skipped = s;
			loading = false;
			worker.terminate();
		};
	}

	function addWord() {
		const w = newWord.trim().toUpperCase();
		if (w && !words.includes(w)) words = [...words, w];
		newWord = '';
	}
	function removeWord(i: number) {
		words = words.filter((_, idx) => idx !== i);
	}

	onMount(generate);
</script>

<main>
	<div class="controls">
		<input
			placeholder="Add word"
			bind:value={newWord}
			on:keydown={(e) => e.key === 'Enter' && addWord()}
		/>
		<button on:click={addWord}>Add</button>
		<button on:click={generate} disabled={loading || words.length < 4}>Generate</button>
	</div>

	<div class="controls">
		{#each words as w, i}
			<span class="word {skipped.includes(w) ? 'skipped' : 'placed'}">
				{w} <button on:click={() => removeWord(i)}>✕</button>
			</span>
		{/each}
	</div>

	{#if loading}
		<p style="text-align:center;">Generating…</p>
	{:else}
		<div class="grid">
			{#each grid as row}
				{#each row as letter}
					<div class="tile">{letter}</div>
				{/each}
			{/each}
		</div>
		<div class="controls">
			<p><span class="placed">Placed:</span> {placed.join(', ')}</p>
			<p><span class="skipped">Problematic:</span> {skipped.join(', ')}</p>
		</div>
	{/if}
</main>

<style>
	.controls {
		text-align: center;
		margin: 1rem;
	}
	.word {
		display: inline-block;
		margin: 0.25rem;
		padding: 0.25rem 0.5rem;
		background: #ddd;
		border-radius: 0.25rem;
	}
	.placed {
		color: green;
	}
	.skipped {
		color: red;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.25rem;
		max-width: 200px;
		margin: 1rem auto;
	}
	.tile {
		background: #eee;
		padding: 1rem;
		text-align: center;
		font-size: 1.2rem;
		font-weight: 600;
	}
</style>
