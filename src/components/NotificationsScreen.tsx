import { useState, useEffect } from 'react';
import { Bell, BellOff, Check, CheckCheck, Trash2, Megaphone, Sparkles, Info, Gift, HelpCircle, ChevronDown } from 'lucide-react';
import BackButton from './BackButton';
import { triggerHaptic } from '@/lib/haptic';

// ===== Типы =====

interface AppNotification {
  id: string;
  title: string;
  message: string;
  date: string; // ISO строка
  type: 'update' | 'feature' | 'event' | 'info' | 'gift';
  read: boolean;
  link?: string; // опциональная ссылка на раздел приложения
}

// ===== Данные =====

const STORAGE_KEY = 'app-notifications';
const LAST_SEEN_KEY = 'app-notifications-last-seen';

// Стартовые уведомления (добавляйте новые сюда при обновлениях)
const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-001',
    title: '🎉 Добро пожаловать в «Помощник учителя»!',
    message: 'Спасибо, что вы с нами! В приложении 28 инструментов для подготовки, проведения уроков и заботы о себе. Загляните в «Руководство», чтобы узнать обо всех возможностях.',
    date: '2025-10-20T10:00:00Z',
    type: 'info',
    read: false,
  },
  {
    id: 'notif-002',
    title: '🆕 Новый раздел: «Сегодня на уроке»',
    message: 'Электронная доска урока с настраиваемыми полями, режимом проектора и QR-кодом для учеников. В конце урока дети сканируют код и уносят тему, план и домашнее задание в телефон.',
    date: '2025-10-15T12:00:00Z',
    type: 'feature',
    read: false,
  },
  {
    id: 'notif-003',
    title: '🏋️ Новый раздел: «Физминутка»',
    message: 'Три тренажёра в одном: глазодвигательная гимнастика с 6 траекториями и полноэкранным режимом, барабан случайных действий и тренажёр «метка на стекле». Две минуты — и внимание класса вернулось.',
    date: '2025-10-10T12:00:00Z',
    type: 'feature',
    read: false,
  },
  {
    id: 'notif-004',
    title: '🎁 Розыгрыш книги Александра Асмолова',
    message: 'Разыгрываем книгу «Психология достоинства. Искусство быть человеком». Расскажите о практике применения любого инструмента приложения с хэштегом #МойПомощникУчителя. Приём работ до 31 октября.',
    date: '2025-10-20T09:00:00Z',
    type: 'gift',
    read: false,
  },
];

const TYPE_CONFIG = {
  update: { icon: '🚀', label: 'Обновление', color: 'bg-blue-50 border-blue-200 text-blue-900' },
  feature: { icon: '✨', label: 'Новый инструмент', color: 'bg-purple-50 border-purple-200 text-purple-900' },
  event: { icon: '🎉', label: 'Событие', color: 'bg-amber-50 border-amber-200 text-amber-900' },
  info: { icon: '💜', label: 'Информация', color: 'bg-gray-50 border-gray-200 text-gray-900' },
  gift: { icon: '🎁', label: 'Подарок', color: 'bg-green-50 border-green-200 text-green-900' },
};

const FAQ_ITEMS = [
  {
    q: 'Откуда приходят уведомления?',
    a: 'Уведомления добавляются разработчиком при обновлениях приложения, запуске новых инструментов, конкурсах и важных событиях. Вы видите их здесь в виде списка.',
  },
  {
    q: 'Почему я не вижу старое уведомление?',
    a: 'Уведомления хранятся локально на вашем устройстве. Если вы очистили данные браузера или используете другое устройство, история может не сохраниться.',
  },
  {
    q: 'Как не пропустить важные уведомления?',
    a: 'Разрешите пуш-уведомления от ВКонтакте в настройках телефона. При важных обновлениях вы получите пуш, а содержимое будет доступно в этом разделе.',
  },
];

// ===== Компонент =====

