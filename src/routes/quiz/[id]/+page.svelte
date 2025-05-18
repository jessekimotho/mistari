<script lang="ts">
	import { error } from '@sveltejs/kit';
	import { page } from '$app/stores';
	import { quizzes } from '$lib/data/quizzes';
	import QuizGame from '$lib/components/QuizGame.svelte';

	import { selectedQuiz, currentView, targetWords } from '$lib/stores/game';
	import type { Quiz } from '$lib/types';

	let quiz: Quiz | undefined;

	$: {
		const id = $page.params.id;
		quiz = quizzes.find((q) => q.id.toString() === id);
		if (!quiz) throw error(404, 'Quiz not found');

		selectedQuiz.set(quiz); // will auto-load memory, foundWords, solvedPaths
		targetWords.set(quiz.solutions);
		currentView.set('game');
	}
</script>

<svelte:head>
	<title>
		#{quiz?.id.toString().padStart(3, '0')}
		{quiz?.title} by {quiz?.author ?? 'Mistari'} | Mistari
	</title>
	<meta
		name="description"
		content={`Play Mistari puzzle #${quiz?.id.toString().padStart(3, '0')}: ${quiz?.title}`}
	/>
	<meta name="author" content={quiz?.author ?? 'Mistari'} />
</svelte:head>

{#if quiz}
	<QuizGame selectedQuiz={quiz} />
{/if}
