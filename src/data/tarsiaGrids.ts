import type { TarsiaGridConfig } from '@/types/tarsia';

// Маленькая треугольная сетка (10 вопросов)
export const smallTriangleGrid: TarsiaGridConfig = {
  id: 'small-triangle',
  name: 'Маленькая треугольная',
  description: '10 вопросов, компактная сетка',
  questionCount: 10,
  triangles: [
    { row: 1, col: 3, values: ['1q', null, null] },
    { row: 2, col: 2, values: ['3q', '2q', null] },
    { row: 2, col: 3, values: ['1a', '2a', '4q'] },
    { row: 2, col: 4, values: ['5q', null, '4a'] },
    { row: 3, col: 1, values: ['7q', '6q', null] },
    { row: 3, col: 2, values: ['3a', '6a', '8q'] },
    { row: 3, col: 3, values: ['9q', '8a', '7a'] },
    { row: 3, col: 4, values: ['5a', null, '9a'] },
    { row: 4, col: 1, values: [null, '10q', null] },
    { row: 4, col: 2, values: ['7a', '10a', null] },
  ],
};

// Большая треугольная сетка (18 вопросов)
export const triangleGrid: TarsiaGridConfig = {
  id: 'triangle',
  name: 'Большая треугольная',
  description: '18 вопросов, классическая сетка',
  questionCount: 18,
  triangles: [
    { row: 1, col: 4, values: ['1q', null, null] },
    { row: 2, col: 3, values: ['4q', '2q', null] },
    { row: 2, col: 4, values: ['1a', '2a', '3q'] },
    { row: 2, col: 5, values: ['5q', null, '3a'] },
    { row: 3, col: 2, values: ['10q', '6q', null] },
    { row: 3, col: 3, values: ['4a', '6a', '7q'] },
    { row: 3, col: 4, values: ['11q', '8q', '7a'] },
    { row: 3, col: 5, values: ['5a', '8a', '9q'] },
    { row: 3, col: 6, values: ['12q', null, '9a'] },
    { row: 4, col: 1, values: [null, '13q', null] },
    { row: 4, col: 2, values: ['10a', '13a', '14q'] },
    { row: 4, col: 3, values: [null, '15q', '14a'] },
    { row: 4, col: 4, values: ['11a', '15a', '16q'] },
    { row: 4, col: 5, values: [null, '17q', '16a'] },
    { row: 4, col: 6, values: ['12a', '17a', '18q'] },
    { row: 4, col: 7, values: [null, null, '18a'] },
  ],
};

// Маленькая шестиугольная сетка (6 вопросов)
export const smallHexGrid: TarsiaGridConfig = {
  id: 'small-hex',
  name: 'Маленькая шестиугольная',
  description: '6 вопросов, шестиугольная форма',
  questionCount: 6,
  triangles: [
    { row: 1, col: 2, values: ['1q', '2q', null] },
    { row: 1, col: 3, values: ['3q', null, '2a'] },
    { row: 2, col: 1, values: ['1a', '4q', null] },
    { row: 2, col: 2, values: [null, '5q', '4a'] },
    { row: 2, col: 3, values: [null, null, '5a'] },
    { row: 2, col: 4, values: ['3a', '6q', null] },
    { row: 3, col: 2, values: [null, '6a', null] },
  ],
};

// Большая шестиугольная сетка (12 вопросов)
export const hexGrid: TarsiaGridConfig = {
  id: 'hex',
  name: 'Большая шестиугольная',
  description: '12 вопросов, шестиугольная форма',
  questionCount: 12,
  triangles: [
    { row: 1, col: 3, values: ['1q', '2q', null] },
    { row: 1, col: 4, values: ['3q', null, '2a'] },
    { row: 2, col: 2, values: ['4q', '5q', '1a'] },
    { row: 2, col: 3, values: [null, '6q', '5a'] },
    { row: 2, col: 4, values: [null, null, '6a'] },
    { row: 2, col: 5, values: ['3a', '7q', null] },
    { row: 3, col: 1, values: ['4a', '8q', null] },
    { row: 3, col: 2, values: [null, '9q', '8a'] },
    { row: 3, col: 3, values: [null, null, '9a'] },
    { row: 3, col: 4, values: ['7a', '10q', null] },
    { row: 3, col: 5, values: [null, '11q', '10a'] },
    { row: 4, col: 3, values: [null, '12q', null] },
    { row: 4, col: 4, values: [null, null, '12a'] },
  ],
};

export const TARSIAG_GRIDS: TarsiaGridConfig[] = [
  smallTriangleGrid,
  triangleGrid,
  smallHexGrid,
  hexGrid,
];

export function getGridById(id: string): TarsiaGridConfig | undefined {
  return TARSIAG_GRIDS.find((g) => g.id === id);
}
