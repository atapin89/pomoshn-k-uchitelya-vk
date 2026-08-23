import { useState } from 'react';
import { X } from 'lucide-react';
import type { LessonTemplate } from '@/types';
import { formatTime } from '@/lib/format';
import YandexAdBlock from './YandexAdBlock';

interface EditTemplateModalProps {
  template: LessonTemplate;
  onClose: () => void;
  onSave: (template: LessonTemplate) => void;
}

const MIN_TOTAL = 5;
const MAX_TOTAL = 120;
const MAX_STAGE = 60;

export default function EditTemplateModal({
  template,
  onClose,
  onSave,
}: EditTemplateModalProps) {
  const [name, setName] = useState(template.name);
  const [durations, setDurations] = useState(() =>
    template.stages.map((s) => s.duration),
  );

  const totalMin = durations.reduce((a, b) => a + b, 0);

  const handleTotalChange = (newTotal: number) => {
    // Валидация
    if (newTotal < MIN_TOTAL || newTotal > MAX_TOTAL) return;
    
    setDurations((prev) => {
      if (prev.length === 0) return prev;
      
      const oldTotal = prev.reduce((a, b) => a + b, 0);
      if (oldTotal === 0) {
        const base = Math.floor(newTotal / prev.length);
        const remainder = newTotal - base * prev.length;
        return prev.map((_, i) => base + (i < remainder ? 1 : 0));
      }
      
      // Пропорциональное масштабирование
      const scaled = prev.map((d) =>
        Math.max(1, Math.round((d / oldTotal) * newTotal)),
      );
      
      // Корректировка суммы
      const diff = newTotal - scaled.reduce((a, b) => a + b, 0);
      if (diff !== 0) {
        const maxIdx = scaled.indexOf(Math.max(...scaled));
        scaled[maxIdx] = Math.max(1, scaled[maxIdx] + diff);
      }
      return scaled;
    });
  };

  const handleStageChange = (idx: number, value: number) => {
    // Валидация
    if (value < 1 || value > MAX_STAGE) return;
    
    setDurations((prev) => {
      const next = [...prev];
      const oldValue = next[idx];
      next[idx] = value;
      
      const delta = value - oldValue;
      if (delta === 0) return prev;
      
      const total = prev.reduce((a, b) => a + b, 0);
      const otherIndices = prev.map((_, i) => i).filter(i => i !== idx);
      
      if (otherIndices.length === 0) return next;
      
      // Распределяем delta пропорционально между остальными
      let remainingDelta = delta;
      const othersTotal = total - oldValue;
      
      for (let i = 0; i < otherIndices.length - 1; i++) {
        const otherIdx = otherIndices[i];
        if (othersTotal > 0) {
          const proportion = prev[otherIdx] / othersTotal;
          const change = Math.round(delta * proportion);
          next[otherIdx] = Math.max(1, prev[otherIdx] - change);
          remainingDelta -= (prev[otherIdx] - next[otherIdx]);
        } else {
          next[otherIdx] = 1;
          remainingDelta -= (prev[otherIdx] - 1);
        }
      }
      
      // Последний этап получает остаток
      const lastIdx = otherIndices[otherIndices.length - 1];
      next[lastIdx] = Math.max(1, prev[lastIdx] - remainingDelta);
      
      return next;
    });
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('Введите название урока');
      return;
    }
    
    onSave({
      ...template,
      name: name.trim(),
      stages: template.stages.map((s, i) => ({ ...s, duration: durations[i] })),
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Редактировать шаблон"
    >
      <div className="mt-auto bg-gray-50 rounded-t-3xl max-h-[92vh] flex flex-col animate-[slideUp_0.25s_ease-out]">
        <div className="flex items-center justify-between px-5 py-4 bg-white rounded-t-3xl shadow-sm">
          <h2 className="text-xl font-bold text-purple-700">Редактировать шаблон</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-gray-400 hover:text-gray-600 min-h-14 min-w-14 flex items-center justify-center touch-manipulation focus:outline-none focus:ring-2 focus:ring-purple-400 rounded-xl"
            aria-label="Закрыть"
            title="Закрыть"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              Название урока
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
              aria-label="Название урока"
            />
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">
                Общее время урока
              </label>
              <span className="text-lg font-bold text-purple-600 tabular-nums">
                {formatTime(totalMin * 60)}
              </span>
            </div>
            <input
              type="range"
              min={MIN_TOTAL}
              max={MAX_TOTAL}
              value={totalMin}
              onChange={(e) => handleTotalChange(Number(e.target.value))}
              className="w-full accent-purple-600 h-2 cursor-pointer"
              aria-label="Общее время урока"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{MIN_TOTAL} мин</span>
              <span>{MAX_TOTAL} мин</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2 px-1">
              Этапы ({template.stages.length})
            </h3>
            <div className="space-y-3">
              {template.stages.map((stage, i) => {
                const pct = totalMin > 0 ? Math.round((durations[i] / totalMin) * 100) : 0;
                return (
                  <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </span>
                        {stage.name}
                      </span>
                      <span className="text-sm font-bold text-gray-700 tabular-nums">
                        {durations[i]} мин
                        <span className="text-gray-400 font-normal ml-1.5">({pct}%)</span>
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={MAX_STAGE}
                      value={durations[i]}
                      onChange={(e) => handleStageChange(i, Number(e.target.value))}
                      className="w-full accent-purple-600 h-2 cursor-pointer"
                      aria-label={`Длительность этапа: ${stage.name}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <YandexAdBlock />
        </div>

        <div className="px-5 py-4 bg-white border-t border-gray-100 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            onClick={handleSave}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white text-lg font-semibold rounded-2xl py-4 min-h-14 active:scale-[0.98] transition-transform shadow-md touch-manipulation focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
