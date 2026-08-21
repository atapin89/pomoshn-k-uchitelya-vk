import { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  Check,
  Layers,
  Pencil,
} from 'lucide-react';
import type { EduGame, EduQuestion, EduRound } from '@/types/eduGame';
import { generateEduId, gameQuestionsCount } from '@/types/eduGame';
import BackButton from './BackButton';

interface EduGameEditorScreenProps {
  game: EduGame;
  onBack: () => void;
  onSave: (game: EduGame) => void;
}

export default function EduGameEditorScreen({ game, onBack, onSave }: EduGameEditorScreenProps) {
  const [draft, setDraft] = useState<EduGame>(game);
  const [openRound, setOpenRound] = useState<string | null>(game.rounds[0]?.id ?? null);
  const [savedFlag, setSavedFlag] = useState(false);

  // Автосохранение с небольшой задержкой
  useEffect(() => {
    const t = setTimeout(() => onSave(draft), 600);
    return () => clearTimeout(t);
  }, [draft, onSave]);

  const handleManualSave = () => {
    onSave(draft);
    setSavedFlag(true);
    setTimeout(() => setSavedFlag(false), 2000);
  };

  const patchRound = (roundId: string, p: Partial<EduRound>) =>
    setDraft((d) => ({
      ...d,
      rounds: d.rounds.map((r) => (r.id === roundId ? { ...r, ...p } : r)),
    }));

  const addRound = () => {
    const round: EduRound = {
      id: generateEduId('round'),
      title: `Раунд ${draft.rounds.length + 1}`,
      questions: [],
    };
    setDraft((d) => ({ ...d, rounds: [...d.rounds, round] }));
    setOpenRound(round.id);
  };

  const removeRound = (roundId: string) =>
    setDraft((d) => ({ ...d, rounds: d.rounds.filter((r) => r.id !== roundId) }));

  const addQuestion = (roundId: string) =>
    setDraft((d) => ({
      ...d,
      rounds: d.rounds.map((r) =>
        r.id === roundId
          ? {
              ...r,
              questions: [
                ...r.questions,
                { id: generateEduId('q'), text: '', answer: '', points: 10 },
              ],
            }
          : r,
      ),
    }));

  const patchQuestion = (roundId: string, qId: string, p: Partial<EduQuestion>) =>
    setDraft((d) => ({
      ...d,
      rounds: d.rounds.map((r) =>
        r.id === roundId
          ? {
              ...r,
              questions: r.questions.map((q) => (q.id === qId ? { ...q, ...p } : q)),
            }
          : r,
      ),
    }));

  const removeQuestion = (roundId: string, qId: string) =>
    setDraft((d) => ({
      ...d,
      rounds: d.rounds.map((r) =>
        r.id === roundId
          ? { ...r, questions: r.questions.filter((q) => q.id !== qId) }
          : r,
      ),
    }));

  return (
    <div className="min-h-[100dvh] notebook-bg flex flex-col">
      <header className="bg-purple-700 shadow-md sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <div className="shrink-0">
            <BackButton onClick={onBack} variant="light" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h1 className="text-lg font-bold text-white leading-tight truncate">Режим разработчика</h1>
            <p className="text-xs text-purple-200 leading-tight">
              Раундов: {draft.rounds.length} · вопросов: {gameQuestionsCount(draft)}
            </p>
          </div>
          <button
            onClick={handleManualSave}
            className="shrink-0 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-3 py-2 text-white text-sm font-semibold flex items-center gap-1.5 transition-colors"
          >
            {savedFlag ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {savedFlag ? 'Готово' : 'Сохранить'}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-5 py-5 space-y-4 pb-10">
        {/* Подсказка */}
        <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 text-sm text-purple-800 leading-relaxed">
          <p className="font-bold mb-1 flex items-center gap-2">
            <Pencil className="w-4 h-4" /> Как составить игру
          </p>
          <p>
            Введите название игры, добавьте раунды (темы), а в каждом раунде — вопросы с баллами
            и ответами. Изменения сохраняются автоматически. Баллы рекомендуется повышать от
            вопроса к вопросу внутри раунда: 10 → 50.
          </p>
        </div>

        {/* Название игры */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <label className="text-sm font-semibold text-purple-700 block mb-2">Название игры</label>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="Например: История России, 7 класс"
            className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:outline-none"
          />
        </div>

        {/* Раунды */}
        {draft.rounds.map((r, rIdx) => (
          <div key={r.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setOpenRound(openRound === r.id ? null : r.id)}
              className="w-full px-4 py-3 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Layers className="w-5 h-5 text-purple-600 shrink-0" />
                <span className="font-bold text-purple-700 truncate">
                  {r.title || `Раунд ${rIdx + 1}`}
                </span>
                <span className="text-xs font-bold text-purple-400 shrink-0">
                  {r.questions.length}
                </span>
              </div>
              {openRound === r.id ? (
                <ChevronUp className="w-5 h-5 text-purple-600 shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-purple-600 shrink-0" />
              )}
            </button>

            {openRound === r.id && (
              <div className="px-4 pb-4 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={r.title}
                    onChange={(e) => patchRound(r.id, { title: e.target.value })}
                    placeholder="Название раунда (тема)"
                    className="flex-1 min-w-0 rounded-xl border border-purple-200 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
                  />
                  <button
                    onClick={() => removeRound(r.id)}
                    disabled={draft.rounds.length <= 1}
                    className="shrink-0 p-2.5 text-gray-300 hover:text-red-500 disabled:opacity-40 transition-colors"
                    aria-label="Удалить раунд"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {r.questions.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-2">
                    В раунде пока нет вопросов
                  </p>
                )}

                {r.questions.map((q, qIdx) => (
                  <div key={q.id} className="border-2 border-purple-100 rounded-xl p-3 space-y-2 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-purple-500">В{qIdx + 1}</span>
                      <label className="text-xs font-semibold text-purple-700 shrink-0">Баллы</label>
                      <input
                        type="number"
                        min={5}
                        max={200}
                        step={5}
                        value={q.points}
                        onChange={(e) =>
                          patchQuestion(r.id, q.id, {
                            points: Math.max(5, Math.min(200, Number(e.target.value) || 10)),
                          })
                        }
                        className="w-20 rounded-lg border border-purple-200 px-2 py-1.5 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
                      />
                      <button
                        onClick={() => removeQuestion(r.id, q.id)}
                        className="ml-auto p-2 text-gray-300 hover:text-red-500 transition-colors"
                        aria-label="Удалить вопрос"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      value={q.text}
                      onChange={(e) => patchQuestion(r.id, q.id, { text: e.target.value })}
                      placeholder="Текст вопроса…"
                      className="w-full min-h-[64px] rounded-lg border border-purple-200 p-2 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none resize-y"
                    />
                    <input
                      type="text"
                      value={q.answer}
                      onChange={(e) => patchQuestion(r.id, q.id, { answer: e.target.value })}
                      placeholder="Ответ (для ведущего, необязательно)"
                      className="w-full rounded-lg border border-purple-200 px-2 py-1.5 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
                    />
                  </div>
                ))}

                <button
                  onClick={() => addQuestion(r.id)}
                  className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold rounded-xl py-3 flex items-center justify-center gap-2 text-sm active:scale-95 transition-transform"
                >
                  <Plus className="w-4 h-4" /> Добавить вопрос
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Добавить раунд */}
        <button
          onClick={addRound}
          className="w-full bg-white border-2 border-dashed border-purple-300 rounded-2xl py-4 flex items-center justify-center gap-2 text-purple-600 font-semibold active:scale-95 transition-transform min-h-14"
        >
          <Plus className="w-5 h-5" /> Добавить раунд
        </button>
      </main>
    </div>
  );
}
