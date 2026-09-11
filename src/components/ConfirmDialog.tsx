import { useState, useEffect, useRef, type ReactNode } from 'react';
import { AlertTriangle, Info } from 'lucide-react';

// ===== Диалог подтверждения (замена window.confirm) =====

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'ОК',
  cancelLabel = 'Отмена',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="p-5 pb-4">
          <div className="flex items-start gap-3">
            <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${danger ? 'bg-red-100' : 'bg-purple-100'}`}>
              <AlertTriangle className={`w-5 h-5 ${danger ? 'text-red-600' : 'text-purple-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-gray-800 leading-tight">{title}</h2>
              {message && (
                <div className="mt-1.5 text-sm text-gray-600 leading-relaxed whitespace-pre-line">{message}</div>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 text-white rounded-xl text-sm font-semibold transition-colors ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Информационный диалог (замена window.alert) =====

interface AlertDialogProps {
  isOpen: boolean;
  message: ReactNode;
  title?: string;
  closeLabel?: string;
  onClose: () => void;
}

export function AlertDialog({
  isOpen,
  message,
  title = 'Внимание',
  closeLabel = 'Понятно',
  onClose,
}: AlertDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="p-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Info className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-gray-800 leading-tight">{title}</h2>
              <div className="mt-1.5 text-sm text-gray-600 leading-relaxed whitespace-pre-line">{message}</div>
            </div>
          </div>
        </div>
        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Диалог ввода (замена window.prompt) =====

interface PromptDialogProps {
  isOpen: boolean;
  title: string;
  message?: ReactNode;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PromptDialog({
  isOpen,
  title,
  message,
  initialValue = '',
  placeholder,
  confirmLabel = 'ОК',
  cancelLabel = 'Отмена',
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Сбрасываем значение при открытии диалога
  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
    }
  }, [isOpen, initialValue]);

  // Фокус на input и выделение текста при открытии
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  // Enter = подтвердить, Escape = отмена
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (value.trim()) onConfirm(value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="p-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Info className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-gray-800 leading-tight">{title}</h2>
              {message && (
                <div className="mt-1.5 text-sm text-gray-600 leading-relaxed">{message}</div>
              )}
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full mt-3 rounded-xl border border-gray-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => onConfirm(value)}
            disabled={!value.trim()}
            className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
