// src/lib/utils/grid.ts
export function isAdjacent(a: { row: number; col: number }, b: { row: number; col: number }) {
  const rowDiff = Math.abs(a.row - b.row);
  const colDiff = Math.abs(a.col - b.col);
  return rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);
}

