export type TarsiaShape = 'triangle' | 'hexagon' | 'small-triangle' | 'small-hex';

export type TarsiaCardSize = 'small' | 'medium' | 'large';

export interface TarsiaPair {
  id: string;
  left: string;   // вопрос
  right: string;  // ответ
}

export interface TarsiaPuzzle {
  id: string;
  title: string;
  shape: TarsiaShape;
  pairs: TarsiaPair[];
  puzzleTitle: string;
  solutionTitle: string;
  showSolution: boolean;
  cardSize: TarsiaCardSize;
  createdAt: number;
  updatedAt: number;
}

export interface TarsiaTriangle {
  row: number;
  col: number;
  // [сторона1, сторона2, сторона3] — коды типа "1q", "2a" или null (пустая сторона)
  values: [string | null, string | null, string | null];
}

export interface TarsiaGridConfig {
  id: TarsiaShape;
  name: string;
  description: string;
  triangles: TarsiaTriangle[];
  questionCount: number;
}

export function generateTarsiaId(prefix: string = 'tarsia'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function validateTarsiaPairs(pairs: TarsiaPair[]): TarsiaPair[] {
  return pairs.filter(
    (p) =>
      p &&
      typeof p.left === 'string' &&
      typeof p.right === 'string' &&
      p.left.trim() !== '' &&
      p.right.trim() !== '',
  );
}

export function splitTextToLines(text: string, maxLineLengths: number[]): string[] {
  if (!text || text.trim() === '') return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';
  let lineIndex = 0;

  for (const word of words) {
    if (lineIndex >= maxLineLengths.length) break;
    const maxLength = maxLineLengths[lineIndex];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= maxLength) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        lineIndex++;
        currentLine = word;
      } else {
        lines.push(word.substring(0, maxLength));
        lineIndex++;
        currentLine = '';
      }
    }
  }
  if (currentLine && lineIndex < maxLineLengths.length) {
    lines.push(currentLine);
  }
  return lines;
}

export const TARSIA_TEXT_CONFIG = {
  maxLineLengths: [25, 18, 10],
  maxLines: 3,
};
