import { useState, useEffect } from 'react';
import { X, Sparkles, Monitor, Smartphone, Check } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

export default function WelcomeModal({ isOpen, onClose, userName }: WelcomeModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('welcome-modal-dismissed', 'true');
      } catch {}
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fadeIn">
      {/* Затемнение */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Модальное окно */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-slideUp">
        {/* Кнопка закрытия */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
          aria-label="Закрыть"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Шапка с градиентом */}
        <div className="bg-gradient-to-br from-purple-600 to-violet-700 px-6 pt-8 pb-6 text-white rounded-t-3xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                Добро пожаловать{userName ? `, ${userName}` : ''}!
              </h2>
              <p className="text-purple-100 text-sm">Помощник учителя</p>
            </div>
          </div>
          <p className="text-sm text-purple-50 leading-relaxed">
            25 инструментов для современного педагога: от таймера урока до азбуки Морзе.
          </p>
        </div>

        {/* Содержимое */}
        <div className="px-6 py-6 space-y-5">
          {/* Что умеет приложение */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Что вы найдёте здесь
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                <span>Таймеры, жеребьёвки, контроль шума</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                <span>Генераторы карточек, филвордов, постеров</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                <span>Конвертеры: числа, величины, морзе</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                <span>Турниры, викторины, учёт активности</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                <span>Телесуфлёр, QR-коды, облака слов</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                <span>Источники по ГОСТу, расписания с пиктограммами</span>
              </div>
            </div>
          </div>

          {/* Предупреждение о стабильности */}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 space-y-3">
            <h3 className="font-bold text-amber-900 flex items-center gap-2 text-sm">
              <span className="text-lg">⚠️</span>
              Важно: стабильность работы
            </h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-start gap-2">
                <Monitor className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">На компьютере</p>
                  <p className="text-gray-600 text-xs">Все функции работают стабильно и быстро</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Smartphone className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">На телефоне</p>
                  <p className="text-gray-600 text-xs">Некоторые инструменты могут работать медленнее или с ограничениями</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-amber-800 pt-1">
              Для лучшего опыта используйте приложение на компьютере или планшете.
            </p>
          </div>

          {/* Галочка "Больше не показывать" */}
          <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-xl hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700">Больше не показывать это окно</span>
          </label>

          {/* Кнопка закрытия */}
          <button
            onClick={handleClose}
            className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm transition-colors shadow-lg hover:shadow-xl"
          >
            Понятно, начнём! 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
