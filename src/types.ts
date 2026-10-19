export interface Stage {
  name: string;
  duration: number; // minutes
}

export interface LessonTemplate {
  id: string;
  name: string;
  stages: Stage[];
  custom?: boolean;
}

export type FlashCardStatus = 'new' | 'learning' | 'learned' | 'mistake';

export interface FlashCard {
  id: string;
  sides: string[]; // 2 sides = "Lame", 3+ sides = "Insane"
  status: FlashCardStatus;
  lastReviewed?: number;
  errorCount?: number;
}

export interface Deck {
  id: string;
  title: string;
  cards: FlashCard[];
  createdAt?: number;
  lastStudied?: number;
}

// === ФИЛВОРДЫ (WORD SEARCH) ===
export type WordDirection = 'horizontal' | 'vertical' | 'diagonal' | 'backward';

export interface PlacedWord {
  word: string;
  cells: { row: number; col: number }[]; // Координаты букв для подсветки ответов
}

export interface WordSearchResult {
  id: string;
  grid: string[][]; // Двумерный массив букв
  placedWords: PlacedWord[];
  failedWords: string[]; // Слова, которые не поместились в сетку
  gridSize: number;
}

export interface WordSearchConfig {
  gridSize: number; // 10, 15, 20
  difficulty: 'easy' | 'medium' | 'hard'; // Влияет на доступные направления слов
  language?: 'ru' | 'en'; // Язык филворда (кириллица или латиница)
}

// === УВЕДОМЛЕНИЯ (NOTIFICATIONS) ===
export type NotificationType = 'update' | 'feature' | 'event' | 'info' | 'gift';

export interface AppNotification {
  id: string; // Уникальный идентификатор (например, push-2026-10-20-contest)
  title: string; // Заголовок уведомления
  message: string; // Основной текст
  date: string; // ISO-строка даты создания
  type: NotificationType; // Тип (влияет на иконку и цвет)
  read: boolean; // Статус прочитано / не прочитано
  expiresAt?: string; // 🆕 ISO-строка даты, после которой уведомление скрывается навсегда
}

// === НАСТРОЙКИ ЛИЧНОГО КАБИНЕТА ===
export interface NotificationSettings {
  showBadge: boolean; // Пульсирующий бейдж на аватаре
  hideRead: boolean; // Скрывать прочитанные из ленты
  displayDays: number; // Срок показа в днях; 0 = без ограничения (до expiresAt)
}
