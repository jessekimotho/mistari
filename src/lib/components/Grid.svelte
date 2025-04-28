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

	// Container ref for pointer capture & global handling
	let containerEl: HTMLDivElement;

	// Computed dimensions
	const tileSpacing = TILE_SIZE + GAP_SIZE;
	$: svgWidth = displayGrid[0].length * TILE_SIZE + (displayGrid[0].length - 1) * GAP_SIZE;
	$: svgHeight = displayGrid.length * TILE_SIZE + (displayGrid.length - 1) * GAP_SIZE;

	// Remaining letters set
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

	// Trail segments
	const trailSegments = derived(selectedTiles, ($tiles) => {
		const segments = segmentTrail($tiles).flatMap((segment, i) => {
			const color = trailColors[i % trailColors.length];
			return segment.slice(0, -1).map((from, j) => ({
				from,
				to: segment[j + 1],
				color
			}));
		});
		if ($tiles.length === 1) {
			const only = $tiles[0];
			segments.push({ from: only, to: only, color: trailColors[0] });
		}
		return segments;
	});

	// Position helpers
	function tileCenterPx(row: number, col: number) {
		return { x: col * tileSpacing + TILE_SIZE / 2, y: row * tileSpacing + TILE_SIZE / 2 };
	}
	function isAdjacent(a: TilePosition, b: TilePosition) {
		return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col)) === 1;
	}

	// Core trail update
	function updateTrail(row: number, col: number) {
		const trail = get(selectedTiles);
		const last = trail.at(-1);
		const idx = trail.findIndex((p) => p.row === row && p.col === col);

		let newTrail = [];
		if (idx >= 0) newTrail = trail.slice(0, idx + 1);
		else if (!last || isAdjacent(last, { row, col })) newTrail = [...trail, { row, col }];
		else newTrail = [{ row, col }];

		selectedTiles.set(newTrail);
		const word = newTrail.map((p) => displayGrid[p.row][p.col]).join('');
		currentWord.set(word);

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
				newTrail.forEach((p) => used.add(`${p.row}-${p.col}`));
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

	// Effects
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

	// Final word center rearrangement
	function rearrangeFinalWord(word: string) {
		const newGrid = displayGrid.map((r) => [...r]);
		const mid = Math.floor(newGrid.length / 2);
		for (let i = 0; i < word.length && i < newGrid[mid].length; i++) {
			newGrid[mid][i] = word[i];
		}
		displayGrid = newGrid;
	}

	// Pointer handlers
	function onHitboxPointerDown(e: PointerEvent, row: number, col: number) {
		e.preventDefault();
		containerEl.setPointerCapture(e.pointerId);
		isDragging = true;
		selecting.set(true);
		updateTrail(row, col);
	}
	function handleContainerPointerMove(e: PointerEvent) {
		e.preventDefault();
		if (!isDragging || !get(selecting)) return;
		const rect = containerEl.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const col = Math.floor(x / tileSpacing);
		const row = Math.floor(y / tileSpacing);
		if (row < 0 || row >= displayGrid.length || col < 0 || col >= displayGrid[0].length) return;
		const offX = x % tileSpacing;
		const offY = y % tileSpacing;
		if (offX > TILE_SIZE || offY > TILE_SIZE) return;
		updateTrail(row, col);
	}
	function onContainerPointerUp(e: PointerEvent) {
		if (isDragging) {
			containerEl.releasePointerCapture(e.pointerId);
			isDragging = false;
			selecting.set(false);
			selectedTiles.set([]);
			currentWord.set('');
		}
	}

	onMount(() => {
		const clickAway = (e: MouseEvent) => {
			if (!(e.target as HTMLElement).closest('.tile, .hitbox')) {
				selectedTiles.set([]);
				currentWord.set('');
				selecting.set(false);
				isDragging = false;
			}
		};
		window.addEventListener('mousedown', clickAway);
		return () => window.removeEventListener('mousedown', clickAway);
	});
</script>

<div
	bind:this={containerEl}
	class="relative"
	style="touch-action: none; width: {svgWidth}px; height: {svgHeight}px;"
	on:pointermove={handleContainerPointerMove}
	on:pointerup={onContainerPointerUp}
	on:pointercancel={onContainerPointerUp}
>
	{#if $allDone}
		<div
			in:fade
			class="fixed inset-0 z-10 flex flex-col items-center justify-center bg-green-600 text-white"
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
					class="flex items-center justify-center font-bold select-none"
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
					style="width: {TILE_SIZE}px; height: {TILE_SIZE}px;"
					class:cursor-pointer={$derivedRemainingLetters.has(letter) &&
						!get(usedTiles).has(`${r}-${c}`)}
					class:cursor-default={!$derivedRemainingLetters.has(letter) ||
						get(usedTiles).has(`${r}-${c}`)}
					on:pointerdown={(e) => onHitboxPointerDown(e, r, c)}
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
