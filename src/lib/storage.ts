import type { LessonTemplate, Deck } from '@/types';
import { vkStorageSet } from '@/lib/vkStorage';

const CUSTOM_KEY = 'lesson-timer-custom-templates';
const DECKS_KEY = 'flashcards-decks';

export function loadCustomTemplates(): LessonTemplate[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t) =>
        t &&
        typeof t.id === 'string' &&
        typeof t.name === 'string' &&
        Array.isArray(t.stages),
    );
  } catch {
    return [];
  }
}

export function saveCustomTemplates(templates: LessonTemplate[]): void {
  try {
    const json = JSON.stringify(templates);
    localStorage.setItem(CUSTOM_KEY, json);
    
    // Синхронизация с VK Storage
    void vkStorageSet(CUSTOM_KEY, json).catch(() => {
      // ignore
    });
  } catch {
    // ignore quota errors
  }
}

export function loadDecks(): Deck[] {
  try {
    const raw = localStorage.getItem(DECKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (d) =>
        d &&
        typeof d.id === 'string' &&
        typeof d.title === 'string' &&
        Array.isArray(d.cards),
    );
  } catch {
    return [];
  }
}

export function saveDecks(decks: Deck[]): void {
  try {
    const json = JSON.stringify(decks);
    localStorage.setItem(DECKS_KEY, json);
    
    // Синхронизация с VK Storage
    void vkStorageSet(DECKS_KEY, json).catch(() => {
      // ignore
    });
  } catch {
    // ignore quota errors
  }
}

export function generateCardId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}
