// src/lib/tapperStorage.ts

import type { TapperList, TapperStudent } from '@/types/tapper';
import { generateTapperId } from '@/types/tapper';

const LISTS_KEY = 'tapper-lists';
const SESSION_KEY = 'tapper-current-session';

// ===== СПИСКИ =====

export function loadTapperLists(): TapperList[] {
  try {
    const raw = localStorage.getItem(LISTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l) => l && typeof l.id === 'string' && Array.isArray(l.students),
    );
  } catch {
    return [];
  }
}

export function saveTapperLists(lists: TapperList[]): void {
  try {
    localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
  } catch {
    console.error('Ошибка сохранения списков таппера');
  }
}

export function upsertTapperList(list: TapperList): void {
  const lists = loadTapperLists();
  const idx = lists.findIndex((l) => l.id === list.id);
  const next = { ...list, updatedAt: Date.now() };
  if (idx >= 0) lists[idx] = next;
  else lists.push(next);
  saveTapperLists(lists);
}

export function deleteTapperList(id: string): void {
  saveTapperLists(loadTapperLists().filter((l) => l.id !== id));
}

export function renameTapperList(id: string, newName: string): void {
  const lists = loadTapperLists();
  const idx = lists.findIndex((l) => l.id === id);
  if (idx >= 0) {
    lists[idx] = { ...lists[idx], name: newName, updatedAt: Date.now() };
    saveTapperLists(lists);
  }
}

// ===== ИМПОРТ / ЭКСПОРТ =====

export function serializeTapperList(list: TapperList): string {
  return JSON.stringify({ format: 'pomoshnik-uchitelya-tapper', version: 1, list }, null, 2);
}

export function parseTapperListFile(text: string): TapperList | null {
  try {
    const data = JSON.parse(text);
    const listData = data.format === 'pomoshnik-uchitelya-tapper' ? data.list : data;
    
    if (!listData || typeof listData.name !== 'string' || !Array.isArray(listData.students)) {
      return null;
    }
    
    const students: TapperStudent[] = listData.students
      .filter((s: any) => s && typeof s.name === 'string' && s.name.trim())
      .map((s: any) => ({
        id: typeof s.id === 'string' ? s.id : generateTapperId('student'),
        name: s.name.trim(),
        answerCount: typeof s.answerCount === 'number' ? s.answerCount : 0,
        isPresent: typeof s.isPresent === 'boolean' ? s.isPresent : true,
      }));
    
    if (students.length === 0) return null;
    
    return {
      id: generateTapperId('tapper-list'),
      name: listData.name,
      students,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

// ===== СЕССИЯ =====

export function loadTapperSession(): Record<string, number> {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

export function saveTapperSession(results: Record<string, number>): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(results));
  } catch {
    // ignore
  }
}

export function clearTapperSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
