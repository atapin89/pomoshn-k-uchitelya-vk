import type { TarsiaGridConfig } from '@/types/tarsia';

// Оригинальные проверенные сетки (адаптировано из tarsia-generator)
export const smallTriangleGrid: TarsiaGridConfig = {
  id: 'small-triangle',
  name: 'Маленькая треугольная',
  description: '9 пар, компактный треугольник',
  questionCount: 9,
  triangles: [
    { row: 1, col: 4, values: ['1q', null, null] },
    { row: 2, col: 3, values: ['4q', '2q', null] },
    { row: 2, col: 4, values: ['1a', '2a', '3q'] },
    { row: 2, col: 5, values: ['5q', null, '3a'] },
    { row: 3, col: 2, values: [null, '6q', null] },
    { row: 3, col: 3, values: ['4a', '6a', '7q'] },
    { row: 3, col: 4, values: [null, '8q', '7a'] },
    { row: 3, col: 5, values: ['5a', '8a', '9q'] },
    { row: 3, col: 6, values: [null, null, '9a'] },
  ],
};

export const triangleGrid: TarsiaGridConfig = {
  id: 'triangle',
  name: 'Большая треугольная',
  description: '18 пар, классический треугольник',
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

export const smallHexGrid: TarsiaGridConfig = {
  id: 'small-hex',
  name: 'Маленькая шестиугольная',
  description: '11 пар, компактный шестиугольник',
  questionCount: 11,
  triangles: [
    { row: 1, col: 2, values: ['5q', '1q', null] },
    { row: 1, col: 3, values: [null, '1a', '2q'] },
    { row: 1, col: 4, values: ['6q', '3q', '2a'] },
    { row: 1, col: 5, values: [null, '3a', '4q'] },
    { row: 1, col: 6, values: ['7q', null, '4a'] },
    { row: 2, col: 2, values: ['5a', null, '8q'] },
    { row: 2, col: 3, values: [null, '9q', '8a'] },
    { row: 2, col: 4, values: ['6a', '9a', '10q'] },
    { row: 2, col: 5, values: [null, '11q', '10a'] },
    { row: 2, col: 6, values: ['7a', '11a', null] },
  ],
};

export const hexGrid: TarsiaGridConfig = {
  id: 'hex',
  name: 'Большая шестиугольная',
  description: '30 пар, большой шестиугольник',
  questionCount: 30,
  triangles: [
    { row: 1, col: 2, values: ['5q', '1q', null] },
    { row: 1, col: 3, values: [null, '1a', '2q'] },
    { row: 1, col: 4, values: ['6q', '3q', '2a'] },
    { row: 1, col: 5, values: [null, '3a', '4q'] },
    { row: 1, col: 6, values: ['7q', null, '4a'] },
    { row: 2, col: 1, values: ['14q', '8q', null] },
    { row: 2, col: 2, values: ['5a', '8a', '9q'] },
    { row: 2, col: 3, values: ['15q', '10q', '9a'] },
    { row: 2, col: 4, values: ['6a', '10a', '11q'] },
    { row: 2, col: 5, values: ['16q', '12q', '11a'] },
    { row: 2, col: 6, values: ['7a', '12a', '13q'] },
    { row: 2, col: 7, values: ['17q', null, '13a'] },
    { row: 3, col: 1, values: ['14a', null, '18q'] },
    { row: 3, col: 2, values: ['24q', '19q', '18a'] },
    { row: 3, col: 3, values: ['15a', '19a', '20q'] },
    { row: 3, col: 4, values: ['25q', '21q', '20a'] },
    { row: 3, col: 5, values: ['16a', '21a', '22q'] },
    { row: 3, col: 6, values: ['26q', '23q', '22a'] },
    { row: 3, col: 7, values: ['17a', '23a', null] },
    { row: 4, col: 2, values: ['24a', null, '27q'] },
    { row: 4, col: 3, values: [null, '28q', '27a'] },
    { row: 4, col: 4, values: ['25a', '28a', '29q'] },
    { row: 4, col: 5, values: [null, '30q', '29a'] },
    { row: 4, col: 6, values: ['26a', '30a', null] },
  ],
};

export const TARSIAG_GRIDS: TarsiaGridConfig[] = [
  smallTriangleGrid,
  triangleGrid,
  smallHexGrid,
  hexGrid,
];

export function getTarsiaGridById(id: string): TarsiaGridConfig {
  return TARSIAG_GRIDS.find((g) => g.id === id) || smallTriangleGrid;
}
