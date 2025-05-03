<script lang="ts">
	import { writable, derived, get } from 'svelte/store';
	import { tick } from 'svelte';
	import { draw } from 'svelte/transition';
	import { onMount } from 'svelte';
	import {
		selectedTiles,
		currentWord,
		targetWords,
		foundWords,
		solvedPaths,
		tileNeededCounts,
		tileUsedCounts,
		trailColors
	} from '$lib/stores/game';
	import { segmentTrail } from '$lib/utils/segment';
	import type { TilePosition } from '$lib/types';

	export let grid: string[][];
	const rows = grid.length;
	const cols = grid[0].length;
	const TILE_SIZE = 84;
	const GAP_SIZE = 8;
	const TRAIL_LINE_WIDTH = 64;
	const SWIPE_HITBOX_MARGIN = 14;
	const tileSpacing = TILE_SIZE + GAP_SIZE;

	let containerEl: HTMLDivElement;
	let isDragging = false;

	const freezeTrail = writable(false);
	const trailJustFound = writable(false);
	const trailIsAlreadyFound = writable(false);
	const poppingTiles = writable(new Set<string>());
	const disableClickableTiles = writable(false);

	let previousClickableSet: Set<string> = new Set();
	const clickableTiles = derived(
		[tileUsedCounts, tileNeededCounts, disableClickableTiles],
		([$used, $needed, $disabled]) => {
			if ($disabled) return previousClickableSet;

			const result = new Set<string>();
			for (const [key, needed] of $needed.entries()) {
				if (($used.get(key) ?? 0) < needed) result.add(key);
			}
			previousClickableSet = result;
			return result;
		}
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

	const center = (r: number, c: number) => ({
		x: c * tileSpacing + TILE_SIZE / 2,
		y: r * tileSpacing + TILE_SIZE / 2
	});

	const isAdjacent = (a: TilePosition, b: TilePosition) =>
		Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col)) === 1;

	async function updateTrail(r: number, c: number) {
		if (get(freezeTrail)) return;
		const key = `${r}-${c}`;
		if (!get(clickableTiles).has(key)) {
			resetTrail();
			return;
		}

		const trail = get(selectedTiles);
		const idx = trail.findIndex((p) => p.row === r && p.col === c);
		const last = trail.at(-1);
		let newTrail: TilePosition[];

		if (idx >= 0) {
			newTrail = trail.slice(0, idx + 1);
		} else if (!last || isAdjacent(last, { row: r, col: c })) {
			newTrail = [...trail, { row: r, col: c }];
		} else {
			newTrail = [{ row: r, col: c }];
		}

		selectedTiles.set(newTrail);
		const word = newTrail.map((p) => grid[p.row][p.col]).join('');
		currentWord.set(word);

		if (get(targetWords).includes(word)) {
			if (!get(foundWords).has(word)) {
				trailJustFound.set(true);
				freezeTrail.set(true);
				disableClickableTiles.set(true);
				await triggerPopEffect(newTrail, word, newTrail);
			} else {
				trailIsAlreadyFound.set(true);
				setTimeout(resetTrail, 600);
			}
		}
	}

	async function triggerPopEffect(trail: TilePosition[], word?: string, path?: TilePosition[]) {
		poppingTiles.set(new Set(trail.map((p) => `${p.row}-${p.col}`)));
		await tick();

		setTimeout(() => {
			poppingTiles.set(new Set());
		}, 350);

		setTimeout(() => {
			resetTrail();
			trailJustFound.set(false);
			freezeTrail.set(false);

			if (word && path) {
				foundWords.update((s) => new Set([...s, word]));
				solvedPaths.update((paths) => [...paths, path]);
			}

			disableClickableTiles.set(false); // ✅ now allow tiles to disappear
		}, 600);
	}

	function resetTrail() {
		selectedTiles.set([]);
		currentWord.set('');
		trailIsAlreadyFound.set(false);
	}

	function onPointerDown(e: PointerEvent, r: number, c: number) {
		e.preventDefault();
		const key = `${r}-${c}`;
		if (!get(clickableTiles).has(key)) {
			resetTrail();
			return;
		}
		containerEl.setPointerCapture(e.pointerId);
		isDragging = true;
		updateTrail(r, c);
	}

	function onPointerMove(e: PointerEvent) {
		if (!isDragging) return;
		const rect = containerEl.getBoundingClientRect();
		const scale = rect.width / (cols * TILE_SIZE + (cols - 1) * GAP_SIZE);
		const x = (e.clientX - rect.left) / scale;
		const y = (e.clientY - rect.top) / scale;
		const c = Math.floor(x / tileSpacing);
		const r = Math.floor(y / tileSpacing);
		const offX = x % tileSpacing;
		const offY = y % tileSpacing;

		if (
			r >= 0 &&
			r < rows &&
			c >= 0 &&
			c < cols &&
			offX > SWIPE_HITBOX_MARGIN &&
			offX < TILE_SIZE - SWIPE_HITBOX_MARGIN &&
			offY > SWIPE_HITBOX_MARGIN &&
			offY < TILE_SIZE - SWIPE_HITBOX_MARGIN
		) {
			updateTrail(r, c);
		}
	}

	function onPointerUp(e: PointerEvent) {
		containerEl.releasePointerCapture(e.pointerId);
		isDragging = false;
	}

	onMount(() => {
		const cancel = (e: MouseEvent) => {
			if (!(e.target as HTMLElement).closest('.tile, .hitbox')) {
				resetTrail();
			}
		};
		window.addEventListener('mousedown', cancel);
		return () => window.removeEventListener('mousedown', cancel);
	});
