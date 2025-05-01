<script lang="ts">
	import { quizzes } from '$lib/data/quizzes';
	import QuizPicker from '$lib/components/QuizPicker.svelte';
	import QuizGame from '$lib/components/QuizGame.svelte';
	import QuizMenu from '$lib/components/QuizMenu.svelte';

	import {
		selectedQuiz,
		currentView,
		showMenu,
		targetWords,
		foundWords,
		quizMemory
	} from '$lib/stores/game';
	import type { Quiz } from '$lib/types';

	// reactive declarations (Svelte auto-subscribes)
	$: $selectedQuiz;
	$: $quizMemory;
	$: $showMenu;

	function loadQuiz(q: Quiz) {
		selectedQuiz.set(q);
		targetWords.set(q.solutions);
		const mem = $quizMemory[q.id];
		foundWords.set(new Set(mem?.foundWords ?? []));
	}

	const initialQuiz = quizzes.at(-1) ?? quizzes[0];
	loadQuiz(initialQuiz);

	function shareQuiz() {
		if (!$selectedQuiz) return;

		navigator.share?.({
			title: `${$selectedQuiz.title} – Mistari`,
			text: `Try this puzzle! #${$selectedQuiz.id.toString().padStart(3, '0')} ${$selectedQuiz.title}`,
			url: window.location.href
		});
	}
</script>

<main class="app-container">
	<div class="scale-wrapper">
		<div class="content-wrapper">
			<div class="header fade-in mt-8 mb-4 flex items-center justify-between">
				<button
					class="logo-button"
					on:click={() => showMenu.set(!$showMenu)}
					aria-label="Open menu"
				>
					<img class="logo" src="/mistari.png" alt="Mistari Logo" />
				</button>
			</div>

			<div class="main-content fade-in-delayed">
				{#if $showMenu}
					<QuizMenu />
				{:else if $currentView === 'game'}
					{#if $selectedQuiz}
						<QuizGame selectedQuiz={$selectedQuiz} />
					{/if}
				{:else if $currentView === 'picker'}
					<QuizPicker
						{quizzes}
						onSelect={(q) => {
							loadQuiz(q);
							currentView.set('game');
						}}
					/>
				{/if}
			</div>
		</div>
	</div>
</main>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		overflow: hidden;
		height: 100dvh;
		width: 100dvw;
		background: #f3f4f6;
		touch-action: none;
		user-select: none;
	}

	.app-container {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100dvh;
		width: 100dvw;
		overflow: hidden;
		position: relative;
	}

	.scale-wrapper {
		width: 360px;
		height: 700px;
		transform-origin: top center;
		transform: scale(var(--scale));
		display: flex;
		flex-direction: column;
		position: relative;
	}

	.content-wrapper {
		width: 100%;
		display: flex;
		flex-direction: column;
		padding: 0 16px;
		box-sizing: border-box;
		position: relative;
	}

	.main-content {
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	.logo-button {
		all: unset;
		cursor: pointer;
		border-radius: 200px;
		padding: 0;
	}

	.logo {
		width: 48px;
		height: 48px;
		padding: 8px;
		border-radius: 200px;
		background: rgb(229 231 235);
	}

	@keyframes fadeUp {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.fade-in {
		animation: fadeUp 600ms ease-out forwards;
	}

	.fade-in-delayed {
		animation: fadeUp 600ms ease-out forwards;
		animation-delay: 200ms;
	}
</style>
