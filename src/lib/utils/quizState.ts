import { selectedQuiz, targetWords } from '$lib/stores/game';
import type { Quiz } from '$lib/types';

export function loadQuiz(quiz: Quiz) {
	// Set the quiz; foundWords and solvedPaths will auto-load from localStorage
	selectedQuiz.set(quiz);
	targetWords.set(quiz.solutions);
}