</script>

<div
	bind:this={containerEl}
	class="relative"
	style="touch-action: none; width: {cols * TILE_SIZE + (cols - 1) * GAP_SIZE}px; height: {rows *
		TILE_SIZE +
		(rows - 1) * GAP_SIZE}px;"
	on:pointermove={onPointerMove}
	on:pointerup={onPointerUp}
	on:pointercancel={onPointerUp}
>
	<!-- Background tiles -->
	<div
		class="absolute inset-0 grid"
		style="grid-template-columns: repeat({cols}, {TILE_SIZE}px); gap: {GAP_SIZE}px;"
	>
		{#each grid as row, r}
			{#each row as letter, c}
				<div
					class="tile rounded bg-gray-200"
					style="width: {TILE_SIZE}px; height: {TILE_SIZE}px;"
					class:opacity-0={!$clickableTiles.has(`${r}-${c}`)}
				></div>
			{/each}
		{/each}
	</div>

	<!-- Trail lines -->
	<svg class="pointer-events-none absolute inset-0" width="100%" height="100%">
		{#each $trailSegments as { from, to, color } (`${from.row}-${from.col}-${to.row}-${to.col}`)}
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
				in:draw={{ duration: 250 }}
				out:draw={{ duration: 200 }}
				style="--trail-width: {TRAIL_LINE_WIDTH}px;"
			/>
		{/each}
	</svg>

	<!-- Letters -->
	<div
		class="pointer-events-none absolute inset-0 grid"
		style="grid-template-columns: repeat({cols}, {TILE_SIZE}px); gap: {GAP_SIZE}px;"
	>
		{#each grid as row, r}
			{#each row as letter, c}
				<div
					class="flex items-center justify-center font-bold select-none"
					style="width: {TILE_SIZE}px; height: {TILE_SIZE}px; font-size: {TILE_SIZE * 0.5}px;"
					class:text-black={$clickableTiles.has(`${r}-${c}`)}
					class:text-transparent={!$clickableTiles.has(`${r}-${c}`)}
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
		style="grid-template-columns: repeat({cols}, {TILE_SIZE}px); gap: {GAP_SIZE}px;"
	>
		{#each grid as row, r}
			{#each row as letter, c}
				<div
					class="hitbox"
					style="width: {TILE_SIZE}px; height: {TILE_SIZE}px;"
					class:pointer-events-none={!$clickableTiles.has(`${r}-${c}`)}
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
</style>
