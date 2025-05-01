<script lang="ts">
	import { selectedQuiz, currentView, showMenu, targetWords } from '$lib/stores/game';

	// Svelte will inject these as reactive values
	$: $selectedQuiz;

	function closeMenu() {
		showMenu.set(false);
	}

	function resetQuiz() {
		if ($selectedQuiz) {
			selectedQuiz.set({ ...$selectedQuiz }); // triggers reactivity
			targetWords.set($selectedQuiz.solutions);
		}
		closeMenu();
	}

	function shareQuiz() {
		if (!$selectedQuiz) return;

		navigator.share?.({
			title: `${$selectedQuiz.title} – Mistari`,
			text: `Try this puzzle! #${$selectedQuiz.id.toString().padStart(3, '0')} ${$selectedQuiz.title}`,
			url: window.location.href
		});
		closeMenu();
	}
</script>

<div class="menu-wrapper">
	<div class="scroll-area">
		<h1 class="mb-4 text-xl font-bold text-[#25a746]">Menu</h1>

		<ul class="space-y-4">
			<li
				class="menu-btn"
				on:click={() => {
					currentView.set('picker');
					closeMenu();
				}}
			>
				🧩 Puzzles
			</li>
			<li class="menu-btn" on:click={closeMenu}>⚙️ Settings</li>
			<li class="menu-btn" on:click={shareQuiz}>📤 Share Puzzle</li>
			<li class="menu-btn" on:click={resetQuiz}>🔄 Reset Puzzle</li>
		</ul>
	</div>

	<button class="back-btn mt-4" on:click={closeMenu}>⬅️ Back</button>
</div>

<style>
	.menu-wrapper {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.scroll-area {
		flex: 1;
		overflow-y: auto;
		padding-right: 4px;
	}

	.menu-btn {
		width: 100%;
		background-color: #25a746;
		color: white;
		padding: 12px 16px;
		border-radius: 9999px;
		font-weight: 600;
		text-align: left;
		cursor: pointer;
		transition: background 0.2s;
	}

	.menu-btn:hover {
		background-color: #1e8c3c;
	}

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
	}
</style>
