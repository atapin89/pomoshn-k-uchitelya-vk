import { Clock, ChevronRight, Plus, BookOpen, Trash2, Pencil } from 'lucide-react';
import type { LessonTemplate } from '@/types';
import { totalDurationSeconds, formatTime } from '@/lib/format';
import BackButton from './BackButton';

interface TemplateListProps {
  templates: LessonTemplate[];
  onSelect: (template: LessonTemplate) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onEdit: (template: LessonTemplate) => void;
  onBack: () => void;
}

export default function TemplateList({
  templates,
  onSelect,
  onCreate,
  onDelete,
  onEdit,
  onBack,
}: TemplateListProps) {
  return (
    <div className="min-h-[100dvh] notebook-bg">
      {/* НОВАЯ КОМПАКТНАЯ ШАПКА */}
      <header className="bg-purple-700 shadow-md sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          {/* Кнопка назад (не сжимается) */}
          <div className="shrink-0">
            <BackButton onClick={onBack} variant="light" />
          </div>
          
          {/* Заголовок и описание (занимают все свободное место, текст обрезается если не влезает) */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h1 className="text-lg font-bold text-white leading-tight truncate">Таймер урока</h1>
            <p className="text-xs text-purple-200 leading-tight">Выберите шаблон занятия</p>
          </div>
          
          {/* Иконка раздела справа (не сжимается) */}
          <div className="shrink-0 w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 py-6 space-y-4 pb-28">
        {templates.map((t) => {
          const total = totalDurationSeconds(t.stages);
          return (
            <div
              key={t.id}
              className="w-full bg-white shadow-md rounded-2xl p-5 flex items-center gap-3 active:scale-[0.98] transition-transform border-l-4 border-purple-500"
            >
              <button
                onClick={() => onSelect(t)}
                className="flex items-center gap-4 flex-1 min-w-0 text-left min-h-14 touch-manipulation"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 truncate">{t.name}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {t.stages.length} этапов · {formatTime(total)}
                  </p>
                </div>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(t);
                }}
                className="p-2.5 text-gray-300 hover:text-purple-600 transition-colors shrink-0 min-h-14 min-w-14 flex items-center justify-center touch-manipulation"
                aria-label="Редактировать"
              >
                <Pencil className="w-5 h-5" />
              </button>

              {t.custom && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(t.id);
                  }}
                  className="p-2.5 text-gray-300 hover:text-red-500 transition-colors shrink-0 min-h-14 min-w-14 flex items-center justify-center touch-manipulation"
                  aria-label="Удалить"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}

              <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
            </div>
          );
        })}

        {templates.length === 0 && (
          <p className="text-center text-gray-400 py-12">Нет сохранённых шаблонов</p>
        )}

        <button
          onClick={onCreate}
          className="w-full bg-white shadow-md rounded-2xl p-5 flex items-center gap-4 text-left active:scale-[0.98] transition-transform border-2 border-dashed border-purple-300 min-h-14 touch-manipulation"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
            <Plus className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">Создать свой шаблон</h2>
            <p className="text-sm text-gray-500 mt-0.5">Настройте этапы и длительность</p>
          </div>
        </button>

      </main>
    </div>
  );
}
