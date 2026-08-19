export type GridSize = '3x3' | '4x4' | '5x5';

export interface BingoConfig {
  name: string;
  gridSize: GridSize;
  cardCount: number;
  hasFreeCenter: boolean; // только для 5x5
}

export interface BingoCard {
  id: string;
  cells: (string | null)[]; // null = свободная клетка
  markedCells: boolean[];
}

export interface BingoGame {
  id: string;
  config: BingoConfig;
  words: string[];
  cards: BingoCard[];
  callOrder: number[]; // индексы слов в порядке вызова
  currentCallIndex: number;
  createdAt: number;
}

export interface SavedBingoSet {
  id: string;
  name: string;
  config: BingoConfig;
  words: string[];
  createdAt: number;
}

export const GRID_SIZES: Record<GridSize, { rows: number; cols: number; total: number }> = {
  '3x3': { rows: 3, cols: 3, total: 9 },
  '4x4': { rows: 4, cols: 4, total: 16 },
  '5x5': { rows: 5, cols: 5, total: 25 },
};

export function getGridDimensions(size: GridSize): { rows: number; cols: number } {
  return GRID_SIZES[size];
}

export function generateBingoId(): string {
  return `bingo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
