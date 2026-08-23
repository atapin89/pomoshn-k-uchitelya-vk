import type { EduGame, EduPlayer } from '@/types/eduGame';
import { generateEduId, isEduGame, isEduPlayer } from '@/types/eduGame';

const GAMES_KEY = 'edu-games';
const MAX_STORAGE_SIZE = 4 * 1024 * 1024; // 4 МБ

/** Формат файла для обмена играми между учителями */
export const EDU_GAME_FORMAT = 'pomoshnik-uchitelya-edu-game';
export const EDU_GAME_VERSION = 1;

export function sanitizeFileName(name: string): string {
  const sanitized = name
    .replace(/[\\/:*?"<>|]/g, '')      // Запрещённые символы
    .replace(/^\.+/, '')                 // Точки в начале (path traversal)
    .replace(/[\x00-\x1f\x7f]/g, '')     // Управляющие символы
    .replace(/\s+/g, '_')                // Пробелы → подчёркивания
    .slice(0, 60)                        // Ограничение длины
    .trim();
  
  return sanitized || 'file';
}

export function downloadTextFile(
  filename: string,
  content: string,
  mime = 'text/plain;charset=utf-8',
): void {
  try {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = sanitizeFileName(filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Ошибка при скачивании файла:', error);
  }
}

// ===== СОХРАНЁННЫЕ ИГРЫ =====

export function loadEduGames(): EduGame[] {
  try {
    const raw = localStorage.getItem(GAMES_KEY);
    if (!raw) return [];
    
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    return parsed.filter(isEduGame);
  } catch (error) {
    console.error('Ошибка загрузки игр:', error);
    return [];
  }
}

export function saveEduGames(games: EduGame[]): void {
  try {
    const json = JSON.stringify(games);
    
    if (json.length > MAX_STORAGE_SIZE) {
      console.warn('Размер данных превышает рекомендуемый лимит');
    }
    
    localStorage.setItem(GAMES_KEY, json);
  } catch (error) {
    console.error('Ошибка сохранения игр:', error);
    // Пытаемся сохранить хотя бы часть
    try {
      const half = games.slice(0, Math.ceil(games.length / 2));
      localStorage.setItem(GAMES_KEY, JSON.stringify(half));
    } catch {
      // Если и это не помогло — игнорируем
    }
  }
}

export function upsertEduGame(game: EduGame): void {
  if (!isEduGame(game)) {
    console.error('Некорректные данные игры:', game);
    return;
  }
  
  const games = loadEduGames();
  const idx = games.findIndex((g) => g.id === game.id);
  const next = { ...game, updatedAt: Date.now() };
  
  if (idx >= 0) {
    games[idx] = next;
  } else {
    games.push(next);
  }
  
  saveEduGames(games);
}

export function deleteEduGame(id: string): void {
  saveEduGames(loadEduGames().filter((g) => g.id !== id));
}

// ===== ОБМЕН ИГРАМИ (JSON) =====

export function serializeEduGame(game: EduGame): string {
  return JSON.stringify(
    { 
      format: EDU_GAME_FORMAT, 
      version: EDU_GAME_VERSION, 
      game 
    }, 
    null, 
    2,
  );
}

export function parseEduGameFile(text: string): EduGame | null {
  try {
    const data = JSON.parse(text);
    
    // Проверяем формат
    if (data.format && data.format !== EDU_GAME_FORMAT) {
      console.warn('Неверный формат файла:', data.format);
      return null;
    }
    
    // Проверяем версию
    if (data.version && data.version > EDU_GAME_VERSION) {
      console.warn('Файл создан в более новой версии:', data.version);
      return null;
    }
    
    const g = data.game || data;
    
    // Полная валидация
    if (!isEduGame(g)) {
      console.warn('Некорректные данные игры');
      return null;
    }
    
    // Нормализация ID
    return {
      ...g,
      id: generateEduId('edugame'), // Всегда новый ID при импорте
      rounds: g.rounds.map((round) => ({
        ...round,
        id: generateEduId('round'),
        questions: round.questions.map((q) => ({
          ...q,
          id: generateEduId('q'),
        })),
      })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  } catch (error) {
    console.error('Ошибка парсинга файла игры:', error);
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
    
    result.push({ 
      id: generateEduId('player'), 
      name: name.slice(0, 50), // Ограничение длины имени
      score: 0,
    });
  }
  
  return result;
}

export function serializePlayersResults(players: EduPlayer[]): string {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  
  if (sorted.length === 0) {
    return 'Нет участников';
  }
  
  return sorted
    .map((p, i) => `${i + 1}. ${p.name} — ${p.score} очков`)
    .join('\n');
}

// ===== УТИЛИТЫ =====

export function validatePlayerData(data: unknown): data is EduPlayer {
  return isEduPlayer(data);
}

export function getStorageUsage(): number {
  try {
    const raw = localStorage.getItem(GAMES_KEY);
    return raw ? new Blob([raw]).size : 0;
  } catch {
    return 0;
  }
}
