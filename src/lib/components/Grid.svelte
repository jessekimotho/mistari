<script lang="ts">
	import { writable, get, derived } from 'svelte/store';
	import { fade, draw } from 'svelte/transition';
	import { onMount } from 'svelte';
	import {
		selectedTiles,
		currentWord,
		targetWords,
		foundWords,
		feedbackMap,
		trailColors,
		hintFlashWord
	} from '$lib/stores/game';
	import { segmentTrail } from '$lib/utils/segment';
	import type { TilePosition } from '$lib/types';

	export let grid: string[][];
	let displayGrid = grid.map((row) => [...row]);

	// Config
	export const SWIPE_THRESHOLD_RATIO = 0.3;
	export const TRAIL_LINE_WIDTH = 64;
	export const TILE_SIZE = 84;
	export const GAP_SIZE = 8;

	// States
	const clearingTrail = writable(false);
	const trailIsAlreadyFound = writable(false);
	const allDone = writable(false);
	const selecting = writable(false);
	let isDragging = false;

	const poppingTiles = writable<Set<string>>(new Set());
	const usedTiles = writable<Set<string>>(new Set());

	// Computed
	const tileSpacing = TILE_SIZE + GAP_SIZE;
	$: svgWidth = displayGrid[0].length * TILE_SIZE + (displayGrid[0].length - 1) * GAP_SIZE;
	$: svgHeight = displayGrid.length * TILE_SIZE + (displayGrid.length - 1) * GAP_SIZE;

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

	const trailSegments = derived(selectedTiles, ($tiles) => {
		const segments = segmentTrail($tiles).flatMap((segment, i) => {
			const color = trailColors[i % trailColors.length];
			return segment.slice(0, -1).map((from, j) => ({
				from,
				to: segment[j + 1],
				color
			}));
		});

		// 🛠 NEW: Handle single-tile selection gracefully
		if ($tiles.length === 1) {
			const only = $tiles[0];
			segments.push({
				from: only,
				to: only,
				color: trailColors[0]
			});
		}

		return segments;
	});

	// Helpers
	function tileCenterPx(row: number, col: number) {
		return {
			x: col * tileSpacing + TILE_SIZE / 2,
			y: row * tileSpacing + TILE_SIZE / 2
		};
	}

	function isAdjacent(a: TilePosition, b: TilePosition): boolean {
		return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col)) === 1;
	}

	function updateTrail(row: number, col: number) {
		const trail = get(selectedTiles);
		const last = trail.at(-1);
		const index = trail.findIndex((p) => p.row === row && p.col === col);

		let newTrail;
		if (index !== -1) {
			newTrail = trail.slice(0, index + 1);
		} else if (!last || isAdjacent(last, { row, col })) {
			newTrail = [...trail, { row, col }];
		} else {
			newTrail = [{ row, col }];
		}

		selectedTiles.set(newTrail);
		currentWord.set(newTrail.map((p) => displayGrid[p.row][p.col]).join(''));

		const word = newTrail.map((p) => displayGrid[p.row][p.col]).join('');
		if (targetWords.includes(word)) {
			if (!get(foundWords).has(word)) {
				foundWords.update((s) => {
					const next = new Set([...s, word]);
					if (next.size === targetWords.length) {
						allDone.set(true);
						rearrangeFinalWord(word);
					}
					return next;
				});
				const used = get(usedTiles);
				for (const p of newTrail) {
					used.add(`${p.row}-${p.col}`);
				}
				usedTiles.set(new Set(used));

				triggerPopEffect(newTrail);
				isDragging = false;
				selecting.set(false);
			} else {
				triggerAlreadyFoundTrailEffect(newTrail);
				flashWordHint(word);
			}
		}
	}

	function triggerAlreadyFoundTrailEffect(trail: TilePosition[]) {
		trailIsAlreadyFound.set(true);
		setTimeout(() => {
			selectedTiles.set([]);
			currentWord.set('');
			trailIsAlreadyFound.set(false);
		}, 600);
	}

	function flashWordHint(word: string) {
		hintFlashWord.set(word);
		setTimeout(() => hintFlashWord.set(null), 800);
	}

	function handlePointerDown(row: number, col: number) {
		const letter = displayGrid[row][col];
		const remaining = get(derivedRemainingLetters);

		if (!remaining.has(letter)) {
			if (get(selectedTiles).length > 0) {
				selecting.set(false);
				isDragging = false;
				clearingTrail.set(true);
				setTimeout(() => {
					selectedTiles.set([]);
					currentWord.set('');
					clearingTrail.set(false);
				}, 300);
			}
			return;
		}

		updateTrail(row, col);
		isDragging = true;
		selecting.set(true);
	}

	function handlePointerEnter(row: number, col: number, event: PointerEvent) {
		if (!isDragging || !get(selecting)) return;

		const tile = event.currentTarget as HTMLElement;
		const { left, top, width } = tile.getBoundingClientRect();
		const dx = event.clientX - (left + width / 2);
		const dy = event.clientY - (top + width / 2);
		if (Math.hypot(dx, dy) > width * SWIPE_THRESHOLD_RATIO) return;

		const letter = displayGrid[row][col];
		if (!get(derivedRemainingLetters).has(letter)) return;

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
		const keys = trail.map((p) => `${p.row}-${p.col}`);
		poppingTiles.set(new Set(keys));
		setTimeout(() => {
			poppingTiles.set(new Set());
			selectedTiles.set([]);
			currentWord.set('');
			selecting.set(false);
		}, 350);
	}

	function rearrangeFinalWord(word: string) {
		const newGrid = displayGrid.map((r) => [...r]);
		const rowIdx = Math.floor(newGrid.length / 2);
		for (let i = 0; i < word.length && i < newGrid[rowIdx].length; i++) {
			newGrid[rowIdx][i] = word[i];
		}
		displayGrid = newGrid;
	}

	onMount(() => {
		const onUp = () => {
			isDragging = false;
			selecting.set(false);
		};

		const clickAway = (e: MouseEvent) => {
			if (!(e.target as HTMLElement).closest('.tile, .hitbox')) {
				selectedTiles.set([]);
				currentWord.set('');
				selecting.set(false);
				isDragging = false;
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

<!-- === Markup === -->
<div class="relative" style="width: {svgWidth}px; height: {svgHeight}px;">
	{#if $allDone}
		<div
			class="fixed top-0 left-0 z-10 flex h-full w-full flex-col items-center justify-center gap-2 bg-green-600 px-4 py-2 text-white shadow-lg"
			in:fade={{ duration: 300 }}
		>
			<div class="emoji text-4xl">🎉</div>
			You found all the words!
		</div>
	{/if}

	<!-- Background Tiles -->
	<div
		class="absolute inset-0 grid"
		style="grid-template-columns: repeat({displayGrid[0]
			.length}, {TILE_SIZE}px); gap: {GAP_SIZE}px;"
	>
		{#each displayGrid as row, r}
			{#each row as letter, c}
				<div
					class="tile rounded bg-gray-200"
					style="width: {TILE_SIZE}px; height: {TILE_SIZE}px;"
					class:bg-green-500={get(feedbackMap)[`${r}-${c}`] === 'correct'}
					class:bg-red-500={get(feedbackMap)[`${r}-${c}`] === 'wrong'}
					class:bg-blue-400={get(usedTiles).has(`${r}-${c}`)}
					class:opacity-0={!$derivedRemainingLetters.has(letter)}
				></div>
			{/each}
		{/each}
	</div>

	<!-- Trail SVG -->
	<svg class="pointer-events-none absolute inset-0" width={svgWidth} height={svgHeight}>
		{#each $trailSegments as { from, to, color } (`${from.row}-${from.col}-${to.row}-${to.col}`)}
			{@const a = tileCenterPx(from.row, from.col)}
			{@const b = tileCenterPx(to.row, to.col)}
			<line
				x1={a.x}
				y1={a.y}
				x2={b.x}
				y2={b.y}
				stroke={$trailIsAlreadyFound ? 'limegreen' : color}
				stroke-width={TRAIL_LINE_WIDTH}
				stroke-linecap="round"
				vector-effect="non-scaling-stroke"
				class:pulse-stroke={$trailIsAlreadyFound}
				class:fade-out-trail={$clearingTrail}
				in:draw={{ duration: 250 }}
				out:draw={{ duration: 200 }}
				style="--trail-width: {TRAIL_LINE_WIDTH}px;"
			/>
		{/each}
	</svg>

	<!-- Letters -->
	<div
		class="pointer-events-none absolute inset-0 grid"
		style="grid-template-columns: repeat({displayGrid[0]
			.length}, {TILE_SIZE}px); gap: {GAP_SIZE}px;"
	>
		{#each displayGrid as row, r}
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

	<!-- Hitboxes -->
	<div
		class="absolute inset-0 grid"
		style="grid-template-columns: repeat({displayGrid[0]
			.length}, {TILE_SIZE}px); gap: {GAP_SIZE}px;"
	>
		{#each displayGrid as row, r}
			{#each row as letter, c}
				<div
					class="hitbox"
					style="width: {TILE_SIZE}px; height: {TILE_SIZE}px; touch-action: none;"
					class:cursor-pointer={$derivedRemainingLetters.has(letter) &&
						!get(usedTiles).has(`${r}-${c}`)}
					class:cursor-default={!$derivedRemainingLetters.has(letter) ||
						get(usedTiles).has(`${r}-${c}`)}
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
	@keyframes pulseStroke {
		0% {
			stroke-width: var(--trail-width);
		}
		50% {
			stroke-width: calc(var(--trail-width) + 12px);
		}
		100% {
			stroke-width: var(--trail-width);
		}
	}
	.pulse-stroke {
		animation: pulseStroke 600ms ease-in-out;
	}
	@keyframes fadeOutTrail {
		0% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			visibility: hidden;
		}
	}
	.fade-out-trail {
		animation: fadeOutTrail 300ms ease-out forwards;
	}
</style>
