export type TilePosition = {
	row: number;
	col: number;
};

export type Quiz = {
	id: number;
	title: string;
	author: string;
	grid: string[][];
	solutions: string[];
	paths: Record<string, TilePosition[]>;
};
