import type { SavedTarsia } from '@/types/tarsia';

const SAVED_TARSIAS_KEY = 'tarsia-saved-puzzles';

export function loadSavedTarsias(): SavedTarsia[] {
  try {
    const raw = localStorage.getItem(SAVED_TARSIAS_KEY);
    if (!raw) return [];
    
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    return parsed.filter((t) => {
      return (
        t &&
        typeof t.id === 'string' &&
        typeof t.title === 'string' &&
        typeof t.questions === 'object' &&
        typeof t.answers === 'object' &&
        typeof t.gridId === 'string' &&
        typeof t.createdAt === 'number'
      );
    });
  } catch {
    return [];
  }
}

export function saveTarsia(tarsia: SavedTarsia): void {
  try {
    const tarsias = loadSavedTarsias();
    tarsias.push(tarsia);
    localStorage.setItem(SAVED_TARSIAS_KEY, JSON.stringify(tarsias));
  } catch {
    // ignore quota errors
  }
}

export function updateTarsia(updated: SavedTarsia): void {
  try {
    const tarsias = loadSavedTarsias();
    const index = tarsias.findIndex((t) => t.id === updated.id);
    if (index !== -1) {
      tarsias[index] = updated;
      localStorage.setItem(SAVED_TARSIAS_KEY, JSON.stringify(tarsias));
    }
  } catch {
    // ignore
  }
}

export function deleteTarsia(id: string): void {
  try {
    const tarsias = loadSavedTarsias();
    const filtered = tarsias.filter((t) => t.id !== id);
    localStorage.setItem(SAVED_TARSIAS_KEY, JSON.stringify(filtered));
  } catch {
    // ignore
  }
}

export function generateSaveCode(
  questions: Record<number, string[]>,
  answers: Record<number, string[]>,
  gridId: string,
): string {
  const data = {
    version: 2,
    questions,
    answers,
    gridId,
  };
  const jsonStr = JSON.stringify(data);
  return btoa(encodeURIComponent(jsonStr));
}

export function parseSaveCode(code: string): {
  questions: Record<number, string[]>;
  answers: Record<number, string[]>;
  gridId: string;
} | null {
  try {
    const cleanCode = code.replace(/\s+/g, '');
    const jsonStr = decodeURIComponent(atob(cleanCode));
    const data = JSON.parse(jsonStr);
    
    if (
      data &&
      typeof data.questions === 'object' &&
      typeof data.answers === 'object' &&
      typeof data.gridId === 'string'
    ) {
      return {
        questions: data.questions,
        answers: data.answers,
        gridId: data.gridId,
      };
    }
    return null;
  } catch {
    return null;
  }
}
