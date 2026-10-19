import { useState, useEffect } from 'react';
import bridge from '@vkontakte/vk-bridge';
import {
  User,
  Bell,
  BellRing,
  BellOff,
  CheckCheck,
  Trash2,
  RefreshCw,
  ChevronDown,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import BackButton from './BackButton';
import { triggerHaptic } from '@/lib/haptic';
import type { AppNotification, NotificationSettings } from '@/types';
import {
  getLocalNotifications,
  saveLocalNotifications,
  getVisibleNotifications,
  loadSettings,
  saveSettings,
  syncNotificationsFeed,
  requestNotificationsPermission,
  getStoredPermission,
  DISPLAY_OPTIONS,
  type PermissionResult,
} from '@/lib/notificationsFeed';

// ===== Конфигурация типов уведомлений =====

const TYPE_CONFIG: Record<string, { icon: string; label: string }> = {
  update: { icon: '🚀', label: 'Обновление' },
  feature: { icon: '✨', label: 'Новый инструмент' },
  event: { icon: '🎉', label: 'Событие' },
  info: { icon: '💜', label: 'Информация' },
  gift: { icon: '🎁', label: 'Подарок' },
};

// ===== Компонент =====

export default function ProfileScreen({ onBack }: { onBack: () => void }) {
  const [profile, setProfile] = useState<{ name: string; photo: string | null }>({
    name: '',
    photo: null,
  });
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(() => loadSettings());
  const [permission, setPermission] = useState<PermissionResult | null>(() => getStoredPermission());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  // Перечитать ленту с учётом текущих настроек и сроков
  const refresh = () => {
    setNotifications(getVisibleNotifications(getLocalNotifications(), loadSettings()));
  };

  // Загрузка профиля из ВК + первичная загрузка ленты
  useEffect(() => {
    (async () => {
      try {
        const u = await bridge.send('VKWebAppGetUserInfo');
        const name = [u.first_name, u.last_name].filter(Boolean).join(' ');
        const info = u as unknown as { photo_200?: string; photo_100?: string };
        setProfile({ name: name || 'Пользователь', photo: info.photo_200 || info.photo_100 || null });
      } catch {
        // Вне ВКонтакте (браузер, dev-режим) — показываем заглушку
        setProfile({ name: 'Гость', photo: null });
      }
    })();

    refresh();
    window.addEventListener('notifications-updated', refresh);
    return () => window.removeEventListener('notifications-updated', refresh);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;
  const sorted = [...notifications].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // ===== Настройки =====

  const updateSettings = (patch: Partial<NotificationSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
    triggerHaptic('light');
    // Сразу пересчитываем ленту и бейдж на главной
    setNotifications(getVisibleNotifications(getLocalNotifications(), next));
    window.dispatchEvent(new Event('notifications-updated'));
  };

  // ===== Действия =====

  const handleAllowPush = async () => {
    triggerHaptic('medium');
    const result = await requestNotificationsPermission();
    setPermission(result);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    triggerHaptic('light');
    await syncNotificationsFeed();
    refresh();
    setIsSyncing(false);
  };

  const markRead = (id: string) => {
    const all = getLocalNotifications().map(n => (n.id === id ? { ...n, read: true } : n));
    saveLocalNotifications(all);
    refresh();
    window.dispatchEvent(new Event('notifications-updated'));
  };

  const markAllRead = () => {
    const all = getLocalNotifications().map(n => ({ ...n, read: true }));
    saveLocalNotifications(all);
    refresh();
    window.dispatchEvent(new Event('notifications-updated'));
    triggerHaptic('medium');
  };

  const clearAll = () => {
    saveLocalNotifications([]);
    setNotifications([]);
    setShowConfirmClear(false);
    window.dispatchEvent(new Event('notifications-updated'));
    triggerHaptic('heavy');
  };

  // ===== Форматирование =====

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-[100dvh] notebook-bg flex flex-col">
      {/* Шапка */}
      <header className="bg-purple-700 shadow-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Личный кабинет</h1>
          </div>
          <User className="w-6 h-6 text-white/70 shrink-0" />
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 space-y-4 pb-8">
        {/* ===== Карточка профиля: фото + имя ===== */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 to-violet-700 p-5 text-white shadow-md">
          <div className="flex items-center gap-4">
            {profile.photo ? (
              <img
                src={profile.photo}
                alt="Фото профиля"
                className="w-20 h-20 rounded-full object-cover ring-4 ring-white/30 shadow-lg shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/20 ring-4 ring-white/30 flex items-center justify-center shrink-0">
                <User className="w-10 h-10 text-white/80" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold truncate">{profile.name || 'Загрузка…'}</h2>
              <p className="text-purple-200 text-xs mt-0.5">Личный кабинет · «Помощник учителя»</p>
              <div className="flex flex-wrap gap-2 mt-2.5">
                <span className="px-2.5 py-1 rounded-full bg-white/15 text-[11px] font-semibold">
                  {unreadCount} непрочитанных
                </span>
                <span className="px-2.5 py-1 rounded-full bg-white/15 text-[11px] font-semibold">
                  {sorted.length} в ленте
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Управление уведомлениями ===== */}
        <section className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-purple-700 text-base">Управление уведомлениями</h3>
          </div>

          {/* Бейдж на аватаре */}
          <div className="flex items-center justify-between gap-3 py-1">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800">Бейдж на аватаре</p>
              <p className="text-[11px] text-gray-500">Пульсирующий счётчик непрочитанных</p>
            </div>
            <button
              onClick={() => updateSettings({ showBadge: !settings.showBadge })}
              className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${
                settings.showBadge ? 'bg-purple-600' : 'bg-gray-300'
              }`}
              aria-label="Переключить бейдж на аватаре"
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  settings.showBadge ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Скрывать прочитанные */}
          <div className="flex items-center justify-between gap-3 py-1">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800">Скрывать прочитанные</p>
              <p className="text-[11px] text-gray-500">В ленте останутся только новые</p>
            </div>
            <button
              onClick={() => updateSettings({ hideRead: !settings.hideRead })}
              className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${
                settings.hideRead ? 'bg-purple-600' : 'bg-gray-300'
              }`}
              aria-label="Переключить скрытие прочитанных"
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  settings.hideRead ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Срок показа */}
          <div className="py-1 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-purple-600" />
              <p className="text-sm font-semibold text-gray-800">Срок показа уведомлений</p>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              По истечении срока уведомление исчезнет само — даже если вы его не удаляли,
              а автор рассылки не обновлял файл уведомлений.
            </p>
            <select
              value={settings.displayDays}
              onChange={(e) => updateSettings({ displayDays: Number(e.target.value) })}
              className="w-full rounded-xl border border-purple-200 p-2.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              {DISPLAY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Пуш-разрешение ВК */}
          <div className="py-1 space-y-2">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <p className="text-sm font-semibold text-gray-800">Пуш-уведомления ВКонтакте</p>
            </div>
            {permission === 'granted' ? (
              <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5">
                ✅ Разрешены — рассылки из кабинета разработчика будут доходить до вас
              </p>
            ) : (
              <>
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                  {permission === 'unsupported'
                    ? 'Доступно только внутри ВКонтакте. Откройте приложение в мини-апе ВК, чтобы разрешить пуши.'
                    : 'Без разрешения ВК не доставит пуш-рассылки из кабинета разработчика. Нажмите кнопку и подтвердите запрос.'}
                </p>
                {permission !== 'unsupported' && (
                  <button
                    onClick={handleAllowPush}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <BellRing className="w-4 h-4" />
                    Разрешить пуш-уведомления
                  </button>
                )}
              </>
            )}
          </div>

          {/* Действия */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-purple-100">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              Обновить
            </button>
            <button
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="py-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Прочитать
            </button>
            <button
              onClick={() => setShowConfirmClear(true)}
              disabled={sorted.length === 0}
              className="py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Очистить
            </button>
          </div>
        </section>

        {/* ===== Краткая лента уведомлений ===== */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-purple-700 text-base">Уведомления</h3>
            <span className="text-xs text-gray-400">показано {sorted.length}</span>
          </div>

          {sorted.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <BellOff className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium text-sm">Нет активных уведомлений</p>
              <p className="text-xs text-gray-400 mt-1">
                Просроченные скрыты автоматически. Нажмите «Обновить», чтобы подтянуть новые рассылки.
              </p>
            </div>
          ) : (
            sorted.map(n => {
              const t = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
              const open = expandedId === n.id;
              return (
                <div
                  key={n.id}
                  className={`rounded-xl border overflow-hidden transition-colors ${
                    n.read ? 'border-gray-200 bg-white' : 'border-purple-200 bg-purple-50/60'
                  }`}
                >
                  <button
                    onClick={() => {
                      setExpandedId(open ? null : n.id);
                      if (!n.read) markRead(n.id);
                      triggerHaptic('light');
                    }}
                    className="w-full px-3 py-2.5 flex items-center gap-2.5 text-left"
                  >
                    <span className="text-lg shrink-0">{t.icon}</span>
                    <span className="flex-1 min-w-0">
                      <span
                        className={`block text-sm font-semibold truncate ${
                          n.read ? 'text-gray-600' : 'text-gray-900'
                        }`}
                      >
                        {n.title}
                      </span>
                      <span className="block text-[10px] text-gray-400 mt-0.5">
                        {formatDate(n.date)}
                        {n.expiresAt ? ` · до ${formatDate(n.expiresAt)}` : ''}
                        {' · '}
                        {t.label}
                      </span>
                    </span>
                    {!n.read && (
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 animate-pulse" />
                    )}
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${
                        open ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {open && (
                    <div className="px-3 pb-3 pt-2 text-xs text-gray-700 leading-relaxed border-t border-gray-100 bg-white">
                      {n.message}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>

        {/* Подсказка про авто-скрытие */}
        <section className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex gap-2.5">
          <Clock className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
          <p className="text-xs text-purple-900 leading-relaxed">
            Уведомления хранятся на устройстве и показываются столько, сколько указано в управлении
            (сейчас: {DISPLAY_OPTIONS.find(o => o.value === settings.displayDays)?.label.toLowerCase()}).
            После срока — или после даты «до», указанной автором рассылки, — они исчезают сами,
            без удаления вручную.
          </p>
        </section>
      </main>

      {/* Подтверждение очистки */}
      {showConfirmClear && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowConfirmClear(false)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-2">Очистить все уведомления?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Список на устройстве станет пустым. Новые рассылки продолжат приходить.
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
