import { generateGrid } from './puzzle-logic';
import type { PuzzleResult } from './puzzle-runner'; // ✅ import the shared type

self.addEventListener('message', (e) => {
	const { words } = e.data as { words: string[] };
	const result: PuzzleResult = generateGrid(words, true); // ✅ ensure meta is included
	self.postMessage(result);
});
