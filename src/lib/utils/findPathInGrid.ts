// src/lib/utils/findPathInGrid.ts
import type { TilePosition } from '$lib/types';

export function findPathInGrid(word: string, grid: string[][]): TilePosition[] | null {
	const N = grid.length;
	const visited = Array.from({ length: N }, () => Array(N).fill(false));

	function dfs(r: number, c: number, idx: number, path: TilePosition[]): boolean {
		if (r < 0 || c < 0 || r >= N || c >= N) return false;
		if (visited[r][c]) return false;
		if (grid[r][c] !== word[idx]) return false;

		path.push({ row: r, col: c });
		visited[r][c] = true;

		if (idx === word.length - 1) return true;

		for (let dr = -1; dr <= 1; dr++) {
			for (let dc = -1; dc <= 1; dc++) {
				if (dr === 0 && dc === 0) continue;
				if (dfs(r + dr, c + dc, idx + 1, path)) return true;
			}
		}

		// backtrack
		visited[r][c] = false;
		path.pop();
		return false;
	}

	for (let r = 0; r < N; r++) {
		for (let c = 0; c < N; c++) {
			const path: TilePosition[] = [];
			visited.forEach((row) => row.fill(false));
			if (dfs(r, c, 0, path)) return path;
		}
	}

	return null; // no valid path found
}
