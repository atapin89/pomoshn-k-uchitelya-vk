import type { SavedBingoSet, BingoGame } from '@/types/bingo';

const SAVED_SETS_KEY = 'bingo-saved-sets';
const CURRENT_GAME_KEY = 'bingo-current-game';

/**
 * Загружает все сохранённые наборы бинго из localStorage
 */
export function loadSavedBingoSets(): SavedBingoSet[] {
  try {
    const raw = localStorage.getItem(SAVED_SETS_KEY);
    if (!raw) return [];
    
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    return parsed.filter((set) => {
      return (
        set &&
        typeof set.id === 'string' &&
        typeof set.name === 'string' &&
        typeof set.config === 'object' &&
        Array.isArray(set.words) &&
        typeof set.createdAt === 'number'
      );
    });
  } catch {
    return [];
  }
}

/**
 * Сохраняет новый набор бинго
 */
export function saveBingoSet(set: SavedBingoSet): void {
  try {
    const sets = loadSavedBingoSets();
    sets.push(set);
    localStorage.setItem(SAVED_SETS_KEY, JSON.stringify(sets));
  } catch {
    // ignore quota errors
  }
}

/**
 * Обновляет существующий набор бинго
 */
export function updateBingoSet(updatedSet: SavedBingoSet): void {
  try {
    const sets = loadSavedBingoSets();
    const index = sets.findIndex((s) => s.id === updatedSet.id);
    if (index !== -1) {
      sets[index] = updatedSet;
      localStorage.setItem(SAVED_SETS_KEY, JSON.stringify(sets));
    }
  } catch {
    // ignore
  }
}

/**
 * Удаляет набор бинго по ID
 */
export function deleteBingoSet(id: string): void {
  try {
    const sets = loadSavedBingoSets();
    const filtered = sets.filter((s) => s.id !== id);
    localStorage.setItem(SAVED_SETS_KEY, JSON.stringify(filtered));
  } catch {
    // ignore
  }
}

/**
 * Сохраняет текущую игру бинго (для продолжения после закрытия)
 */
export function saveCurrentBingoGame(game: BingoGame): void {
  try {
    localStorage.setItem(CURRENT_GAME_KEY, JSON.stringify(game));
  } catch {
    // ignore quota errors
  }
}

/**
 * Загружает текущую игру бинго
 */
export function loadCurrentBingoGame(): BingoGame | null {
  try {
    const raw = localStorage.getItem(CURRENT_GAME_KEY);
    if (!raw) return null;
    
    const parsed = JSON.parse(raw);
    
    // Валидация структуры
    if (
      parsed &&
      typeof parsed.id === 'string' &&
      typeof parsed.config === 'object' &&
      Array.isArray(parsed.words) &&
      Array.isArray(parsed.cards) &&
      Array.isArray(parsed.callOrder) &&
      typeof parsed.currentCallIndex === 'number' &&
      typeof parsed.createdAt === 'number'
    ) {
      return parsed as BingoGame;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Очищает текущую игру бинго
 */
export function clearCurrentBingoGame(): void {
  try {
    localStorage.removeItem(CURRENT_GAME_KEY);
  } catch {
    // ignore
  }
}

/**
 * Проверяет, есть ли сохранённая игра
 */
export function hasCurrentBingoGame(): boolean {
  return loadCurrentBingoGame() !== null;
}
