import type { TilePosition } from '$lib/types';

export function segmentTrail(path: TilePosition[]): TilePosition[][] {
	if (path.length < 2) return [];

	const segments: TilePosition[][] = [[path[0]]];

	for (let i = 1; i < path.length; i++) {
		const prev = path[i - 1];
		const curr = path[i];
		const dx = curr.col - prev.col;
		const dy = curr.row - prev.row;

		const lastSegment = segments[segments.length - 1];
		if (lastSegment.length === 1) {
			lastSegment.push(curr);
			continue;
		}

		const last = lastSegment[lastSegment.length - 2];
		const lastDx = prev.col - last.col;
		const lastDy = prev.row - last.row;

		// Start new segment on direction change
		if (dx !== lastDx || dy !== lastDy) {
			segments.push([prev, curr]);
		} else {
			lastSegment.push(curr);
		}
	}
	return segments;
}
