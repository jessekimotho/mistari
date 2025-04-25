<script lang="ts">
	import { writable, get, derived } from 'svelte/store';
	import { draw } from 'svelte/transition';
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
		const flat: { from: TilePosition; to: TilePosition; color: string }[] = [];
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
		if (!get(derivedRemainingLetters).has(letter)) return;

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

	function isInsideSwipeThreshold(event: PointerEvent, row: number, col: number): boolean {
		const tile = event.currentTarget as HTMLElement;
		const rect = tile.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;

		const dx = event.clientX - centerX;
		const dy = event.clientY - centerY;
		const distance = Math.sqrt(dx * dx + dy * dy);

		return distance < rect.width * 0.3;
	}

	function handlePointerEnter(row: number, col: number, event: PointerEvent) {
		if (!isDragging || !get(selecting)) return;

		// Check if the pointer is close enough to center during swipe
		if (!isInsideSwipeThreshold(event, row, col)) return;

		const letter = grid[row][col];
		if (!get(derivedRemainingLetters).has(letter)) return;

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

			if (targetWords.includes(word) && !get(foundWords).has(word)) {
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
	<!-- Background Tiles -->
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

	<!-- Trail Lines -->
	<svg
		class="pointer-events-none absolute inset-0 z-10 h-full w-full"
		viewBox="0 0 4 4"
		preserveAspectRatio="none"
	>
		{#if $selectedTiles.length > 0}
			<circle
				cx={$selectedTiles[0].col + 0.5}
				cy={$selectedTiles[0].row + 0.5}
				r="0.2"
				fill={trailColors[0]}
				in:draw={{ duration: 200 }}
			/>
		{/if}

		{#each $trailSegments as { from, to, color } (`${from.row}-${from.col}-${to.row}-${to.col}`)}
			<line
				x1={from.col + 0.5}
				y1={from.row + 0.5}
				x2={to.col + 0.5}
				y2={to.row + 0.5}
				stroke={color}
				stroke-width="0.7"
				stroke-linecap="round"
				in:draw={{ duration: 250 }}
				out:draw={{ duration: 200 }}
			/>
		{/each}
	</svg>

	<!-- Letters -->
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

	<!-- Hitboxes (single-layer) -->
	<div class="absolute inset-0 z-30 grid grid-cols-4 gap-2">
		{#each grid as row, r}
			{#each row as letter, c}
				<div
					class="hitbox inset-3 h-16 w-16"
					class:cursor-pointer={$derivedRemainingLetters.has(letter)}
					class:cursor-default={!$derivedRemainingLetters.has(letter)}
					on:pointerdown={() => handlePointerDown(r, c)}
					on:pointermove={(e) => handlePointerEnter(r, c, e)}
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
