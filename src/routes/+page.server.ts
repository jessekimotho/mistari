
	import { redirect } from '@sveltejs/kit';
	import { quizzes } from '$lib/data/quizzes';

	export function load() {
		const latest = quizzes.at(-1);
		if (!latest) throw redirect(302, '/menu');
		throw redirect(302, `/quiz/${latest.id}`);
	}
