<script lang="ts">
	import { writable, get, derived } from 'svelte/store';
	import { draw } from 'svelte/transition';
	import { onMount } from 'svelte';
	import {
		selectedTiles,
		currentWord,
		targetWords,
		foundWords,
		feedbackMap,
		trailColors
	} from '$lib/stores/game';
	import { segmentTrail } from '$lib/utils/segment';
	import type { TilePosition } from '$lib/types';

	export let grid: string[][];

	export const SWIPE_THRESHOLD_RATIO = 0.3;

	const selecting = writable(false);
	let isDragging = false;
	const poppingTiles = writable(new Set<string>());

	const derivedRemainingLetters = derived(foundWords, ($found) => {
		return new Set(
			targetWords
				.filter((w) => !$found.has(w))
				.join('')
				.split('')
		);
	});

	const trailSegments = derived(selectedTiles, ($tiles) => {
		return segmentTrail($tiles).flatMap((segment, i) => {
			const color = trailColors[i % trailColors.length];
			return segment.slice(0, -1).map((from, j) => ({
				from,
				to: segment[j + 1],
				color
			}));
		});
	});

	function isAdjacent(a: TilePosition, b: TilePosition): boolean {
		return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col)) === 1;
	}

	function updateTrail(row: number, col: number) {
		const trail = get(selectedTiles);
		const last = trail.at(-1);
		const index = trail.findIndex((p) => p.row === row && p.col === col);

		let newTrail;
		if (index !== -1) newTrail = trail.slice(0, index + 1);
		else if (!last || isAdjacent(last, { row, col })) newTrail = [...trail, { row, col }];
		else newTrail = [{ row, col }];

		selectedTiles.set(newTrail);
		currentWord.set(newTrail.map((p) => grid[p.row][p.col]).join(''));
	}

	function isInsideSwipeThreshold(event: PointerEvent, row: number, col: number): boolean {
		const tile = event.currentTarget as HTMLElement;
		const { left, top, width, height } = tile.getBoundingClientRect();
		const dx = event.clientX - (left + width / 2);
		const dy = event.clientY - (top + height / 2);
		return Math.hypot(dx, dy) < width * SWIPE_THRESHOLD_RATIO;
	}

	function handlePointerDown(row: number, col: number) {
		if (!get(derivedRemainingLetters).has(grid[row][col])) return;
		updateTrail(row, col);
		isDragging = true;
		selecting.set(true);
	}

	function handlePointerEnter(row: number, col: number, event: PointerEvent) {
		if (!isDragging || !get(selecting)) return;
		if (!isInsideSwipeThreshold(event, row, col)) return;
		if (!get(derivedRemainingLetters).has(grid[row][col])) return;

		const trail = get(selectedTiles);
		const last = trail.at(-1);
		if (
			trail.some((p) => p.row === row && p.col === col) ||
			(last && isAdjacent(last, { row, col }))
		) {
			updateTrail(row, col);
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
			if (!(e.target as HTMLElement).closest('.tile, .hitbox')) {
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
					class="tile tile-dimensions rounded bg-white"
					class:bg-green-500={get(feedbackMap)[`${r}-${c}`] === 'correct'}
					class:bg-red-500={get(feedbackMap)[`${r}-${c}`] === 'wrong'}
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
					class="tile-font tile-dimensions flex items-center justify-center font-bold transition-opacity select-none"
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
					class="hitbox tile-dimensions"
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
	.tile-dimensions {
		width: 84px;
		height: 84px;
	}
	.tile-font {
		font-size: 42px;
	}
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
