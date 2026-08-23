// src/types/tarsia.ts

export type TarsiaShape = 'triangle' | 'hexagon' | 'domino';

export interface TarsiaPair {
  id: string;
  left: string;   // Вопрос / Левая часть
  right: string;  // Ответ / Правая часть
}

export interface TarsiaPuzzle {
  id: string;
  title: string;
  shape: TarsiaShape;
  pairs: TarsiaPair[];
  puzzleTitle: string;
  solutionTitle: string;
  showSolution: boolean;
  cardSize: 'small' | 'medium' | 'large';
  createdAt: number;
  updatedAt: number;
}

export const SHAPE_LABELS: Record<TarsiaShape, string> = {
  triangle: 'Треугольник',
  hexagon: 'Шестиугольник',
  domino: 'Домино',
};

export const CARD_SIZES = [
  { id: 'small', label: 'Маленькие', scale: 0.7 },
  { id: 'medium', label: 'Средние', scale: 1 },
  { id: 'large', label: 'Большие', scale: 1.3 },
];

export function generateTarsiaId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyTarsiaPair(): TarsiaPair {
  return {
    id: generateTarsiaId('pair'),
    left: '',
    right: '',
  };
}

export function createEmptyTarsiaPuzzle(title: string): TarsiaPuzzle {
  const pairs: TarsiaPair[] = [];
  for (let i = 0; i < 12; i++) {
    pairs.push(createEmptyTarsiaPair());
  }
  
  return {
    id: generateTarsiaId('tarsia'),
    title: title.trim() || 'Новая головоломка',
    shape: 'triangle',
    pairs,
    puzzleTitle: 'Собери фигуру',
    solutionTitle: 'Решение',
    showSolution: true,
    cardSize: 'medium',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function validateTarsiaPairs(pairs: TarsiaPair[]): TarsiaPair[] {
  return pairs.filter((p) => p.left.trim() !== '' && p.right.trim() !== '');
}
