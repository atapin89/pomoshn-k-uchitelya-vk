// src/lib/tarsiaGenerator.ts

/**
 * Адаптация grid.js из оригинального tarsia-generator
 * Отвечает за вычисление параметров сетки и разбивку текста
 */

import type { TarsiaGridCell, TarsiaGridParams } from '@/types/tarsia';

// ===== ПАРАМЕТРЫ ТРЕУГОЛЬНИКА =====
export const TRIANGLE_CONFIG = {
  side: 250,        // px
  height: 216.5,    // Math.sqrt(3) / 2 * side
  lineLengths: [25, 18, 10, 5],
  maxLines: 3,
  paddingY: 8,
  yHeightStep: 14.3, // fontSize * 1.1
};

// ===== ВЫЧИСЛЕНИЕ ПАРАМЕТРОВ СЕТКИ =====

export interface GridParams {
  nQuestions: number;
  width: number;
  height: number;
  minCol: number;
}

/**
 * Вычисляет размеры сетки на основе её ячеек
 */
export function calculateGridParameters(grid: TarsiaGridCell[]): GridParams {
  const rows = grid.map(cell => cell.location.row);
  const cols = grid.map(cell => cell.location.col);
  const minCol = Math.min(...cols);
  
  // Ширина: (maxCol - minCol) * 0.5 + 1 (треугольники одной ориентации)
  const width = (Math.max(...cols) - minCol) * 0.5 + 1;
  const height = (Math.max(...rows) - Math.min(...rows)) + 1;
  
  // Подсчёт уникальных вопросов (значения вида "1q", "2q" и т.д.)
  const allValues = grid.flatMap(cell => cell.values).filter(v => v !== null) as string[];
  const questionNumbers = allValues
    .filter(v => v.endsWith('q'))
    .map(v => parseInt(v.slice(0, -1), 10));
  const nQuestions = new Set(questionNumbers).size;
  
  return {
    nQuestions: Math.max(nQuestions, 0),
    width,
    height,
    minCol,
  };
}

// ===== РАЗБИЕНИЕ ТЕКСТА НА СТРОКИ =====

/**
 * Умное разбиение текста на строки по N символов
 * Ищет пробел для переноса по словам
 */
export function smartSplitByNChars(text: string, n: number): [string, string] {
  if (text.length > n) {
    try {
      // Ищем пробел в первых n символах
      const r = new RegExp('(^|\\s).{0,' + (n + 1) + '}$');
      const matchedString = text.match(r)![0].trim();
      const remainingString = text.replace(r, '');
      return [remainingString, matchedString];
    } catch {
      // Если regex не сработал — обрезаем по символам
      const matchedString = text.substring(text.length - n);
      const remainingString = text.substring(0, text.length - n) + '-';
      return [remainingString, matchedString];
    }
  }
  return ['', text];
}

/**
 * Разбивает текст на строки для размещения на грани треугольника
 */
export function splitUpText(text: string): string[] {
  if (!text) return [''];
  
  let textArray: string[] = [text];
  const { lineLengths, maxLines } = TRIANGLE_CONFIG;
  
  if (text.length > lineLengths[0]) {
    for (let i = 0; i < maxLines; i++) {
      const lineLength = lineLengths[Math.min(i, lineLengths.length - 1)];
      const textToSplit = textArray.shift()!;
      
      if (textToSplit.length <= lineLength) {
        // Если текст уже помещается — возвращаем
        textArray = [textToSplit, ...textArray];
        return textArray;
      } else {
        const [remaining, matched] = smartSplitByNChars(textToSplit, lineLength);
        textArray = [matched, remaining, ...textArray];
      }
    }
  }
  
  return textArray;
}

/**
 * Преобразует массив строк обратно в строку для ввода
 * (убирает переносы и дефисы)
 */
export function convertTextArrayToInputString(array: string[]): string {
  return array.map(str => {
    if (str) {
      // Если элемент заканчивается на '-' — удаляем его и не добавляем пробел
      if (str.endsWith('-')) {
        str = str.slice(0, -1);
      } else {
        str = str + ' ';
      }
    }
    return str;
  }).join('');
}
