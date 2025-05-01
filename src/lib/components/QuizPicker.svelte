<script lang="ts">
	import { currentView } from '$lib/stores/game';
	import type { Quiz } from '$lib/types';
	export let quizzes: Quiz[];
	export let onSelect: (quiz: Quiz) => void;
</script>

<h1 class="mb-4 text-xl font-bold text-[#25a746]">Choose a Quiz</h1>

<ul class="h-full space-y-4 overflow-y-auto pr-1">
	{#each quizzes as quiz}
		<li
			class="cursor-pointer rounded bg-white p-4 shadow transition-all hover:bg-gray-100"
			on:click={() => onSelect(quiz)}
		>
			<div class="text-md font-semibold">
				#{quiz.id.toString().padStart(3, '0')}
				{quiz.title}
			</div>
			<div class="text-sm text-gray-500">by {quiz.author}</div>
		</li>
	{/each}
</ul>

<button class="back-btn mt-4" on:click={() => currentView.set('game')}>⬅️ Back</button>

<style>
	.back-btn {
		background-color: #25a746;
		color: white;
		font-weight: bold;
		padding: 12px;
		border-radius: 9999px;
		text-align: center;
		width: 100%;
		cursor: pointer;
		border: none;
		margin-top: 1rem;
	}
</style>
