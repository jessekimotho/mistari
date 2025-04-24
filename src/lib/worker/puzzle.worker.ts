
const N = 4;

// Precompute orthogonal + diagonal neighbors for each cell
function getNeighbors(): number[][] {
  const list: number[][] = [];
  for (let i = 0; i < N * N; i++) {
    const r = Math.floor(i / N), c = i % N;
    const neigh: number[] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < N && cc >= 0 && cc < N) neigh.push(rr * N + cc);
      }
    }
    list.push(neigh);
  }
  return list;
}
const neighbors = getNeighbors();

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Try to find one random path for a word under current letter assignment
function findRandomPath(word: string, letters: (string|null)[]): number[] | null {
  const starts = shuffle(Array.from({ length: N * N }, (_, i) => i));
  for (const start of starts) {
    const path: number[] = [start];
    function dfs(pos: number, idx: number, usedMask: number): boolean {
      const ch = word[idx];
      if (letters[pos] && letters[pos] !== ch) return false;
      const mask = usedMask | (1 << pos);
      if (idx === word.length - 1) return true;
      for (const nei of shuffle(neighbors[pos])) {
        if (mask & (1 << nei)) continue;
        const nextCh = word[idx + 1];
        if (letters[nei] && letters[nei] !== nextCh) continue;
        path.push(nei);
        if (dfs(nei, idx + 1, mask)) return true;
        path.pop();
      }
      return false;
    }
    if (dfs(start, 0, 0)) return path;
  }
  return null;
}

// Build final grid matrix from flat letter array
function buildGrid(letters: (string|null)[]): string[][] {
  const grid: string[][] = [];
  for (let r = 0; r < N; r++) {
    const row: string[] = [];
    for (let c = 0; c < N; c++) {
      row.push(letters[r * N + c] || '·');
    }
    grid.push(row);
  }
  return grid;
}

// Greedy + random-restart solver with time-budget and best-by-placed-then-used
export function generateGrid(words: string[]): { grid: string[][]; placed: string[]; skipped: string[] } {
  const TIME_LIMIT_MS = 5000;
  const startTime = performance.now();

  // track best partial result
  let bestPlacedCount = -1;
  let bestUsedCount = -1;
  let bestLetters: (string|null)[] = Array(N * N).fill(null);
  let bestPlaced: string[] = [];

  while (performance.now() - startTime < TIME_LIMIT_MS) {
    const order = shuffle(words);
    const letters: (string|null)[] = Array(N * N).fill(null);
    const placedLocal: string[] = [];

    for (const w of order) {
      const path = findRandomPath(w, letters);
      if (!path) continue;
      for (let i = 0; i < path.length; i++) {
        letters[path[i]] = w[i];
      }
      placedLocal.push(w);
    }

    const placedCount = placedLocal.length;
    const usedCount = letters.reduce((sum, x) => sum + (x !== null ? 1 : 0), 0);

    // perfect solution: full placement of all words
    if (placedCount === words.length && usedCount === N * N) {
      const skipped = words.filter(w => !placedLocal.includes(w));
      return { grid: buildGrid(letters), placed: placedLocal, skipped };
    }

    // update best: prefer more words placed, then more cells used
    if (
      placedCount > bestPlacedCount ||
      (placedCount === bestPlacedCount && usedCount > bestUsedCount)
    ) {
      bestPlacedCount = placedCount;
      bestUsedCount = usedCount;
      bestLetters = letters.slice();
      bestPlaced = placedLocal.slice();
    }
  }

  // time expired: return best partial
  const skipped = words.filter(w => !bestPlaced.includes(w));
  return { grid: buildGrid(bestLetters), placed: bestPlaced, skipped };
}

// Worker listener
self.addEventListener('message', (e) => {
  const { words } = e.data as { words: string[] };
  const result = generateGrid(words);
  self.postMessage(result);
});
