// src/lib/stores/game.ts
import { writable, derived, get } from 'svelte/store';
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

// === Per-tile State ===
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

function getMemoryForQuiz(id: number): QuizMemory {
	if (!browser) return { foundWords: [], completed: false };
	const raw = localStorage.getItem(`quizMemory-${id}`);
	return raw ? JSON.parse(raw) : { foundWords: [], completed: false };
}

function saveMemoryForQuiz(id: number, mem: QuizMemory) {
	if (!browser) return;
	localStorage.setItem(`quizMemory-${id}`, JSON.stringify(mem));
}

// Store holding only the current quiz’s memory
export const quizMemory = writable<QuizMemory>({ foundWords: [], completed: false });

// Load & reseed on quiz switch
selectedQuiz.subscribe((quiz) => {
	if (!quiz) {
		quizMemory.set({ foundWords: [], completed: false });
		foundWords.set(new Set());
		solvedPaths.set([]);
		return;
	}
	const mem = getMemoryForQuiz(quiz.id);
	quizMemory.set(mem);

	// Reseed game state from memory
	foundWords.set(new Set(mem.foundWords));
	solvedPaths.set(mem.foundWords.map((word) => quiz.paths[word] || []));
});

// Persist foundWords changes for the active quiz
foundWords.subscribe((fw) => {
	const quiz = get(selectedQuiz);
	if (!quiz) return;
	const arr = Array.from(fw);
	const completed = fw.size === get(targetWords).length;
	const mem: QuizMemory = { foundWords: arr, completed };
	saveMemoryForQuiz(quiz.id, mem);
	quizMemory.set(mem);
});

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
