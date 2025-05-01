<script lang="ts">
	import { writable, derived } from 'svelte/store';
	import { fade, draw } from 'svelte/transition';
	import { onMount } from 'svelte';
	import {
		selectedTiles,
		currentWord,
		targetWords,
		foundWords,
		feedbackMap,
		trailColors,
		hintFlashWord,
		quizMemory,
		selectedQuiz
	} from '$lib/stores/game';
	import { segmentTrail } from '$lib/utils/segment';
	import { deriveUsedTiles } from '$lib/utils/deriveUsedTiles';
	import type { TilePosition } from '$lib/types';

	export let grid: string[][];
	let displayGrid = grid.map((row) => [...row]);

	// Config
	export const SWIPE_THRESHOLD_RATIO = 0.3;
	export const TRAIL_LINE_WIDTH = 64;
	export const TILE_SIZE = 84;
	export const GAP_SIZE = 8;

	// State
	let containerEl: HTMLDivElement;
	const clearingTrail = writable(false);
	const trailIsAlreadyFound = writable(false);
	const selecting = writable(false);
	let isDragging = false;
	const poppingTiles = writable<Set<string>>(new Set());

	// Derived tiles from memory
	const derivedUsedTiles = derived([selectedQuiz, quizMemory], ([$quiz, $memory]) => {
		if (!$quiz || !$memory[$quiz.id]) return new Set<string>();
		return deriveUsedTiles(grid, $memory[$quiz.id].foundWords);
	});

	// Dimensions
	const tileSpacing = TILE_SIZE + GAP_SIZE;
	$: svgWidth = displayGrid[0].length * TILE_SIZE + (displayGrid[0].length - 1) * GAP_SIZE;
	$: svgHeight = displayGrid.length * TILE_SIZE + (displayGrid.length - 1) * GAP_SIZE;

	// Derived remaining letters
	const derivedRemainingLetters = derived(
		[selectedQuiz, quizMemory, targetWords],
		([$quiz, $memory, $targets]) => {
			if (!$quiz || !$memory[$quiz.id]) return new Set($targets.join('').split(''));
			const foundSet = new Set($memory[$quiz.id].foundWords);
			const remaining = $targets.filter((w) => !foundSet.has(w));
			return new Set(remaining.join('').split(''));
		}
	);

	// Quiz completion status
	const quizComplete = derived([selectedQuiz, quizMemory], ([$quiz, $memory]) => {
		return $quiz && $memory[$quiz.id]?.completed === true;
	});

	// Trail segments
	const trailSegments = derived(selectedTiles, ($tiles) => {
		const segments = segmentTrail($tiles).flatMap((segment, i) => {
			const color = trailColors[i % trailColors.length];
			return segment.slice(0, -1).map((from, j) => ({ from, to: segment[j + 1], color }));
		});
		if ($tiles.length === 1) {
			const only = $tiles[0];
			segments.push({ from: only, to: only, color: trailColors[0] });
		}
		return segments;
	});

	function tileCenterPx(row: number, col: number) {
		return { x: col * tileSpacing + TILE_SIZE / 2, y: row * tileSpacing + TILE_SIZE / 2 };
	}
	function isAdjacent(a: TilePosition, b: TilePosition) {
		return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col)) === 1;
	}

	function updateTrail(row: number, col: number) {
		const trail = $selectedTiles;
		const key = `${row}-${col}`;
		const letter = displayGrid[row][col];

		// Only block hidden tiles
		if (!$derivedRemainingLetters.has(letter)) return;

		const last = trail.at(-1);
		const idx = trail.findIndex((p) => p.row === row && p.col === col);
		let newTrail;

		if (idx >= 0) {
			newTrail = trail.slice(0, idx + 1);
		} else if (!last || isAdjacent(last, { row, col })) {
			newTrail = [...trail, { row, col }];
		} else {
			newTrail = [{ row, col }];
		}

		selectedTiles.set(newTrail);

		const word = newTrail.map((p) => displayGrid[p.row][p.col]).join('');
		currentWord.set(word);

		if ($targetWords.includes(word)) {
			if (!$foundWords.has(word)) {
				foundWords.update((s) => new Set([...s, word]));
				triggerPopEffect(newTrail);
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

	function onHitboxPointerDown(e: PointerEvent, row: number, col: number) {
		e.preventDefault();

		const key = `${row}-${col}`;
		const letter = displayGrid[row][col];
		if (!$derivedRemainingLetters.has(letter) || $derivedUsedTiles.has(key)) {
			return; // ignore interaction
		}

		containerEl.setPointerCapture(e.pointerId);
		isDragging = true;
		selecting.set(true);
		updateTrail(row, col);
	}

	function handleContainerPointerMove(e: PointerEvent) {
		e.preventDefault();
		if (!isDragging || !$selecting) return;

		const rect = containerEl.getBoundingClientRect();
		const scaledX = e.clientX - rect.left;
		const scaledY = e.clientY - rect.top;
		const scale = rect.width / svgWidth;
		const x = scaledX / scale;
		const y = scaledY / scale;
		const col = Math.floor(x / tileSpacing);
		const row = Math.floor(y / tileSpacing);
		if (row < 0 || row >= displayGrid.length || col < 0 || col >= displayGrid[0].length) return;
		const offX = x % tileSpacing;
		const offY = y % tileSpacing;
		if (offX > TILE_SIZE || offY > TILE_SIZE) return;
		updateTrail(row, col);
	}

	function onContainerPointerUp(e: PointerEvent) {
		containerEl.releasePointerCapture(e.pointerId);
		isDragging = false;
		selecting.set(false);
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

	// Reset UI on grid change
	$: {
		displayGrid = grid.map((row) => [...row]);
		clearingTrail.set(false);
		trailIsAlreadyFound.set(false);
		selecting.set(false);
		isDragging = false;
		poppingTiles.set(new Set());
		selectedTiles.set([]);
		currentWord.set('');
	}
</script>

<div
	bind:this={containerEl}
	class="relative"
	style="touch-action: none; width: {svgWidth}px; height: {svgHeight}px;"
	on:pointermove={handleContainerPointerMove}
	on:pointerup={onContainerPointerUp}
	on:pointercancel={onContainerPointerUp}
>
	<!-- {#if quizComplete}
		<div
			in:fade
			class="fixed inset-0 z-10 flex flex-col items-center justify-center bg-green-600 text-white"
		>
			<div class="emoji text-4xl">🎉</div>
			You found all the words!
		</div>
	{/if} -->

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
					class:bg-green-500={$feedbackMap[`${r}-${c}`] === 'correct'}
					class:bg-red-500={$feedbackMap[`${r}-${c}`] === 'wrong'}
					class:bg-blue-400={$derivedUsedTiles.has(`${r}-${c}`)}
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
						!$derivedUsedTiles.has(`${r}-${c}`)}
					class:cursor-default={!$derivedRemainingLetters.has(letter) ||
						$derivedUsedTiles.has(`${r}-${c}`)}
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
