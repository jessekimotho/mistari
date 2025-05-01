import type { TilePosition } from '$lib/types';

export function deriveUsedTiles(grid: string[][], foundWords: string[]): Set<string> {
	const used = new Set<string>();

	for (const word of foundWords) {
		outer: for (let r = 0; r < grid.length; r++) {
			for (let c = 0; c < grid[r].length; c++) {
				if (grid[r][c] === word[0]) {
					const path = findWordPath(grid, word, r, c);
					if (path) {
						path.forEach(({ row, col }) => used.add(`${row}-${col}`));
						break outer;
					}
				}
			}
		}
	}

	return used;
}

function findWordPath(
	grid: string[][],
	word: string,
	row: number,
	col: number,
	path: TilePosition[] = [],
	visited = new Set<string>()
): TilePosition[] | null {
	if (word.length === 0) return path;

	const key = `${row}-${col}`;
	if (visited.has(key)) return null;
	if (grid[row]?.[col] !== word[0]) return null;

	path = [...path, { row, col }];
	visited.add(key);

	if (word.length === 1) return path;

	const directions = [
		[-1, 0], [1, 0], [0, -1], [0, 1],
		[-1, -1], [-1, 1], [1, -1], [1, 1]
	];

	for (const [dr, dc] of directions) {
		const nextPath = findWordPath(grid, word.slice(1), row + dr, col + dc, path, new Set(visited));
		if (nextPath) return nextPath;
	}

	return null;
}
