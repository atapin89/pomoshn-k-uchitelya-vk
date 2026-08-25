import type { TapperList } from '@/types/tapper';

const TAPPER_LISTS_KEY = 'tapper-lists';

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
