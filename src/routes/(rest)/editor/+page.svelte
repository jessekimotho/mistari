<script lang="ts">
	import { onMount } from 'svelte';
	import { runParallelPuzzle } from '$lib/worker/puzzle-runner';
	import { N } from '$lib/worker/puzzle-logic';
	import type { TilePosition } from '$lib/types';

	let meta:
		| {
				timeMs: number;
				retries: number;
				placedCount: number;
				usedTiles: number;
				wordPaths: Record<string, TilePosition[]>;
		  }
		| undefined = undefined;

	let loading = false;
	let words: string[] = [];
	let newWord = '';
	let grid: string[][] = [];
	let placed: string[] = [];
	let skipped: string[] = [];
	let wordWarnings: string[] = [];
	let allowForceGenerate = false;
	let title = 'New Puzzle';
	let author = 'jesse';

	function validateWords(wordList: string[]) {
		const problems: string[] = [];

		for (const word of wordList) {
			if (word.length > N * N) {
				problems.push(`❌ ${word} is too long for a ${N}×${N} grid.`);
			} else if (word.length < 4) {
				problems.push(`❌ ${word} is too short (min 4 letters).`);
			}
		}

		const allLetters = wordList.join('').split('');
		const freqMap = new Map<string, number>();
		allLetters.forEach((l) => freqMap.set(l, (freqMap.get(l) || 0) + 1));
		for (const word of wordList) {
			const unique = new Set(word);
			const overlap = [...unique].filter((ch) => (freqMap.get(ch) || 0) > 1);
			if (overlap.length === 0) {
				problems.push(`⚠️ ${word} has no letters in common with any other word.`);
			}
		}

		return problems;
	}

	async function generate() {
		wordWarnings = validateWords(words);
		if (wordWarnings.length > 0 && !allowForceGenerate) return;

		loading = true;
		const result = await runParallelPuzzle(words, 4);
		const { grid: g, placed: p, skipped: s, meta: m } = result;
		grid = g;
		placed = p;
		skipped = s;
		meta = m;
		loading = false;
		allowForceGenerate = false;
	}

	function addWord() {
		const entries = newWord
			.split(',')
			.map((w) => w.trim().toUpperCase())
			.filter(Boolean);
		words = [...new Set([...words, ...entries.filter((w) => !words.includes(w))])];
		newWord = '';
	}

	function removeWord(i: number) {
		words = words.filter((_, idx) => idx !== i);
	}

	function exportQuizBlock(): string {
		return `{
  id: __REPLACE_ME__,
  title: '${title}',
  author: '${author}',
  grid: ${JSON.stringify(grid)},
  solutions: ${JSON.stringify(placed)},
  paths: ${JSON.stringify(meta?.wordPaths ?? {}, null, 2)}
},`;
	}

	onMount(generate);
</script>

<main>
	<div class="controls">
		<input placeholder="Title" bind:value={title} />
		<input placeholder="Author" bind:value={author} />
		<input
			placeholder="Add word(s), comma-separated or single"
			bind:value={newWord}
			on:keydown={(e) => e.key === 'Enter' && addWord()}
		/>
		<div class="buttons flex flex-col">
			<button on:click={addWord}>Add</button>
			<button on:click={generate} disabled={loading || words.length < 4}>Generate</button>
			<button on:click={() => ((words = []), (newWord = ''))} disabled={loading}>Clear Words</button
			>
		</div>

		{#if wordWarnings.length > 0 && !allowForceGenerate}
			<div class="controls" style="color: darkred; font-size: 0.9rem;">
				<p><strong>⚠️ Please fix the following issues:</strong></p>
				<ul>
					{#each wordWarnings as w}
						<li>{w}</li>
					{/each}
				</ul>
				<button on:click={() => (allowForceGenerate = true)}>⚠️ Force generate anyway</button>
			</div>
		{/if}

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
			{#if meta}
				<div class="controls" style="font-size: 0.9rem;">
					<p>⏱️ Time taken: {meta.timeMs.toFixed(1)} ms</p>
					<p>🔁 Retries: {meta.retries}</p>
					<p>🧩 Words placed: {meta.placedCount}</p>
					<p>🔡 Grid usage: {meta.usedTiles}/16 tiles</p>
				</div>
			{/if}

			{#if grid.length > 0 && placed.length > 0}
				<div class="controls">
					<p><strong>🧩 Copy this to <code>quizzes.ts</code>:</strong></p>
					<textarea readonly rows={10} style="width:100%; max-width:600px;"
						>{exportQuizBlock()}</textarea
					>
				</div>
			{/if}
		{/if}
	</div>
</main>

<style>
	:global(body) {
		user-select: default;
	}
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
	textarea {
		width: 100%;
		font-family: monospace;
		white-space: pre;
		margin-top: 0.5rem;
	}
</style>
