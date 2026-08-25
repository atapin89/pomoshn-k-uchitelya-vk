import { vkStorageSet } from '@/lib/vkStorage';

export interface Student {
  name: string;
  gender: 'm' | 'f' | null;
}

export interface SavedList {
  id: string;
  name: string;
  text: string;
  createdAt: number;
  updatedAt: number;
}

const SAVED_KEY = 'generator-saved-lists';

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normGender(raw: string): 'm' | 'f' {
  const g = raw.trim().toLowerCase();
  if (g === 'м' || g === 'm' || g.startsWith('маль')) return 'm';
  return 'f';
}

/**
 * Разбор списка: один ученик на строку.
 * Пол указывается в скобках или через запятую/дефис:
 *   Иван Петров (м) · Аня Смирнова, ж · Олег (мальчик)
 * Без отметки пол = null. Дубликаты убираются.
 */
export function parseStudents(text: string): Student[] {
  const seen = new Set<string>();
  const result: Student[] = [];
  for (const raw of text.split('\n')) {
    let line = raw.trim();
    if (!line) continue;
    let gender: 'm' | 'f' | null = null;

    const paren = line.match(/^(.*?)\s*\(\s*(м|ж|m|f|мальчик|девочка)\s*\)\s*$/i);
    const comma = line.match(/^(.*?)\s*[,–—-]\s*(м|ж|m|f|мальчик|девочка)\s*$/i);
    const hit = paren || comma;
    if (hit && hit[1].trim()) {
      gender = normGender(hit[2]);
      line = hit[1].trim();
    }

    const key = line.toLowerCase();
    if (!line || seen.has(key)) continue;
    seen.add(key);
    result.push({ name: line, gender });
  }
  return result;
}

export function serializeStudents(students: Student[]): string {
  return students
    .map((s) => (s.gender ? `${s.name} (${s.gender === 'm' ? 'м' : 'ж'})` : s.name))
    .join('\n');
}

/** Чередование мальчиков и девочек для рассадки (максимально возможное) */
export function alternateByGender(students: Student[]): Student[] {
  const boys = shuffle(students.filter((s) => s.gender === 'm'));
  const girls = shuffle(students.filter((s) => s.gender === 'f'));
  const unknown = shuffle(students.filter((s) => s.gender === null));

  const seq: Student[] = [];
  let bi = 0;
  let gi = 0;
  let turn: 'm' | 'f' = boys.length >= girls.length ? 'm' : 'f';
  while (bi < boys.length || gi < girls.length) {
    if (turn === 'm') {
      if (bi < boys.length) seq.push(boys[bi++]);
      else if (gi < girls.length) seq.push(girls[gi++]);
      turn = 'f';
    } else {
      if (gi < girls.length) seq.push(girls[gi++]);
      else if (bi < boys.length) seq.push(boys[bi++]);
      turn = 'm';
    }
  }
  for (const u of unknown) {
    const pos = Math.floor(Math.random() * (seq.length + 1));
    seq.splice(pos, 0, u);
  }
  return seq;
}

export function loadSavedLists(): SavedList[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l) =>
        l &&
        typeof l.id === 'string' &&
        typeof l.name === 'string' &&
        typeof l.text === 'string',
    );
  } catch {
    return [];
  }
}

export function saveSavedLists(lists: SavedList[]): void {
  try {
    const json = JSON.stringify(lists);
    localStorage.setItem(SAVED_KEY, json);
    
    // Синхронизация с VK Storage
    void vkStorageSet(SAVED_KEY, json).catch(() => {
      // ignore
    });
  } catch {
    // ignore quota errors
  }
}
