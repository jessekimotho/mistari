<script lang="ts">
	import '../app.css';
	import { onNavigate } from '$app/navigation';

	let { children } = $props();

	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<main class="app-container">
	<div class="scale-wrapper">
		<div class="content-wrapper">
			<div class="header fade-in mt-8 mb-4 flex items-center justify-between">
				<a class="logo-button" href="/menu" aria-label="Open menu">
					<img class="logo" src="/mistari.png" alt="Mistari Logo" />
				</a>
			</div>

			<div class="main-content fade-in-delayed">
				{@render children()}
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
		view-transition-name: logo;
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

	@keyframes fade-in {
		from {
			opacity: 0;
		}
	}

	@keyframes fade-out {
		to {
			opacity: 0;
		}
	}

	:root::view-transition-old(root) {
		animation:
			90ms cubic-bezier(0.4, 0, 1, 1) both fade-out,
			300ms cubic-bezier(0.4, 0, 0.2, 1) both slide-to-left;
	}

	:root::view-transition-new(root) {
		animation:
			210ms cubic-bezier(0, 0, 0.2, 1) 90ms both fade-in,
			300ms cubic-bezier(0.4, 0, 0.2, 1) both slide-from-right;
	}
</style>
