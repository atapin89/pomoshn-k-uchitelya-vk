export interface TarsiaQuestion {
  id: number;
  question: string[];  // массив строк для многострочного текста
  answer: string[];    // массив строк для многострочного текста
}

export interface TarsiaTriangle {
  row: number;
  col: number;
  values: [string | null, string | null, string | null]; // [сторона1, сторона2, сторона3]
  // значения в формате "1q", "2a" или null
}

export interface TarsiaGridConfig {
  id: string;
  name: string;
  description: string;
  triangles: TarsiaTriangle[];
  questionCount: number;
}

export interface TarsiaConfig {
  triangle: {
    side: number;
    height: number;
    style: {
      fill: string;
      stroke: string;
      strokeWidth: number;
    };
    text: {
      paddingY: number;
      style: {
        fill: string;
        fontSize: number;
        fontFamily: string;
        lineSpace: number;
      };
      lineLength: number[];
      maxLines: number;
      yHeightStep: number;
    };
  };
  pdf: {
    units: string;
    width: number;
    height: number;
    printMargin: number;
    orientation: 'landscape' | 'portrait';
    ratio: number;
  };
}

export interface SavedTarsia {
  id: string;
  title: string;
  questions: Record<number, string[]>;
  answers: Record<number, string[]>;
  gridId: string;
  createdAt: number;
  updatedAt: number;
}

// ===== ТИПЫ РЕДАКТОРА ТАРСИИ =====

export type TarsiaShape = 'triangle' | 'hexagon' | 'domino';
export type TarsiaCardSize = 'small' | 'medium' | 'large';

export interface TarsiaPair {
  id: string;
  left: string;
  right: string;
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

export const TARSIA_CONFIG: TarsiaConfig = {
  triangle: {
    side: 250,
    height: Math.sqrt(3) / 2 * 250,
    style: {
      fill: 'white',
      stroke: 'black',
      strokeWidth: 2,
    },
    text: {
      paddingY: 8,
      style: {
        fill: 'black',
        fontSize: 13,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        lineSpace: 0.1,
      },
      lineLength: [25, 18, 10, 5],
      maxLines: 3,
      yHeightStep: 0, // будет вычислено ниже
    },
  },
  pdf: {
    units: 'mm',
    width: 297,
    height: 210,
    printMargin: 7,
    orientation: 'landscape',
    ratio: 297 / 210,
  },
};

// Вычисляем yHeightStep
TARSIA_CONFIG.triangle.text.yHeightStep = 
  TARSIA_CONFIG.triangle.text.style.fontSize * (1 + TARSIA_CONFIG.triangle.text.style.lineSpace);

// ===== ГЕНЕРАЦИЯ ID И ВАЛИДАЦИЯ =====

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
        // Слово длиннее максимума — обрезаем
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
