// src/lib/stores/game.ts
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import type { TilePosition, Quiz } from '$lib/types';

// === Game State Stores ===
export const selectedTiles = writable<TilePosition[]>([]);
export const currentWord = writable('');
export const targetWords = writable<string[]>([]);
export const foundWords = writable<Set<string>>(new Set());
export const solvedPaths = writable<TilePosition[][]>([]);
export const feedbackMap = writable<Record<string, 'correct' | 'wrong' | null>>({});
export const hintTarget = writable<{ row: number; col: number } | null>(null);
export const hintFlashWord = writable<string | null>(null);

export const trailColors = [
	'#48BB78', '#4299E1', '#F6AD55', '#ED64A6', '#9F7AEA', '#38B2AC', '#ECC94B'
];

// === Per-tile state ===
export const tileNeededCounts = writable<Map<string, number>>(new Map());

export const tileUsedCounts = derived(solvedPaths, ($paths) => {
	const map = new Map<string, number>();
	for (const path of $paths) {
		for (const { row, col } of path) {
			const key = `${row}-${col}`;
			map.set(key, (map.get(key) ?? 0) + 1);
		}
	}
	return map;
});

// === UI View State ===
export const currentView = writable<'game' | 'picker'>('game');
export const showMenu = writable(false);
export const selectedQuiz = writable<Quiz | null>(null);

// === Persistent Quiz Memory ===
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

// Automatically track quiz progress
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
).subscribe(() => {});

// ✅ Set needed counts based on quiz paths
selectedQuiz.subscribe((quiz) => {
	if (!quiz?.paths) return;
	const map = new Map<string, number>();
	for (const path of Object.values(quiz.paths)) {
		for (const { row, col } of path) {
			const key = `${row}-${col}`;
			map.set(key, (map.get(key) ?? 0) + 1);
		}
	}
	tileNeededCounts.set(map);
});
