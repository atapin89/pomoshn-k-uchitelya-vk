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
    <div className="min-h-[100dvh] notebook-bg flex flex-col">
      {/* 🆕 ЕДИНАЯ ШАПКА: кнопка → название → иконка в одну линию */}
      <header className="bg-purple-700 shadow-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Шаблоны уроков</h1>
          </div>
          <BookOpen className="w-6 h-6 text-white/70 shrink-0" />
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 space-y-3 pb-8">
        {templates.map((t) => {
          const total = totalDurationSeconds(t.stages);
          return (
            <div
              key={t.id}
              className="w-full bg-white shadow-md rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform border-l-4 border-purple-500"
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
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-purple-200 mx-auto mb-4" />
            <p className="text-gray-400">Нет сохранённых шаблонов</p>
            <p className="text-sm text-gray-400 mt-1">Создайте свой первый шаблон ниже</p>
          </div>
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
