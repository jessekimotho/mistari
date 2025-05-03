export const N = 4;

type TilePosition = { row: number; col: number };

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

export const neighbors = getNeighbors();

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clusteringScore(letters: (string | null)[]): number {
  let score = 0;
  for (let i = 0; i < letters.length; i++) {
    if (!letters[i]) continue;
    for (const nei of neighbors[i]) {
      if (letters[nei]) score++;
    }
  }
  return score;
}

function wordComplexityScore(word: string): number {
  const unique = new Set(word).size;
  return word.length + unique * 0.1;
}

function buildGrid(letters: (string | null)[]): string[][] {
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

function findRandomPath(word: string, letters: (string | null)[]): number[] | null {
  const starts = shuffle(Array.from({ length: N * N }, (_, i) => i));
  for (const start of starts) {
    const path: number[] = [start];

    function dfs(pos: number, idx: number, usedMask: number): boolean {
      const ch = word[idx];
      if (letters[pos] && letters[pos] !== ch) return false;
      const mask = usedMask | (1 << pos);
      if (idx === word.length - 1) return true;

      const nextOptions = shuffle(neighbors[pos]).sort((a, b) => {
        const aFree = neighbors[a].filter(n => !(mask & (1 << n))).length;
        const bFree = neighbors[b].filter(n => !(mask & (1 << n))).length;
        return bFree - aFree;
      });

      for (const nei of nextOptions) {
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

export function tryRescueWords(gridLetters: (string | null)[], wordsToTry: string[]): {
  rescued: string[];
  rescuePaths: number[][];
} {
  const usedMask = new Set<number>();
  gridLetters.forEach((ch, i) => { if (ch) usedMask.add(i); });
  const rescued: string[] = [];
  const rescuePaths: number[][] = [];

  for (const word of wordsToTry) {
    const tempLetters = gridLetters.slice();
    const path = findRandomPath(word, tempLetters);
    if (!path) continue;
    if (path.some(i => usedMask.has(i))) continue;
    for (let i = 0; i < path.length; i++) {
      tempLetters[path[i]] = word[i];
      usedMask.add(path[i]);
    }
    rescued.push(word);
    rescuePaths.push(path.slice());
    gridLetters.splice(0, gridLetters.length, ...tempLetters);
  }

  return { rescued, rescuePaths };
}

export function generateGrid(words: string[], debug = false): {
  grid: string[][];
  placed: string[];
  skipped: string[];
  meta?: {
    timeMs: number;
    retries: number;
    placedCount: number;
    usedTiles: number;
    wordPaths: Record<string, TilePosition[]>;
  };
} {
  const TIME_LIMIT_MS = Math.min(3000, 500 + words.length * 400);
  const startTime = performance.now();
  let retries = 0;

  let bestLetters: (string | null)[] = Array(N * N).fill(null);
  let bestPlaced: string[] = [];
  let bestPlacedCount = -1;
  let bestClusterScore = -1;
  let bestPaths: number[][] = [];
  let bestWordPaths: Record<string, TilePosition[]> = {};

  while (performance.now() - startTime < TIME_LIMIT_MS) {
    retries++;
    const order = shuffle([...words].sort((a, b) => wordComplexityScore(b) - wordComplexityScore(a)));
    const letters: (string | null)[] = Array(N * N).fill(null);
    const placedLocal: string[] = [];
    const localPaths: number[][] = [];
    const wordPaths: Record<string, TilePosition[]> = {};

    for (const w of order) {
      const path = findRandomPath(w, letters);
      if (!path) continue;
      for (let k = 0; k < path.length; k++) {
        letters[path[k]] = w[k];
      }
      placedLocal.push(w);
      localPaths.push(path.slice());
      wordPaths[w] = path.map(i => ({ row: Math.floor(i / N), col: i % N }));
    }

    const placedCount = placedLocal.length;
    const usedCount = letters.filter(l => l !== null).length;
    const clusterScore = clusteringScore(letters);

    if (usedCount === N * N) {
      const isBetter = placedCount > bestPlacedCount ||
        (placedCount === bestPlacedCount && clusterScore > bestClusterScore);

      if (isBetter) {
        bestLetters = letters.slice();
        bestPlaced = placedLocal.slice();
        bestPlacedCount = placedCount;
        bestClusterScore = clusterScore;
        bestPaths = localPaths.map(p => p.slice());
        bestWordPaths = { ...wordPaths };
      }
    }
  }

  const usedTiles = bestLetters.filter(x => x !== null).length;
  if (usedTiles < N * N) {
    return {
      grid: buildGrid(Array(N * N).fill(null)),
      placed: [],
      skipped: words,
      meta: debug ? {
        timeMs: performance.now() - startTime,
        retries,
        placedCount: 0,
        usedTiles: 0,
        wordPaths: {}
      } : undefined,
    };
  }

  const remaining = words.filter(w => !bestPlaced.includes(w));
  const { rescued, rescuePaths } = tryRescueWords(bestLetters, remaining);
  bestPlaced.push(...rescued);
  rescued.forEach((w, i) => {
    bestWordPaths[w] = rescuePaths[i].map(j => ({ row: Math.floor(j / N), col: j % N }));
  });

  let coverMask = 0;
  for (const path of bestPaths) {
    for (const i of path) coverMask |= 1 << i;
  }

  const expectedMask = (1 << (N * N)) - 1;
  if (coverMask !== expectedMask) {
    return {
      grid: buildGrid(Array(N * N).fill(null)),
      placed: [],
      skipped: words,
      meta: debug ? {
        timeMs: performance.now() - startTime,
        retries,
        placedCount: 0,
        usedTiles: 0,
        wordPaths: {}
      } : undefined,
    };
  }

  return {
    grid: buildGrid(bestLetters),
    placed: bestPlaced,
    skipped: words.filter(w => !bestPlaced.includes(w)),
    meta: debug ? {
      timeMs: performance.now() - startTime,
      retries,
      placedCount: bestPlaced.length,
      usedTiles,
      wordPaths: bestWordPaths
    } : undefined,
  };
}