export default function NotificationsScreen({ onBack }: { onBack: () => void }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  // Загрузка уведомлений
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as AppNotification[];
        if (Array.isArray(arr) && arr.length > 0) {
          // Объединяем с дефолтными, избегая дубликатов
          const existing = new Set(arr.map(n => n.id));
          const newDefaults = DEFAULT_NOTIFICATIONS.filter(n => !existing.has(n.id));
          setNotifications([...newDefaults, ...arr]);
          return;
        }
      }
    } catch {}
    setNotifications(DEFAULT_NOTIFICATIONS);
  }, []);

  // Сохранение уведомлений
  useEffect(() => {
    if (notifications.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
      } catch {}
    }
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    triggerHaptic('light');
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    triggerHaptic('medium');
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    triggerHaptic('light');
  };

  const clearAll = () => {
    setNotifications([]);
    setShowConfirmClear(false);
    triggerHaptic('heavy');
  };

  const filteredNotifications = notifications
    .filter(n => filter === 'all' || !n.read)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Сегодня, ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffDays === 1) {
      return `Вчера, ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffDays < 7) {
      return `${diffDays} дн. назад`;
    }
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="min-h-[100dvh] notebook-bg flex flex-col">
      {/* Шапка */}
      <header className="bg-purple-700 shadow-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Уведомления</h1>
          </div>
          <div className="relative">
            <Bell className="w-6 h-6 text-white/70 shrink-0" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 space-y-4 pb-8">
        {/* Панель управления */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          {/* Фильтр */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                filter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Все ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                filter === 'unread'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Непрочитанные ({unreadCount})
            </button>
          </div>

          {/* Действия */}
          <div className="flex gap-2">
            <button
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="flex-1 py-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              Прочитать все
            </button>
            <button
              onClick={() => setShowConfirmClear(true)}
              disabled={notifications.length === 0}
              className="flex-1 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Очистить
            </button>
          </div>
        </div>

        {/* Список уведомлений */}
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <BellOff className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              {filter === 'unread' ? 'Все уведомления прочитаны' : 'Нет уведомлений'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Новые уведомления появятся здесь при обновлениях приложения
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notif) => {
              const typeConfig = TYPE_CONFIG[notif.type];
              return (
                <div
                  key={notif.id}
                  className={`bg-white rounded-2xl shadow-sm p-4 border-l-4 transition-all ${
                    notif.read ? 'border-gray-200 opacity-80' : 'border-purple-500 shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Иконка типа */}
                    <div className={`shrink-0 w-10 h-10 rounded-xl ${typeConfig.color} border flex items-center justify-center text-xl`}>
                      {typeConfig.icon}
                    </div>

                    {/* Содержимое */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={`font-bold text-sm leading-tight ${notif.read ? 'text-gray-600' : 'text-gray-900'}`}>
                          {notif.title}
                        </h3>
                        {!notif.read && (
                          <button
                            onClick={() => markAsRead(notif.id)}
                            className="shrink-0 p-1 rounded hover:bg-purple-50 transition-colors"
                            aria-label="Отметить прочитанным"
                          >
                            <Check className="w-4 h-4 text-purple-600" />
                          </button>
                        )}
                      </div>
                      <p className={`text-xs mt-1 leading-relaxed ${notif.read ? 'text-gray-500' : 'text-gray-700'}`}>
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-gray-400">{formatDate(notif.date)}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${typeConfig.color}`}>
                          {typeConfig.label}
                        </span>
                      </div>
                    </div>

                    {/* Удаление */}
                    <button
                      onClick={() => deleteNotification(notif.id)}
                      className="shrink-0 p-1 rounded hover:bg-red-50 transition-colors"
                      aria-label="Удалить уведомление"
                    >
                      <Trash2 className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FAQ */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-base font-bold text-purple-700 mb-3 flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Частые вопросы
          </h2>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, index) => (
              <div key={index} className="border border-purple-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between gap-2 hover:bg-purple-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-gray-800">{item.q}</span>
                  <ChevronDown className={`w-4 h-4 text-purple-600 shrink-0 transition-transform duration-200 ${openFaq === index ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === index && (
                  <div className="px-4 py-3 bg-purple-50 border-t border-purple-100">
                    <p className="text-sm text-gray-700 leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Модалка подтверждения очистки */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowConfirmClear(false)}>
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Очистить все уведомления?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Это действие нельзя отменить. Все {notifications.length} уведомлений будут удалены.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="flex-1 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={clearAll}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors"
              >
                Очистить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
