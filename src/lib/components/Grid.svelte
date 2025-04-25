<script lang="ts">
	import { writable, get, derived } from 'svelte/store';
	import {
		selectedTiles,
		currentWord,
		targetWords,
		foundWords,
		feedbackMap,
		trailColors
	} from '$lib/stores/game';
	import { onMount } from 'svelte';
	import { segmentTrail } from '$lib/utils/segment';
	import type { TilePosition } from '$lib/types';

	export let grid: string[][];

	const selecting = writable(false);
	let isDragging = false;

	const poppingTiles = writable<Set<string>>(new Set());

	const derivedRemainingLetters = derived(foundWords, ($found) => {
		const needed = targetWords
			.filter((w) => !$found.has(w))
			.join('')
			.split('');
		return new Set(needed);
	});

	const trailSegments = derived(selectedTiles, ($tiles) => {
		const segs = segmentTrail($tiles);
		let flat: { from: TilePosition; to: TilePosition; color: string }[] = [];
		segs.forEach((segment, i) => {
			const color = trailColors[i % trailColors.length];
			for (let j = 0; j < segment.length - 1; j++) {
				flat.push({ from: segment[j], to: segment[j + 1], color });
			}
		});
		return flat;
	});

	function isAdjacent(a: TilePosition, b: TilePosition): boolean {
		return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col)) === 1;
	}

	function handlePointerDown(row: number, col: number) {
		const letter = grid[row][col];
		if (!$derivedRemainingLetters.has(letter)) return;

		const trail = get(selectedTiles);
		const last = trail.at(-1);
		const already = trail.findIndex((p) => p.row === row && p.col === col);

		if (already !== -1) {
			const newTrail = trail.slice(0, already + 1);
			selectedTiles.set(newTrail);
			currentWord.set(newTrail.map((p) => grid[p.row][p.col]).join(''));
		} else if (!last || isAdjacent(last, { row, col })) {
			const newTrail = last ? [...trail, { row, col }] : [{ row, col }];
			selectedTiles.set(newTrail);
			currentWord.set(newTrail.map((p) => grid[p.row][p.col]).join(''));
		} else {
			selectedTiles.set([{ row, col }]);
			currentWord.set(grid[row][col]);
		}

		isDragging = true;
		selecting.set(true);
	}

	function handlePointerEnter(row: number, col: number) {
		if (!isDragging || !get(selecting)) return;
		const letter = grid[row][col];
		if (!$derivedRemainingLetters.has(letter)) return;

		const trail = get(selectedTiles);
		const last = trail.at(-1);
		const already = trail.findIndex((p) => p.row === row && p.col === col);

		if (already !== -1) {
			const newTrail = trail.slice(0, already + 1);
			selectedTiles.set(newTrail);
			currentWord.set(newTrail.map((p) => grid[p.row][p.col]).join(''));
		} else if (last && isAdjacent(last, { row, col })) {
			const newTrail = [...trail, { row, col }];
			selectedTiles.set(newTrail);
			currentWord.set(newTrail.map((p) => grid[p.row][p.col]).join(''));
		}
	}

	function triggerPopEffect(trail: TilePosition[]) {
		const keys = trail.map(({ row, col }) => `${row}-${col}`);
		poppingTiles.set(new Set(keys));
		setTimeout(() => {
			poppingTiles.set(new Set());
			selectedTiles.set([]);
			currentWord.set('');
			selecting.set(false);
		}, 350);
	}

	onMount(() => {
		const onUp = () => {
			const trail = get(selectedTiles);
			const word = trail.map(({ row, col }) => grid[row][col]).join('');
			console.log('Pointer up. Word:', word);

			if (targetWords.includes(word) && !get(foundWords).has(word)) {
				console.log('✅ Word found:', word);
				foundWords.update((s) => new Set([...s, word]));
				triggerPopEffect(trail);
			} else {
				isDragging = false;
				selecting.set(false);
			}
		};

		const clickAway = (e: MouseEvent) => {
			const hit = (e.target as HTMLElement).closest('.tile, .hitbox');
			if (!hit) {
				console.log('❌ Clicked outside. Clearing.');
				selectedTiles.set([]);
				currentWord.set('');
			}
		};

		window.addEventListener('pointerup', onUp);
		window.addEventListener('mousedown', clickAway);

		return () => {
			window.removeEventListener('pointerup', onUp);
			window.removeEventListener('mousedown', clickAway);
		};
	});
</script>

<!-- GRID WRAPPER -->
<div class="relative w-fit">
	<!-- BACKGROUND TILES -->
	<div class="relative z-0 grid grid-cols-4 gap-2">
		{#each grid as row, r}
			{#each row as letter, c}
				<div
					class="tile h-16 w-16 rounded border"
					class:bg-green-500={get(feedbackMap)[`${r}-${c}`] === 'correct'}
					class:bg-red-500={get(feedbackMap)[`${r}-${c}`] === 'wrong'}
					class:bg-white={!$selectedTiles.some((p) => p.row === r && p.col === c) &&
						get(feedbackMap)[`${r}-${c}`] !== 'correct' &&
						get(feedbackMap)[`${r}-${c}`] !== 'wrong' &&
						$derivedRemainingLetters.has(letter)}
					class:opacity-0={!$derivedRemainingLetters.has(letter)}
				></div>
			{/each}
		{/each}
	</div>

	<!-- TRAIL SVG -->
	<svg
		class="pointer-events-none absolute inset-0 z-10 h-full w-full"
		viewBox="0 0 4 4"
		preserveAspectRatio="none"
	>
		{#each $trailSegments as { from, to, color }}
			<line
				x1={from.col + 0.5}
				y1={from.row + 0.5}
				x2={to.col + 0.5}
				y2={to.row + 0.5}
				stroke={color}
				stroke-width="0.7"
				stroke-linecap="round"
			/>
		{/each}
	</svg>

	<!-- LETTERS -->
	<div class="pointer-events-none absolute inset-0 z-20 grid grid-cols-4 gap-2">
		{#each grid as row, r}
			{#each row as letter, c}
				<div
					class="flex h-16 w-16 items-center justify-center text-xl font-bold transition-opacity select-none"
					class:text-white={$selectedTiles.some((p) => p.row === r && p.col === c)}
					class:text-black={!$selectedTiles.some((p) => p.row === r && p.col === c) &&
						$derivedRemainingLetters.has(letter)}
					class:text-transparent={!$derivedRemainingLetters.has(letter)}
					class:animate-pop={$poppingTiles.has(`${r}-${c}`)}
				>
					{letter}
				</div>
			{/each}
		{/each}
	</div>

	<!-- HITBOXES -->
	<div class="absolute inset-0 z-30 grid grid-cols-4 gap-2">
		{#each grid as row, r}
			{#each row as letter, c}
				<div
					class="hitbox inset-3 h-16 w-16"
					class:cursor-pointer={$derivedRemainingLetters.has(letter)}
					class:cursor-default={!$derivedRemainingLetters.has(letter)}
					on:pointerdown={() => handlePointerDown(r, c)}
					on:pointerenter={() => handlePointerEnter(r, c)}
				></div>
			{/each}
		{/each}
	</div>
</div>

<style>
	@keyframes pop {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.25);
		}
		100% {
			transform: scale(1);
		}
	}

	.animate-pop {
		animation: pop 350ms ease-in-out;
	}
</style>
