// src/lib/sync.ts

import { vkStorageGet, vkStorageSet, isVKStorageSupported } from '@/lib/vkStorage';

/**
 * Механизм синхронизации localStorage с VK Storage.
 * 
 * При запуске:
 * 1. Загружаем данные из VK Storage (если есть)
 * 2. Сравниваем с localStorage (по дате обновления)
 * 3. Используем более свежие данные
 * 
 * При сохранении:
 * 1. Сохраняем в localStorage (как обычно)
 * 2. Синхронизируем в VK Storage
 */

// Ключи, которые нужно синхронизировать
const SYNC_KEYS = [
  'edu-games',                    // Своя игра
  'tapper-lists',                 // Счётчик активности
  'tapper-current-session',       // Сессия активности
  'tarsia-puzzles',               // Тарсия пазлы
  'pomodoro-state',               // Помодоро состояние
  'pomodoro-settings',            // Помодоро настройки
  'pomodoro-stats',               // Помодоро статистика
  'generator-class-list',         // Жеребьёвка список
  'generator-saved-lists',        // Жеребьёвка сохранённые
  'generator-consider-gender',    // Жеребьёвка настройки
  'home-visible-sections',        // Видимость разделов
  'flashcards-decks',             // Флэш-карточки колоды
  'custom-templates',             // Таймер шаблоны
  'bingo-saved-sets',             // Бинго наборы
  'bingo-current-game',           // Бинго текущая игра
  'wordsearch-saved',             // Филворды (если есть)
];

// Синхронизировать все данные из localStorage в VK Storage
export async function syncLocalToVK(): Promise<void> {
  if (!isVKStorageSupported()) return;
  
  for (const key of SYNC_KEYS) {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        await vkStorageSet(key, value);
      }
    } catch {
      // ignore
    }
  }
}

// Загрузить данные из VK Storage и применить (если они новее)
export async function syncVKToLocal(): Promise<void> {
  if (!isVKStorageSupported()) return;
  
  for (const key of SYNC_KEYS) {
    try {
      const vkValue = await vkStorageGet(key);
      if (!vkValue) continue;
      
      const localValue = localStorage.getItem(key);
      
      // Если в localStorage нет данных — берём из VK
      if (!localValue) {
        localStorage.setItem(key, vkValue);
        continue;
      }
      
      // Сравниваем: если в VK новее — обновляем localStorage
      try {
        const localParsed = JSON.parse(localValue);
        const vkParsed = JSON.parse(vkValue);
        
        const localTimestamp = getTimestamp(localParsed);
        const vkTimestamp = getTimestamp(vkParsed);
        
        if (vkTimestamp > localTimestamp) {
          localStorage.setItem(key, vkValue);
        }
      } catch {
        // Если JSON не парсится, берём более длинный
        if (vkValue.length > localValue.length) {
          localStorage.setItem(key, vkValue);
        }
      }
    } catch {
      // ignore
    }
  }
}

// Выполнить полную синхронизацию (сначала загрузка, потом выгрузка)
export async function fullSync(): Promise<void> {
  if (!isVKStorageSupported()) return;
  
  // 1. Загружаем из VK
  await syncVKToLocal();
  
  // 2. Выгружаем в VK (на случай если локальные данные новее)
  await syncLocalToVK();
}

// Извлечь timestamp из данных для сравнения
function getTimestamp(data: any): number {
  if (!data || typeof data !== 'object') return 0;
  
  // Пробуем разные поля
  if (typeof data.updatedAt === 'number') return data.updatedAt;
  if (typeof data.createdAt === 'number') return data.createdAt;
  
  // Для массива — максимальный timestamp
  if (Array.isArray(data)) {
    return data.reduce((max, item) => {
      const t = getTimestamp(item);
      return Math.max(max, t);
    }, 0);
  }
  
  // Для объекта — ищем вложенные timestamp
  let maxTimestamp = 0;
  for (const value of Object.values(data)) {
    if (typeof value === 'object' && value !== null) {
      const t = getTimestamp(value);
      if (t > maxTimestamp) maxTimestamp = t;
    }
  }
  return maxTimestamp;
}
