import type { TarsiaPuzzle, TarsiaPair } from '@/types/tarsia';
import { generateTarsiaId, validateTarsiaPairs } from '@/types/tarsia';

const PUZZLES_KEY = 'tarsia-puzzles';

export function loadTarsiaPuzzles(): TarsiaPuzzle[] {
  try {
    const raw = localStorage.getItem(PUZZLES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p) => p && typeof p.id === 'string' && Array.isArray(p.pairs),
    );
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

// ===== ЭКСПОРТ / ИМПОРТ JSON =====
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
    const puzzleData =
      data.format === 'pomoshnik-uchitelya-tarsia' ? data.puzzle : data;
    if (
      !puzzleData ||
      typeof puzzleData.title !== 'string' ||
      !Array.isArray(puzzleData.pairs)
    ) {
      return null;
    }

    const validPairs = validateTarsiaPairs(
      puzzleData.pairs
        .filter(
          (p: any) =>
            p && typeof p.left === 'string' && typeof p.right === 'string',
        )
        .map((p: any) => ({
          id: typeof p.id === 'string' ? p.id : generateTarsiaId('pair'),
          left: p.left.trim(),
          right: p.right.trim(),
        })),
    );
    if (validPairs.length === 0) return null;

    return {
      id: generateTarsiaId('tarsia'),
      title: puzzleData.title,
      shape:
        ['triangle', 'hexagon', 'small-triangle', 'small-hex'].includes(
          puzzleData.shape,
        )
          ? puzzleData.shape
          : 'triangle',
      pairs: validPairs,
      puzzleTitle: puzzleData.puzzleTitle || 'Собери фигуру',
      solutionTitle: puzzleData.solutionTitle || 'Решение',
      showSolution: puzzleData.showSolution !== false,
      cardSize: ['small', 'medium', 'large'].includes(puzzleData.cardSize)
        ? puzzleData.cardSize
        : 'medium',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

// ===== ИМПОРТ ИЗ TXT =====
export function parseTarsiaTxtFile(text: string): TarsiaPair[] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l);
  const pairs: TarsiaPair[] = [];
  for (const line of lines) {
    const parts = line.split(/\t|=|\||;| - /);
    if (parts.length >= 2) {
      const left = parts[0].trim();
      const right = parts.slice(1).join(' - ').trim();
      if (left && right) {
        pairs.push({ id: generateTarsiaId('pair'), left, right });
      }
    }
  }
  return pairs;
}

export function exportTarsiaTxt(pairs: TarsiaPair[]): string {
  return pairs
    .filter((p) => p.left.trim() && p.right.trim())
    .map((p) => `${p.left}\t${p.right}`)
    .join('\n');
}
