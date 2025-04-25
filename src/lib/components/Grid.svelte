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

	// === Configurable Constants ===
	export const SWIPE_THRESHOLD_RATIO = 0.3;
	export const TRAIL_LINE_WIDTH = 64; // px
	export const TILE_SIZE = 84; // px
	export const GAP_SIZE = 8; // px

	// Derived dimensions
	const tileSpacing = TILE_SIZE + GAP_SIZE;
	const svgWidth = grid[0].length * TILE_SIZE + (grid[0].length - 1) * GAP_SIZE;
	const svgHeight = grid.length * TILE_SIZE + (grid.length - 1) * GAP_SIZE;

	function tileCenterPx(row: number, col: number) {
		return {
			x: col * tileSpacing + TILE_SIZE / 2,
			y: row * tileSpacing + TILE_SIZE / 2
		};
	}

	const selecting = writable(false);
	let isDragging = false;
	const poppingTiles = writable<Set<string>>(new Set());

	const derivedRemainingLetters = derived(
		foundWords,
		($found) =>
			new Set(
				targetWords
					.filter((w) => !$found.has(w))
					.join('')
					.split('')
			)
	);

	const trailSegments = derived(selectedTiles, ($tiles) =>
		segmentTrail($tiles).flatMap((segment, i) => {
			const color = trailColors[i % trailColors.length];
			return segment.slice(0, -1).map((from, j) => ({
				from,
				to: segment[j + 1],
				color
			}));
		})
	);

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
		const { left, top, width } = tile.getBoundingClientRect();
		const dx = event.clientX - (left + width / 2);
		const dy = event.clientY - (top + width / 2);
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

	function handleTouchMove(row: number, col: number, e: TouchEvent) {
		if (!isDragging || !get(selecting)) return;
		const touch = e.changedTouches[0];
		const synthetic = {
			clientX: touch.clientX,
			clientY: touch.clientY,
			currentTarget: e.currentTarget as HTMLElement
		} as unknown as PointerEvent;
		handlePointerEnter(row, col, synthetic);
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
		window.addEventListener('touchend', onUp);
		window.addEventListener('mousedown', clickAway);
		return () => {
			window.removeEventListener('pointerup', onUp);
			window.removeEventListener('touchend', onUp);
			window.removeEventListener('mousedown', clickAway);
		};
	});
</script>

<!-- Container sized exactly to grid -->
<div class="relative" style="width: {svgWidth}px; height: {svgHeight}px;">
	<!-- Background Tiles -->
	<div
		class="absolute inset-0 grid"
		style="grid-template-columns: repeat({grid[0].length}, {TILE_SIZE}px); gap: {GAP_SIZE}px;"
	>
		{#each grid as row, r}
			{#each row as letter, c}
				<div
					class="tile rounded bg-gray-200"
					style="width: {TILE_SIZE}px; height: {TILE_SIZE}px;"
					class:bg-green-500={get(feedbackMap)[`${r}-${c}`] === 'correct'}
					class:bg-red-500={get(feedbackMap)[`${r}-${c}`] === 'wrong'}
					class:opacity-0={!$derivedRemainingLetters.has(letter)}
				></div>
			{/each}
		{/each}
	</div>

	<!-- Overlay SVG for trail -->
	<svg class="pointer-events-none absolute inset-0" width={svgWidth} height={svgHeight}>
		{#if $selectedTiles.length > 0}
			{@const p = tileCenterPx($selectedTiles[0].row, $selectedTiles[0].col)}
			<line
				x1={p.x}
				y1={p.y}
				x2={p.x}
				y2={p.y}
				stroke={trailColors[0]}
				stroke-width={TRAIL_LINE_WIDTH}
				stroke-linecap="round"
				vector-effect="non-scaling-stroke"
				in:draw={{ duration: 200 }}
			/>
		{/if}

		{#each $trailSegments as { from, to, color } (`${from.row}-${from.col}-${to.row}-${to.col}`)}
			{@const a = tileCenterPx(from.row, from.col)}
			{@const b = tileCenterPx(to.row, to.col)}
			<line
				x1={a.x}
				y1={a.y}
				x2={b.x}
				y2={b.y}
				stroke={color}
				stroke-width={TRAIL_LINE_WIDTH}
				stroke-linecap="round"
				vector-effect="non-scaling-stroke"
				in:draw={{ duration: 250 }}
				out:draw={{ duration: 200 }}
			/>
		{/each}
	</svg>

	<!-- Letters Layer -->
	<div
		class="pointer-events-none absolute inset-0 grid"
		style="grid-template-columns: repeat({grid[0].length}, {TILE_SIZE}px); gap: {GAP_SIZE}px;"
	>
		{#each grid as row, r}
			{#each row as letter, c}
				<div
					class="flex items-center justify-center font-bold transition-opacity select-none"
					style="width: {TILE_SIZE}px; height: {TILE_SIZE}px; font-size: {TILE_SIZE * 0.5}px;"
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

	<!-- Interaction Layer with Pointer & Touch -->
	<div
		class="absolute inset-0 grid"
		style="grid-template-columns: repeat({grid[0].length}, {TILE_SIZE}px); gap: {GAP_SIZE}px;"
	>
		{#each grid as row, r}
			{#each row as letter, c}
				<div
					class="hitbox"
					style="width: {TILE_SIZE}px; height: {TILE_SIZE}px;"
					class:cursor-pointer={$derivedRemainingLetters.has(letter)}
					class:cursor-default={!$derivedRemainingLetters.has(letter)}
					on:pointerdown={() => handlePointerDown(r, c)}
					on:pointermove={(e) => handlePointerEnter(r, c, e)}
					on:touchstart|preventDefault={() => handlePointerDown(r, c)}
					on:touchmove|preventDefault={(e) => handleTouchMove(r, c, e)}
				/>
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
