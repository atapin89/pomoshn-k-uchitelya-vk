import { ArrowLeft } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptic';

interface BackButtonProps {
  onClick: () => void;
  variant?: 'light' | 'dark';
}

export default function BackButton({ onClick, variant = 'dark' }: BackButtonProps) {
  const isLight = variant === 'light';
  
  const handleClick = () => {
    try {
      triggerHaptic('light');
    } catch {
      // Haptic не поддерживается — игнорируем
    }
    onClick();
  };
  
  return (
    <button
      onClick={handleClick}
      className="flex items-center min-h-11 touch-manipulation transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-400 rounded-lg px-1"
      aria-label="Назад"
      title="Назад"
    >
      <span
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
          isLight
            ? 'bg-white/20 hover:bg-white/30'
            : 'bg-purple-100 hover:bg-purple-200'
        }`}
      >
        <ArrowLeft
          className={isLight ? 'text-white' : 'text-purple-700'}
          size={24}
        />
      </span>
      <span
        className={`text-sm font-medium ml-2 ${
          isLight ? 'text-white' : 'text-purple-700'
        }`}
      >
        Назад
      </span>
    </button>
  );
}
