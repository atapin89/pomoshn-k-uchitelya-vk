import type { TarsiaPuzzle, TarsiaPair } from '@/types/tarsia';
import { generateTarsiaId, validateTarsiaPairs } from '@/types/tarsia';

const PUZZLES_KEY = 'tarsia-puzzles';

export function loadTarsiaPuzzles(): TarsiaPuzzle[] {
  try {
    const raw = localStorage.getItem(PUZZLES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p: any) => p && typeof p.id === 'string' && Array.isArray(p.pairs));
  } catch {
    return [];
  }
}

export function saveTarsiaPuzzles(puzzles: TarsiaPuzzle[]): void {
  try {
    localStorage.setItem(PUZZLES_KEY, JSON.stringify(puzzles));
  } catch {
    // ignore quota errors
  }
}

export function upsertTarsiaPuzzle(puzzle: TarsiaPuzzle): void {
  const puzzles = loadTarsiaPuzzles();
  const idx = puzzles.findIndex((p) => p.id === puzzle.id);
  const next = { ...puzzle, updatedAt: Date.now() };
  if (idx >= 0) puzzles[idx] = next;
  else puzzles.push(next);
  saveTarsiaPuzzles(puzzles);
}

export function deleteTarsiaPuzzle(id: string): void {
  saveTarsiaPuzzles(loadTarsiaPuzzles().filter((p) => p.id !== id));
}

export function renameTarsiaPuzzle(id: string, newName: string): void {
  const puzzles = loadTarsiaPuzzles();
  const idx = puzzles.findIndex((p) => p.id === id);
  if (idx >= 0) {
    puzzles[idx] = { ...puzzles[idx], title: newName, updatedAt: Date.now() };
    saveTarsiaPuzzles(puzzles);
  }
}

export function serializeTarsiaPuzzle(puzzle: TarsiaPuzzle): string {
  return JSON.stringify(
    { format: 'pomoshnik-uchitelya-tarsia', version: 1, puzzle },
    null,
    2,
  );
}

export function parseTarsiaPuzzleFile(text: string): TarsiaPuzzle | null {
  try {
    const data = JSON.parse(text);
    const pd = data.format === 'pomoshnik-uchitelya-tarsia' ? data.puzzle : data;
    if (!pd || typeof pd.title !== 'string' || !Array.isArray(pd.pairs)) return null;
    const validPairs = validateTarsiaPairs(
      pd.pairs
        .filter((p: any) => p && typeof p.left === 'string' && typeof p.right === 'string')
        .map((p: any) => ({
          id: typeof p.id === 'string' ? p.id : generateTarsiaId('pair'),
          left: p.left.trim(),
          right: p.right.trim(),
        })),
    );
    if (validPairs.length === 0) return null;
    const shapes: string[] = ['small-triangle', 'triangle', 'small-hex', 'hex'];
    return {
      id: generateTarsiaId('tarsia'),
      title: pd.title,
      shape: shapes.includes(pd.shape) ? pd.shape : 'small-triangle',
      pairs: validPairs,
      puzzleTitle: pd.puzzleTitle || 'Соедини вопрос с ответом',
      solutionTitle: pd.solutionTitle || 'Решение',
      showSolution: pd.showSolution !== false,
      cardSize: ['small', 'medium', 'large'].includes(pd.cardSize) ? pd.cardSize : 'medium',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

export function parseTarsiaTxtFile(text: string): TarsiaPair[] {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l);
  const pairs: TarsiaPair[] = [];
  for (const line of lines) {
    const parts = line.split(/\t|=|\||;/);
    if (parts.length >= 2) {
      const left = parts[0].trim();
      const right = parts.slice(1).join(' ').trim();
      if (left && right) pairs.push({ id: generateTarsiaId('pair'), left, right });
    }
  }
  return pairs;
}
