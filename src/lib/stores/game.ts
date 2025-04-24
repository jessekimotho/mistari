// src/lib/stores/game.ts
import { writable } from 'svelte/store';
import { derived } from 'svelte/store';

export const selectedTiles = writable<{ row: number; col: number }[]>([]);
export const currentWord = writable('');

export const targetWords = ['PAWN', 'BISHOP', 'KNIGHT', 'QUEEN', 'KING'];
export const foundWords = writable<Set<string>>(new Set());



export const remainingLetters = derived(foundWords, $foundWords => {
  const remaining = targetWords.filter(w => !$foundWords.has(w));
  const lettersNeeded = new Set(remaining.join('').split(''));
  return lettersNeeded;
});
