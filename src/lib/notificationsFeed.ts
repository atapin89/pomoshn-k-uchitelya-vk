import bridge from '@vkontakte/vk-bridge';
import type { AppNotification, NotificationSettings } from '@/types';
import { DEFAULT_NOTIFICATIONS } from '@/data/defaultNotifications';

// ===== Ключи хранилища и URL =====

export const NOTIFICATIONS_STORAGE_KEY = 'app-notifications';
const SETTINGS_KEY = 'app-notifications-settings';
const PERMISSION_KEY = 'app-notifications-permission';
const FEED_URL = `${import.meta.env.BASE_URL}notifications.json`;

// ===== Дефолтные настройки личного кабинета =====

export const DEFAULT_SETTINGS: NotificationSettings = {
  showBadge: true,       // Пульсирующий бейдж на аватаре по умолчанию включён
  hideRead: false,       // Прочитанные показываются в ленте
  displayDays: 30,       // Срок показа 30 дней (до expiresAt при 0)
};

// Варианты выбора в select на экране личного кабинета
export const DISPLAY_OPTIONS = [
  { value: 7, label: '7 дней' },
  { value: 14, label: '14 дней' },
  { value: 30, label: '30 дней' },
  { value: 60, label: '60 дней' },
  { value: 90, label: '90 дней' },
  { value: 0, label: 'Без ограничения (до даты expiry)' },
];

// ===== Работа с настройками =====

export function loadSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
      // Сливаем с дефолтами, чтобы новые поля настроек подхватывались после обновления
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // Повреждённый JSON — используем дефолты
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: NotificationSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Хранилище переполнено или недоступно — молча игнорируем
  }
}

// ===== Логика видимости уведомлений =====

/**
 * Проверяет, должно ли уведомление показываться с учётом:
 * 1. Персональной даты истечения (expiresAt от автора рассылки)
 * 2. Глобального срока показа (displayDays от пользователя)
 * 3. Скрытия прочитанных (hideRead в настройках)
 *
 * Уведомление скрывается при срабатывании ЛЮБОГО из условий.
 */
export function isNotificationVisible(
  n: AppNotification,
  settings: NotificationSettings,
  now: number = Date.now()
): boolean {
  // 1. Персональная дата истечения от автора рассылки
  if (n.expiresAt) {
    const exp = new Date(n.expiresAt).getTime();
    if (!isNaN(exp) && now > exp) return false;
  }

  // 2. Глобальный срок показа от пользователя
  const created = new Date(n.date).getTime();
  if (!isNaN(created) && settings.displayDays > 0) {
    const ageDays = (now - created) / 86400000; // миллисекунд в дне
    if (ageDays > settings.displayDays) return false;
  }

  // 3. Скрытие прочитанных по настройке
  if (settings.hideRead && n.read) return false;

  return true;
}

/**
 * Возвращает только видимые уведомления из списка с учётом настроек.
 */
export function getVisibleNotifications(
  list: AppNotification[],
  settings: NotificationSettings
): AppNotification[] {
  return list.filter(n => isNotificationVisible(n, settings));
}

/**
 * Считает количество непрочитанных для бейджа на аватаре.
 * Учитывает настройки: если бейдж выключен — возвращает 0.
 * Считает только видимые (не просроченные и не скрытые) уведомления.
 */
export function getUnreadBadgeCount(): number {
  const settings = loadSettings();
  if (!settings.showBadge) return 0;
  const list = getLocalNotifications();
  return list.filter(n => !n.read && isNotificationVisible(n, settings)).length;
}

// ===== Локальное хранилище =====

function readLocal(): AppNotification[] | null {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw === null) return null; // Ключа нет = первый запуск
    const arr = JSON.parse(raw) as AppNotification[];
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
}

export function saveLocalNotifications(list: AppNotification[]) {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Хранилище недоступно — молча игнорируем
  }
}

/**
 * Возвращает локальный список уведомлений.
 * При первом запуске (ключа в localStorage нет) инициализирует дефолтными.
 */
export function getLocalNotifications(): AppNotification[] {
  const local = readLocal();
  if (local) return local;
  // Первый запуск — сохраняем дефолтные и возвращаем их
  saveLocalNotifications(DEFAULT_NOTIFICATIONS);
  return DEFAULT_NOTIFICATIONS;
}

// ===== Синхронизация с файлом-лентой рассылок =====

/**
 * Подтягивает свежие рассылки из public/notifications.json
 * (туда дублируются тексты из кабинета разработчика ВК).
 *
 * Объединяет с локальным списком по id — уже показанные не дублируются.
 * Новые помечаются как непрочитанные и триггерят пульсирующий бейдж.
 */
export async function syncNotificationsFeed(): Promise<AppNotification[]> {
  const base = getLocalNotifications();
  try {
    // ts в query string обходит HTTP-кэш CDN GitHub Pages
    const res = await fetch(`${FEED_URL}?ts=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return base;

    const data = (await res.json()) as { notifications?: AppNotification[] };
    const feed = Array.isArray(data?.notifications) ? data.notifications : [];

    const existing = new Set(base.map(n => n.id));
    const fresh: AppNotification[] = feed
      .filter(n => n && typeof n.id === 'string' && !existing.has(n.id))
      .map(n => ({
        id: n.id,
        title: n.title || 'Уведомление',
        message: n.message || '',
        date: n.date || new Date().toISOString(),
        type: n.type || 'info',
        read: false, // новое из рассылки всегда непрочитанное
        expiresAt: typeof n.expiresAt === 'string' ? n.expiresAt : undefined,
      }));

    if (fresh.length === 0) return base;

    // Свежие сверху, старые снизу
    const merged = [...fresh, ...base];
    saveLocalNotifications(merged);

    // Сообщаем открытым экранам (HomeScreen, ModernHomeScreen) об обновлении
    window.dispatchEvent(new Event('notifications-updated'));
    return merged;
  } catch {
    // Вне сети или файла нет — работаем с локальным списком
    return base;
  }
}

// ===== Разрешение на пуш-уведомления ВК =====

export type PermissionResult = 'granted' | 'denied' | 'unsupported';

/**
 * Возвращает сохранённый статус разрешения.
 * null = пользователь ещё не запрашивал разрешение.
 */
export function getStoredPermission(): PermissionResult | null {
  try {
    const raw = localStorage.getItem(PERMISSION_KEY);
    if (raw === 'granted' || raw === 'denied' || raw === 'unsupported') return raw;
  } catch {
    // ignore
  }
  return null;
}

/**
 * Запрашивает разрешение на пуш-уведомления через VK Bridge.
 * Кэширует результат в localStorage, чтобы не спамить запросом.
 */
export async function requestNotificationsPermission(): Promise<PermissionResult> {
  try {
    // VKWebAppAllowNotifications возвращает true при разрешении
    const result = await bridge.send('VKWebAppAllowNotifications');
    const status: PermissionResult = result ? 'granted' : 'denied';
    try { localStorage.setItem(PERMISSION_KEY, status); } catch {}
    return status;
  } catch {
    // Bridge недоступен (вне ВК) или метод не поддерживается
    try { localStorage.setItem(PERMISSION_KEY, 'denied'); } catch {}
    return 'denied';
  }
}
