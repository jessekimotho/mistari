<script lang="ts">
	import { onMount } from 'svelte';
	import Grid from '$lib/components/Grid.svelte';
	import { currentWord, selectedTiles, targetWords, foundWords } from '$lib/stores/game';
	import WordHintButton from '$lib/components/WordHintButton.svelte';

	const grid = [
		['T', 'O', 'P', 'A'],
		['H', 'G', 'E', 'W'],
		['S', 'I', 'N', 'E'],
		['B', 'K', 'Q', 'U']
	];

	function updateScale() {
		const baseWidth = 360;
		const baseHeight = 700;

		const scaleX = window.innerWidth / baseWidth;
		const scaleY = window.innerHeight / baseHeight;

		const scale = Math.min(scaleX, scaleY);

		document.documentElement.style.setProperty('--scale', scale.toString());
	}

	onMount(() => {
		setTimeout(updateScale, 50);
		window.addEventListener('resize', updateScale);
		return () => window.removeEventListener('resize', updateScale);
	});
</script>

<main class="app-container">
	<div class="scale-wrapper">
		<div class="content-wrapper">
			<div class="header fade-in mt-8 mb-4 flex items-center">
				<img class="logo" src="/mistari.png" alt="Mistari Logo" />
			</div>

			<div class="main-content fade-in-delayed">
				<div class="mb-8">
					<h1 class="text-xl font-bold text-[#25a746]">#001 Chess Pieces</h1>
					<h2 class="text-lg text-gray-500">by jesse</h2>
				</div>

				<Grid {grid} />

				<div class="mt-8 flex flex-wrap gap-2">
					{#each [...targetWords].sort((a, b) => a.length - b.length) as word (word)}
						<WordHintButton {word} {grid} />
					{/each}
				</div>
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
	}

	.content-wrapper {
		width: 100%;
		display: flex;
		flex-direction: column;
		padding: 0 16px; /* small horizontal breathing room */
		box-sizing: border-box;
	}

	.header {
		width: 100%;
	}

	.logo {
		width: 48px;
		height: 48px;
		padding: 8px;
		border-radius: 200px;
		background: rgb(229 231 235);
	}

	.main-content {
		display: flex;
		flex-direction: column;
		width: 100%;
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
