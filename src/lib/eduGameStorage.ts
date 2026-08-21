import type { EduGame, EduPlayer } from '@/types/eduGame';
import { generateEduId } from '@/types/eduGame';

const GAMES_KEY = 'edu-games';

/** Формат файла для обмена играми между учителями */
export const EDU_GAME_FORMAT = 'pomoshnik-uchitelya-edu-game';

export function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_').slice(0, 60) || 'file';
}

export function downloadTextFile(
  filename: string,
  content: string,
  mime = 'text/plain;charset=utf-8',
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ===== СОХРАНЁННЫЕ ИГРЫ =====
export function loadEduGames(): EduGame[] {
  try {
    const raw = localStorage.getItem(GAMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (g) =>
        g &&
        typeof g.id === 'string' &&
        typeof g.title === 'string' &&
        Array.isArray(g.rounds),
    );
  } catch {
    return [];
  }
}

export function saveEduGames(games: EduGame[]): void {
  try {
    localStorage.setItem(GAMES_KEY, JSON.stringify(games));
  } catch {
    // ignore quota errors
  }
}

export function upsertEduGame(game: EduGame): void {
  const games = loadEduGames();
  const idx = games.findIndex((g) => g.id === game.id);
  const next = { ...game, updatedAt: Date.now() };
  if (idx >= 0) games[idx] = next;
  else games.push(next);
  saveEduGames(games);
}

export function deleteEduGame(id: string): void {
  saveEduGames(loadEduGames().filter((g) => g.id !== id));
}

// ===== ОБМЕН ИГРАМИ (JSON) =====
export function serializeEduGame(game: EduGame): string {
  return JSON.stringify({ format: EDU_GAME_FORMAT, version: 1, game }, null, 2);
}

export function parseEduGameFile(text: string): EduGame | null {
  try {
    const data = JSON.parse(text);
    const g = data && data.format === EDU_GAME_FORMAT ? data.game : data;
    if (!g || typeof g.title !== 'string' || !Array.isArray(g.rounds)) return null;

    const rounds = g.rounds
      .filter((r: any) => r && typeof r.title === 'string' && Array.isArray(r.questions))
      .map((r: any) => ({
        id: typeof r.id === 'string' ? r.id : generateEduId('round'),
        title: r.title,
        questions: r.questions
          .filter((q: any) => q && typeof q.text === 'string' && q.text.trim())
          .map((q: any) => ({
            id: typeof q.id === 'string' ? q.id : generateEduId('q'),
            text: q.text,
            answer: typeof q.answer === 'string' ? q.answer : '',
            points: typeof q.points === 'number' && q.points > 0 ? q.points : 10,
          })),
      }));

    if (rounds.length === 0) return null;

    return {
      id: generateEduId('edugame'),
      title: g.title,
      rounds,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

// ===== УЧАСТНИКИ И РЕЗУЛЬТАТЫ =====
export function parsePlayersText(text: string): EduPlayer[] {
  const seen = new Set<string>();
  const result: EduPlayer[] = [];
  for (const raw of text.split('\n')) {
    const name = raw.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ id: generateEduId('player'), name, score: 0 });
  }
  return result;
}

export function serializePlayersResults(players: EduPlayer[]): string {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return sorted
    .map((p, i) => `${i + 1}. ${p.name} — ${p.score} очков`)
    .join('\n');
}
