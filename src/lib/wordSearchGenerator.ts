import type { WordSearchResult, WordSearchConfig, PlacedWord } from '@/types';

const RUSSIAN_ALPHABET = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
const ENGLISH_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function getRandomLetter(language: 'ru' | 'en' = 'ru'): string {
  const alphabet = language === 'en' ? ENGLISH_ALPHABET : RUSSIAN_ALPHABET;
  return alphabet[Math.floor(Math.random() * alphabet.length)];
}

function getDirections(difficulty: 'easy' | 'medium' | 'hard'): { dr: number; dc: number }[] {
  const dirs = [{ dr: 0, dc: 1 }, { dr: 1, dc: 0 }]; // горизонтально, вертикально
  if (difficulty !== 'easy') dirs.push({ dr: 1, dc: 1 }, { dr: 1, dc: -1 }); // + диагонали
  if (difficulty === 'hard') dirs.push({ dr: 0, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: -1 }, { dr: -1, dc: 1 }); // + задом наперед
  return dirs;
}

export function generateWordSearch(wordsInput: string, config: WordSearchConfig): WordSearchResult {
  const language = config.language || 'ru';
  
  // Регулярное выражение для фильтрации: принимаем кириллицу или латиницу
  const filterRegex = language === 'en' ? /[^A-Z]/g : /[^А-ЯЁ]/g;
  
  const words = wordsInput
    .split('\n')
    .map(w => w.trim().toUpperCase().replace(filterRegex, ''))
    .filter(w => w.length > 1 && w.length <= config.gridSize)
    .sort((a, b) => b.length - a.length); // Сначала размещаем длинные слова

  const size = config.gridSize;
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(''));
  const placedWords: PlacedWord[] = [];
  const failedWords: string[] = [];
  const directions = getDirections(config.difficulty);

  for (const word of words) {
    let placed = false;
    let attempts = 0;
    const maxAttempts = 100;

    while (!placed && attempts < maxAttempts) {
      attempts++;
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const startRow = Math.floor(Math.random() * size);
      const startCol = Math.floor(Math.random() * size);

      // Проверка границ сетки
      const endRow = startRow + dir.dr * (word.length - 1);
      const endCol = startCol + dir.dc * (word.length - 1);
      if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) continue;

      // Проверка конфликтов с уже размещенными буквами
      let canPlace = true;
      const cells: { row: number; col: number }[] = [];
      for (let i = 0; i < word.length; i++) {
        const r = startRow + dir.dr * i;
        const c = startCol + dir.dc * i;
        if (grid[r][c] !== '' && grid[r][c] !== word[i]) {
          canPlace = false;
          break;
        }
        cells.push({ row: r, col: c });
      }

      if (canPlace) {
        cells.forEach((cell, i) => {
          grid[cell.row][cell.col] = word[i];
        });
        placedWords.push({ word, cells });
        placed = true;
      }
    }

    if (!placed) failedWords.push(word);
  }

  // Заполняем пустые клетки случайными буквами выбранного алфавита
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = getRandomLetter(language);
      }
    }
  }

  return {
    id: Math.random().toString(36).substring(2, 9),
    grid,
    placedWords,
    failedWords,
    gridSize: size,
  };
}

export function generateBatch(wordsInput: string, config: WordSearchConfig, count: number): WordSearchResult[] {
  const results: WordSearchResult[] = [];
  for (let i = 0; i < count; i++) {
    results.push(generateWordSearch(wordsInput, config));
  }
  return results;
}
