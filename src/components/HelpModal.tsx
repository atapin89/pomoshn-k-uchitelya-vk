import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export function HelpModal({ isOpen, onClose, title, content }: HelpModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Закрытие по Escape и блокировка прокрутки
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      
      // Автофокус на модальном окне
      setTimeout(() => {
        modalRef.current?.focus();
      }, 100);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div 
        ref={modalRef}
        tabIndex={-1}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto transform transition-all duration-200 scale-100 focus:outline-none focus:ring-2 focus:ring-purple-400"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-purple-700">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
            aria-label="Закрыть"
            title="Закрыть"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        {/* Содержимое */}
        <div className="p-6">
          <p className="text-gray-700 leading-relaxed text-base whitespace-pre-line">
            {content}
          </p>
        </div>
        
        {/* Кнопка закрытия */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}
