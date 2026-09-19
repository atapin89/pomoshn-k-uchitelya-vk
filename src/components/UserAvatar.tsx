import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  UserRound,
  X,
  Copy,
  Check,
  ExternalLink,
  Mail,
  MapPin,
  Heart,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface UserAvatarProps {
  size?: 'sm' | 'md';
  showName?: boolean;
}

export function UserAvatar({ size = 'md', showName = false }: UserAvatarProps) {
  const { user, loading } = useAuth();
  const [imgError, setImgError] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [copied, setCopied] = useState(false);

  const box = size === 'sm' ? 'w-9 h-9' : 'w-10 h-10';
  const font = size === 'sm' ? 'text-xs' : 'text-sm';
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  const copyVkId = async () => {
    if (!user) return;
    const idText = String(user.id);
    try {
      await navigator.clipboard.writeText(idText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = idText;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // ignore
      }
    }
  };

  if (loading) {
    return (
      <div
        className={`${box} rounded-full bg-purple-200/70 animate-pulse shrink-0`}
        aria-label="Загрузка профиля"
      />
    );
  }

  if (!user) {
    return (
      <div
        className={`${box} rounded-full bg-white/70 border-2 border-purple-200 flex items-center justify-center shrink-0 text-purple-400`}
        aria-label="Гостевой режим"
        title="Гость"
      >
        <UserRound className={iconSize} />
      </div>
    );
  }

  const initials =
    `${user.firstName.charAt(0) || ''}${user.lastName.charAt(0) || ''}`.toUpperCase() || 'U';
  const fullName = `${user.firstName} ${user.lastName}`.trim();

  return (
    <>
      <button
        type="button"
        onClick={() => setShowProfile(true)}
        className="flex items-center gap-2 shrink-0 focus:outline-none focus:ring-2 focus:ring-purple-400 rounded-full active:scale-95 transition-transform"
        title={fullName}
        aria-label={`Открыть профиль: ${fullName}`}
      >
        {user.avatar && !imgError ? (
          <img
            src={user.avatar}
            alt={fullName}
            onError={() => setImgError(true)}
            className={`${box} rounded-full object-cover border-2 border-white shadow-md shrink-0 select-none`}
            draggable={false}
          />
        ) : (
          <div
            className={`${box} rounded-full bg-gradient-to-br from-purple-500 to-violet-600 text-white ${font} font-bold flex items-center justify-center border-2 border-white shadow-md shrink-0`}
          >
            {initials}
          </div>
        )}
        {showName && (
          <span className="text-sm font-semibold text-gray-800 max-w-[120px] truncate hidden sm:block">
            {user.firstName}
          </span>
        )}
      </button>

      {showProfile &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowProfile(false)}
          >
            <div
              className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-purple-600 to-violet-600 p-5 text-white relative">
                <button
                  onClick={() => setShowProfile(false)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  aria-label="Закрыть"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  {user.avatar && !imgError ? (
                    <img
                      src={user.avatar}
                      alt={fullName}
                      className="w-16 h-16 rounded-full object-cover border-2 border-white/60 shadow-lg"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-white/20 text-white text-xl font-bold flex items-center justify-center border-2 border-white/60">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0 pr-8">
                    <h3 className="font-bold text-lg leading-tight truncate">{fullName}</h3>
                    <p className="text-purple-200 text-xs mt-0.5">VK ID: {user.id}</p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-3">
                {user.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                )}
                {user.city && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">{user.city}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={copyVkId}
                    className="py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {copied ? 'Скопировано' : 'Копировать ID'}
                  </button>
                  <a
                    href={`https://vk.com/id${user.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Профиль ВК
                  </a>
                </div>

                <a
                  href="https://vk.ru/topteach"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Heart className="w-4 h-4" />
                  Сообщество «Помощник учителя»
                </a>

                <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                  Данные предоставлены VK ID и хранятся только на вашем устройстве
                </p>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
