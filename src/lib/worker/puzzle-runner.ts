import type { TilePosition } from '$lib/types'; // <-- if not already present

export type PuzzleResult = {
	grid: string[][];
	placed: string[];
	skipped: string[];
	meta?: {
		timeMs: number;
		retries: number;
		placedCount: number;
		usedTiles: number;
		wordPaths: Record<string, TilePosition[]>; // ✅ Add this line
	};
};

export async function runParallelPuzzle(
  words: string[],
  attempts = 4
): Promise<PuzzleResult> {
  const workers = Array.from({ length: attempts }, () => {
    return new Worker(new URL('./puzzle.worker.ts', import.meta.url), { type: 'module' });
  });

  const results = await Promise.allSettled(
    workers.map(
      (worker) =>
        new Promise<PuzzleResult>((resolve, reject) => {
          worker.onmessage = (e) => {
            worker.terminate();
            resolve(e.data as PuzzleResult);
          };
          worker.onerror = (err) => {
            worker.terminate();
            reject(err);
          };
          worker.postMessage({ words });
        })
    )
  );

  // Find perfect result
  for (const r of results) {
    if (
      r.status === 'fulfilled' &&
      r.value.placed.length === words.length &&
      r.value.grid.flat().filter((c) => c !== '·').length === 16
    ) {
      return r.value;
    }
  }

  // fallback: find best partial
  const fulfilled = results.filter(
    (r): r is PromiseFulfilledResult<PuzzleResult> => r.status === 'fulfilled'
  );
  const best = fulfilled.reduce((a, b) =>
    b.value.placed.length > a.value.placed.length ? b : a
  );
  return best.value;
}
