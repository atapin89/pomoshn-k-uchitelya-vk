import type { BingoCard, BingoConfig, GridSize, GRID_SIZES } from '@/types/bingo';

/**
 * Перемешивает массив случайным образом (Fisher-Yates shuffle)
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Генерирует одну карточку бинго
 */
function generateSingleCard(
  words: string[],
  gridSize: GridSize,
  hasFreeCenter: boolean
): BingoCard {
  const { rows, cols, total } = GRID_SIZES[gridSize];
  const cellsNeeded = hasFreeCenter ? total - 1 : total;

  // Если слов меньше чем нужно — дублируем
  let availableWords = [...words];
  while (availableWords.length < cellsNeeded) {
    availableWords = [...availableWords, ...words];
  }

  // Выбираем случайные слова и перемешиваем
  const selectedWords = shuffle(availableWords).slice(0, cellsNeeded);

  // Создаём массив клеток
  const cells: (string | null)[] = [];

  if (gridSize === '5x5' && hasFreeCenter) {
    // Для 5x5 с центральной клеткой
    const centerIndex = 12; // Индекс центральной клетки (ряд 2, колонка 2)
    let wordIndex = 0;
    
    for (let i = 0; i < total; i++) {
      if (i === centerIndex) {
        cells.push(null); // Свободная клетка
      } else {
        cells.push(selectedWords[wordIndex]);
        wordIndex++;
      }
    }
  } else {
    // Для всех остальных размеров
    cells.push(...selectedWords);
  }

  // Инициализируем массив отмеченных клеток
  const markedCells = new Array(total).fill(false);

  // Для 5x5 с центральной клеткой — сразу отмечаем её
  if (gridSize === '5x5' && hasFreeCenter) {
    markedCells[12] = true;
  }

  return {
    id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    cells,
    markedCells,
  };
}

/**
 * Генерирует массив карточек бинго
 */
export function generateBingoCards(
  words: string[],
  config: BingoConfig
): BingoCard[] {
  const cards: BingoCard[] = [];

  for (let i = 0; i < config.cardCount; i++) {
    cards.push(generateSingleCard(words, config.gridSize, config.hasFreeCenter));
  }

  return cards;
}

/**
 * Генерирует случайный порядок вызова слов
 */
export function generateCallOrder(wordsCount: number): number[] {
  const order = Array.from({ length: wordsCount }, (_, i) => i);
  return shuffle(order);
}

/**
 * Проверяет выигрышные комбинации на карточке
 */
export function checkBingoWin(card: BingoCard, gridSize: GridSize): boolean {
  const { rows, cols } = GRID_SIZES[gridSize];
  const { markedCells } = card;

  // Проверяем горизонтали
  for (let row =
