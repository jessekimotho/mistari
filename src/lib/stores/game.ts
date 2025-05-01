import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import type { TilePosition, Quiz } from '$lib/types';

// === Game State Stores ===
export const selectedTiles = writable<TilePosition[]>([]);
export const currentWord = writable('');
export const targetWords = writable<string[]>([]);
export const foundWords = writable<Set<string>>(new Set());
export const feedbackMap = writable<Record<string, 'correct' | 'wrong' | null>>({});
export const hintTarget = writable<{ row: number; col: number } | null>(null);
export const hintFlashWord = writable<string | null>(null);

export const trailColors = ['#48BB78', '#4299E1', '#F6AD55', '#ED64A6', '#9F7AEA', '#38B2AC', '#ECC94B'];

export const remainingLetters = derived(
	[foundWords, targetWords],
	([$foundWords, $targetWords]) => {
		const remaining = $targetWords.filter((w) => !$foundWords.has(w));
		return new Set(remaining.join('').split(''));
	}
);

// === UI State Stores ===
export const currentView = writable<'game' | 'picker'>('game');
export const showMenu = writable(false);
export const selectedQuiz = writable<Quiz | null>(null);

// === Persistent Memory ===
export type QuizMemory = {
	foundWords: string[];
	completed: boolean;
};

const stored = browser ? localStorage.getItem('quizMemory') : null;
const initial: Record<number, QuizMemory> = stored ? JSON.parse(stored) : {};

export const quizMemory = writable<Record<number, QuizMemory>>(initial);

if (browser) {
	quizMemory.subscribe((val) => {
		localStorage.setItem('quizMemory', JSON.stringify(val));
	});
}

derived(
	[selectedQuiz, foundWords, targetWords],
	([$quiz, $found, $targets]) => {
		if (!$quiz) return;

		const completed = $found.size === $targets.length;

		quizMemory.update((mem) => ({
			...mem,
			[$quiz.id]: {
				foundWords: Array.from($found),
				completed
			}
		}));
	}
).subscribe(() => {}); // activate the derived store
