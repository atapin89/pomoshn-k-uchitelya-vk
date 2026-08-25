import type { TapperList } from '@/types/tapper';

const TAPPER_LISTS_KEY = 'tapper-lists';
const TAPPER_SESSION_KEY = 'tapper-session';

// ===== СПИСКИ ТАПЕРА =====
export function loadTapperLists(): TapperList[] {
  try {
    const raw = localStorage.getItem(TAPPER_LISTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l) =>
        l &&
        typeof l.id === 'string' &&
        typeof l.title === 'string' &&
        Array.isArray(l.items ?? l.entries ?? l.cards ?? []),
    );
  } catch {
    return [];
  }
}

export function saveTapperLists(lists: TapperList[]): void {
  try {
    localStorage.setItem(TAPPER_LISTS_KEY, JSON.stringify(lists));
  } catch {
    // ignore quota errors
  }
}

export function upsertTapperList(list: TapperList): void {
  const lists = loadTapperLists();
  const idx = lists.findIndex((l) => l.id === list.id);
  if (idx >= 0) {
    lists[idx] = list;
  } else {
    lists.push(list);
  }
  saveTapperLists(lists);
}

export function deleteTapperList(id: string): void {
  saveTapperLists(loadTapperLists().filter((l) => l.id !== id));
}

export function renameTapperList(id: string, newTitle: string): void {
  saveTapperLists(
    loadTapperLists().map((l) => (l.id === id ? { ...l, title: newTitle } : l)),
  );
}

// ===== ОБМЕН СПИСКАМИ =====
export function serializeTapperList(list: TapperList): string {
  return JSON.stringify(
    { format: 'pomoshnik-uchitelya-tapper-list', version: 1, list },
    null,
    2,
  );
}

export function parseTapperListFile(text: string): TapperList | null {
  try {
    const data = JSON.parse(text);
    const l =
      data && data.format === 'pomoshnik-uchitelya-tapper-list' ? data.list : data;
    if (!l || typeof l.id !== 'string' || typeof l.title !== 'string') return null;
    return l as TapperList;
  } catch {
    return null;
  }
}

// ===== СЕССИЯ ТАПЕРА =====
export function loadTapperSession(): any {
  try {
    const raw = localStorage.getItem(TAPPER_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveTapperSession(session: any): void {
  try {
    localStorage.setItem(TAPPER_SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore quota errors
  }
}

export function clearTapperSession(): void {
  try {
    localStorage.removeItem(TAPPER_SESSION_KEY);
  } catch {
    // ignore
  }
}
