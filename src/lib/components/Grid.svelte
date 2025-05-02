<script lang="ts">
	import { writable, derived, get } from 'svelte/store';
	import { draw } from 'svelte/transition';
	import { tick } from 'svelte';
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

	// UI constants
	const SWIPE_THRESHOLD_RATIO = 0.3;
	const TRAIL_LINE_WIDTH = 64;
	const TILE_SIZE = 84;
	const GAP_SIZE = 8;
	const SWIPE_HITBOX_MARGIN = 12;

	const tileSpacing = TILE_SIZE + GAP_SIZE;

	let containerEl: HTMLDivElement;
	let isDragging = false;

	const clearingTrail = writable(false);
	const trailIsAlreadyFound = writable(false);
	const trailJustFound = writable(false);
	const trailEffectId = writable(0);
	const freezeTrail = writable(false);
	const selecting = writable(false);
	const poppingTiles = writable(new Set<string>());

	$: svgWidth = grid[0].length * TILE_SIZE + (grid[0].length - 1) * GAP_SIZE;
	$: svgHeight = grid.length * TILE_SIZE + (grid.length - 1) * GAP_SIZE;

	const usedTiles = derived([selectedQuiz, quizMemory], ([$quiz, $memory]) =>
		$quiz && $memory[$quiz.id]
			? deriveUsedTiles(grid, $memory[$quiz.id].foundWords)
			: new Set<string>()
	);

	const remainingLetters = derived(
		[selectedQuiz, quizMemory, targetWords],
		([$quiz, $memory, $targets]) => {
			if (!$quiz || !$memory[$quiz.id]) return new Set($targets.join('').split(''));
			const found = new Set($memory[$quiz.id].foundWords);
			return new Set(
				$targets
					.filter((w) => !found.has(w))
					.join('')
					.split('')
			);
		}
	);

	const quizComplete = derived(
		[selectedQuiz, quizMemory],
		([$quiz, $memory]) => $quiz && $memory[$quiz.id]?.completed === true
	);

	const trailSegments = derived(selectedTiles, ($tiles) => {
		if ($tiles.length === 1) {
			const only = $tiles[0];
			return [{ from: only, to: only, color: trailColors[0] }];
		}
		return segmentTrail($tiles).flatMap((segment, i) => {
			const color = trailColors[i % trailColors.length];
			return segment.slice(0, -1).map((from, j) => ({
				from,
				to: segment[j + 1],
				color
			}));
		});
	});

	// Helpers
	const center = (r: number, c: number) => ({
		x: c * tileSpacing + TILE_SIZE / 2,
		y: r * tileSpacing + TILE_SIZE / 2
	});
	const isAdjacent = (a: TilePosition, b: TilePosition) =>
		Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col)) === 1;

	async function updateTrail(r: number, c: number) {
		if (get(freezeTrail)) return;
		const letter = grid[r][c];
		if (!get(remainingLetters).has(letter)) return;

		const trail = get(selectedTiles);
		const last = trail.at(-1);
		const idx = trail.findIndex((p) => p.row === r && p.col === c);
		let newTrail =
			idx >= 0
				? trail.slice(0, idx + 1)
				: !last || isAdjacent(last, { row: r, col: c })
					? [...trail, { row: r, col: c }]
					: [{ row: r, col: c }];

		selectedTiles.set(newTrail);
		const word = newTrail.map((p) => grid[p.row][p.col]).join('');
		currentWord.set(word);

		if (get(targetWords).includes(word)) {
			if (!get(foundWords).has(word)) {
				foundWords.update((set) => new Set([...set, word]));
				trailJustFound.set(true);
				freezeTrail.set(true);
				trailEffectId.update((id) => id + 1);
				await tick();
				triggerPopEffect(newTrail);
			} else {
				triggerAlreadyFoundTrailEffect(newTrail);
				hintFlashWord.set(word);
				setTimeout(() => hintFlashWord.set(null), 800);
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

	async function triggerPopEffect(trail: TilePosition[]) {
		poppingTiles.set(new Set(trail.map((p) => `${p.row}-${p.col}`)));
		await tick();
		setTimeout(() => {
			poppingTiles.set(new Set());
			selectedTiles.set([]);
			currentWord.set('');
			selecting.set(false);
			trailJustFound.set(false);
			freezeTrail.set(false);
		}, 600);
	}

	function onPointerDown(e: PointerEvent, r: number, c: number) {
		e.preventDefault();
		const letter = grid[r][c];
		if (!get(remainingLetters).has(letter)) {
			selectedTiles.set([]);
			currentWord.set('');
			selecting.set(false);
			isDragging = false;
			return;
		}
		containerEl.setPointerCapture(e.pointerId);
		isDragging = true;
		selecting.set(true);
		updateTrail(r, c);
	}

	function onPointerMove(e: PointerEvent) {
		if (!isDragging || !get(selecting)) return;
		const rect = containerEl.getBoundingClientRect();
		const scale = rect.width / svgWidth;
		const x = (e.clientX - rect.left) / scale;
		const y = (e.clientY - rect.top) / scale;
		const c = Math.floor(x / tileSpacing);
		const r = Math.floor(y / tileSpacing);
		const offX = x % tileSpacing,
			offY = y % tileSpacing;

		if (
			r >= 0 &&
			r < grid.length &&
			c >= 0 &&
			c < grid[0].length &&
			offX > SWIPE_HITBOX_MARGIN &&
			offY > SWIPE_HITBOX_MARGIN &&
			offX < TILE_SIZE - SWIPE_HITBOX_MARGIN &&
			offY < TILE_SIZE - SWIPE_HITBOX_MARGIN
		) {
			updateTrail(r, c);
		}
	}

	function onPointerUp(e: PointerEvent) {
		containerEl.releasePointerCapture(e.pointerId);
		isDragging = false;
		selecting.set(false);
	}

	onMount(() => {
		const cancel = (e: MouseEvent) => {
			if (!(e.target as HTMLElement).closest('.tile, .hitbox')) {
				selectedTiles.set([]);
				currentWord.set('');
				selecting.set(false);
				isDragging = false;
			}
		};
		window.addEventListener('mousedown', cancel);
		return () => window.removeEventListener('mousedown', cancel);
	});
</script>

<div
	bind:this={containerEl}
	class="relative"
	style="touch-action: none; width: {svgWidth}px; height: {svgHeight}px;"
	on:pointermove={onPointerMove}
	on:pointerup={onPointerUp}
	on:pointercancel={onPointerUp}
>
	<!-- Background tiles -->
	<div
		class="absolute inset-0 grid"
		style="grid-template-columns: repeat({grid[0].length}, {TILE_SIZE}px); gap: {GAP_SIZE}px;"
	>
		{#each grid as row, r}
			{#each row as letter, c}
				<div
					class="tile rounded bg-gray-200"
					style="width: {TILE_SIZE}px; height: {TILE_SIZE}px;"
					class:bg-green-500={$feedbackMap[`${r}-${c}`] === 'correct'}
					class:bg-red-500={$feedbackMap[`${r}-${c}`] === 'wrong'}
					class:opacity-0={!$remainingLetters.has(letter)}
				></div>
			{/each}
		{/each}
	</div>

	<!-- Trail SVG -->
	<svg class="pointer-events-none absolute inset-0" width={svgWidth} height={svgHeight}>
		{#each $trailSegments as { from, to, color } (`${from.row}-${from.col}-${to.row}-${to.col}-${$trailEffectId}`)}
			{@const a = center(from.row, from.col)}
			{@const b = center(to.row, to.col)}
			<line
				x1={a.x}
				y1={a.y}
				x2={b.x}
				y2={b.y}
				stroke={$trailIsAlreadyFound || $trailJustFound ? 'limegreen' : color}
				stroke-width={TRAIL_LINE_WIDTH}
				stroke-linecap="round"
				vector-effect="non-scaling-stroke"
				class:pulse-stroke={$trailIsAlreadyFound || $trailJustFound}
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
		style="grid-template-columns: repeat({grid[0].length}, {TILE_SIZE}px); gap: {GAP_SIZE}px;"
	>
		{#each grid as row, r}
			{#each row as letter, c}
				<div
					class="flex items-center justify-center font-bold select-none"
					style="width: {TILE_SIZE}px; height: {TILE_SIZE}px; font-size: {TILE_SIZE * 0.5}px;"
					class:text-white={$selectedTiles.some((p) => p.row === r && p.col === c)}
					class:text-black={!$selectedTiles.some((p) => p.row === r && p.col === c) &&
						$remainingLetters.has(letter)}
					class:text-transparent={!$remainingLetters.has(letter)}
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
		style="grid-template-columns: repeat({grid[0].length}, {TILE_SIZE}px); gap: {GAP_SIZE}px;"
	>
		{#each grid as row, r}
			{#each row as letter, c}
				<div
					class="hitbox"
					style="width: {TILE_SIZE}px; height: {TILE_SIZE}px;"
					class:cursor-pointer={$remainingLetters.has(letter) && !$usedTiles.has(`${r}-${c}`)}
					class:cursor-default={!$remainingLetters.has(letter) || $usedTiles.has(`${r}-${c}`)}
					on:pointerdown={(e) => onPointerDown(e, r, c)}
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
