// src/lib/stores/game.ts
import { writable } from 'svelte/store';
import { derived } from 'svelte/store';


export const selectedTiles = writable<TilePosition[]>([]);
export const currentWord = writable('');
export const targetWords = ['PAWN', 'BISHOP', 'KNIGHT', 'QUEEN', 'KING'];
export const foundWords = writable<Set<string>>(new Set());
import type { TilePosition } from '$lib/types';
export const feedbackMap = writable<Record<string, 'correct' | 'wrong' | null>>({});
export const hintTarget = writable<{ row: number; col: number } | null>(null);
export const trailColors = [
	'#48BB78', '#4299E1', '#F6AD55', '#ED64A6', '#9F7AEA', '#38B2AC', '#ECC94B'
];


export const remainingLetters = derived(foundWords, $foundWords => {
  const remaining = targetWords.filter(w => !$foundWords.has(w));
  const lettersNeeded = new Set(remaining.join('').split(''));
  return lettersNeeded;
});

export const hintFlashWord = writable<string | null>(null);

