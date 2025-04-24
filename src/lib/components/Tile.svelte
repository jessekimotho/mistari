<script lang="ts">
	import { selectedTiles, currentWord, remainingLetters } from '$lib/stores/game';
	import { get } from 'svelte/store';
	import { isAdjacent } from '$lib/utils/grid';

	export let letter: string;
	export let row: number;
	export let col: number;

	const coordKey = `${row}-${col}`;

	$: isSelected = get(selectedTiles).some((t) => t.row === row && t.col === col);
	$: disabled = $remainingLetters && !$remainingLetters.has(letter);

	function handleClick() {
		const selection = get(selectedTiles);
		const alreadySelected = selection.some((t) => t.row === row && t.col === col);
		if (alreadySelected) return;

		if (selection.length === 0 || isAdjacent(selection[selection.length - 1], { row, col })) {
			selectedTiles.update((prev) => [...prev, { row, col }]);
			currentWord.update((w) => w + letter);
		}
	}
</script>

<div
	class="grid h-16 w-16 cursor-pointer place-items-center rounded border text-xl font-bold transition
		{isSelected ? 'bg-blue-600 text-white' : 'bg-white'}
		{disabled ? 'opacity-40 pointer-events-none' : ''}"
	on:click={handleClick}
>
	{letter}
</div>
