import { useState } from 'react';
import { UserRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface UserAvatarProps {
  size?: 'sm' | 'md';
  showName?: boolean;
}

export function UserAvatar({ size = 'md', showName = false }: UserAvatarProps) {
  const { user, loading } = useAuth();
  const [imgError, setImgError] = useState(false);

  const box = size === 'sm' ? 'w-9 h-9' : 'w-10 h-10';
  const font = size === 'sm' ? 'text-xs' : 'text-sm';
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  // Скелетон во время загрузки
  if (loading) {
    return (
      <div
        className={`${box} rounded-full bg-purple-200/70 animate-pulse shrink-0`}
        aria-label="Загрузка профиля"
      />
    );
  }

  // Гость (вне VK или ошибка авторизации)
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
    <div className="flex items-center gap-2 shrink-0" title={fullName}>
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
    </div>
  );
}
