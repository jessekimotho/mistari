import { selectedQuiz, foundWords, targetWords } from '$lib/stores/game';
import type { Quiz } from '$lib/types';

export function loadQuiz(quiz: Quiz, quizMemorySnapshot: Record<number, { foundWords: string[] }>) {
	// Update the selected quiz first
	selectedQuiz.set(quiz);

	// Load prior memory if it exists
	const memory = quizMemorySnapshot[quiz.id];
	const savedWords = memory?.foundWords ?? [];

	// Reset stores based on memory
	foundWords.set(new Set(savedWords));
	targetWords.set(quiz.solutions);
}
