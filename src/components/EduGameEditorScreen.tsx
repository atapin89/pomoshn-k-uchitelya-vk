import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  AlertTriangle,
  Check,
} from 'lucide-react';
import type { EduGame, EduRound, EduQuestion } from '@/types/eduGame';
import { generateEduId, DEFAULT_POINTS, gameQuestionsCount } from '@/types/eduGame';

interface EduGameEditorScreenProps {
  game: EduGame;
  onBack: () => void;
  onSave: (game: EduGame) => void;
}

export default function EduGameEditorScreen({ game, onBack, onSave }: EduGameEditorScreenProps) {
  const [title, setTitle] = useState(game.title);
  const [rounds, setRounds] = useState<EduRound[]>(game.rounds);
  const [saveMsg, setSaveMsg] = useState<'saved' | 'error' | null>(null);
  const [expandedRound, setExpandedRound] = useState<string | null>(rounds[0]?.id || null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  // Автосохранение при изменении
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSave();
    }, 2000); // Задержка 2 секунды после последнего изменения

    return () => clearTimeout(timer);
  }, [title, rounds]);

  const handleSave = () => {
    try {
      const updatedGame: EduGame = {
        ...game,
        title: title.trim() || 'Новая игра',
        rounds,
        updatedAt: Date.now(),
      };
      onSave(updatedGame);
      setSaveMsg('saved');
      setTimeout(() => setSaveMsg(null), 2000);
    } catch {
      setSaveMsg('error');
      setTimeout(() => setSaveMsg(null), 2000);
    }
  };

  // ===== Раунды =====

  const addRound = () => {
    const newRound: EduRound = {
      id: generateEduId('round'),
      title: `Раунд ${rounds.length + 1}`,
      questions: [],
    };
    setRounds([...rounds, newRound]);
    setExpandedRound(newRound.id);
  };

  const updateRoundTitle = (roundId: string, newTitle: string) => {
    setRounds(rounds.map((r) => (r.id === roundId ? { ...r, title: newTitle } : r)));
  };

  const deleteRound = (roundId: string) => {
    if (rounds.length <= 1) {
      alert('Нельзя удалить последний раунд');
      return;
    }
    const proceed = window.confirm('Удалить раунд со всеми вопросами?');
    if (!proceed) return;
    setRounds(rounds.filter((r) => r.id !== roundId));
  };

  const moveRound = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= rounds.length) return;
    const newRounds = [...rounds];
    [newRounds[index], newRounds[newIndex]] = [newRounds[newIndex], newRounds[index]];
    setRounds(newRounds);
  };

  // ===== Вопросы =====

  const addQuestion = (roundId: string) => {
    const round = rounds.find((r) => r.id === roundId);
    if (!round) return;
    
    // Определяем следующий балл
    const existingPoints = round.questions.map((q) => q.points);
    const nextPoint = DEFAULT_POINTS.find((p) => !existingPoints.includes(p)) || 
      (existingPoints.length > 0 ? Math.max(...existingPoints) + 10 : DEFAULT_POINTS[0]);
    
    const newQuestion: EduQuestion = {
      id: generateEduId('q'),
      text: '',
      answer: '',
      points: nextPoint,
    };
    
    setRounds(
      rounds.map((r) =>
        r.id === roundId ? { ...r, questions: [...r.questions, newQuestion] } : r
      )
    );
    setExpandedQuestion(newQuestion.id);
  };

  const updateQuestion = (
    roundId: string,
    questionId: string,
    field: 'text' | 'answer' | 'points',
    value: string | number
  ) => {
    setRounds(
      rounds.map((r) =>
        r.id === roundId
          ? {
              ...r,
              questions: r.questions.map((q) =>
                q.id === questionId ? { ...q, [field]: value } : q
              ),
            }
          : r
      )
    );
  };

  const deleteQuestion = (roundId: string, questionId: string) => {
    const proceed = window.confirm('Удалить вопрос?');
    if (!proceed) return;
    setRounds(
      rounds.map((r) =>
        r.id === roundId
          ? { ...r, questions: r.questions.filter((q) => q.id !== questionId) }
          : r
      )
    );
  };

  const moveQuestion = (roundId: string, questionId: string, direction: 'up' | 'down') => {
    const round = rounds.find((r) => r.id === roundId);
    if (!round) return;
    
    const index = round.questions.findIndex((q) => q.id === questionId);
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= round.questions.length) return;
    
    const newQuestions = [...round.questions];
    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
    
    setRounds(
      rounds.map((r) => (r.id === roundId ? { ...r, questions: newQuestions } : r))
    );
  };

  const duplicateQuestion = (roundId: string, questionId: string) => {
    const round = rounds.find((r) => r.id === roundId);
    if (!round) return;
    
    const question = round.questions.find((q) => q.id === questionId);
    if (!question) return;
    
    const duplicate: EduQuestion = {
      ...question,
      id: generateEduId('q'),
      points: question.points + 10,
    };
    
    setRounds(
      rounds.map((r) =>
        r.id === roundId ? { ...r, questions: [...r.questions, duplicate] } : r
      )
    );
  };

  // ===== Валидация =====

  const validateGame = (): string[] => {
    const errors: string[] = [];
    
    if (!title.trim()) {
      errors.push('Название игры не может быть пустым');
    }
    
    rounds.forEach((round, roundIndex) => {
      if (!round.title.trim()) {
        errors.push(`Раунд ${roundIndex + 1}: название не может быть пустым`);
      }
      
      if (round.questions.length === 0) {
        errors.push(`Раунд «${round.title || roundIndex + 1}»: добавьте хотя бы один вопрос`);
      }
      
      round.questions.forEach((question, questionIndex) => {
        if (!question.text.trim()) {
          errors.push(`Раунд «${round.title || roundIndex + 1}», вопрос ${questionIndex + 1}: текст пустой`);
        }
        
        if (!question.answer.trim()) {
          errors.push(`Раунд «${round.title || roundIndex + 1}», вопрос ${questionIndex + 1}: ответ пустой`);
        }
        
        if (question.points <= 0) {
          errors.push(`Раунд «${round.title || roundIndex + 1}», вопрос ${questionIndex + 1}: баллы должны быть > 0`);
        }
      });
      
      // Проверка дубликатов баллов
      const points = round.questions.map((q) => q.points);
      if (new Set(points).size !== points.length) {
        errors.push(`Раунд «${round.title || roundIndex + 1}»: есть дубликаты баллов`);
      }
    });
    
    return errors;
  };

  const handleBack = () => {
    const errors = validateGame();
    
    if (errors.length > 0) {
      const proceed = window.confirm(
        `Есть проблемы:\n\n${errors.slice(0, 5).join('\n')}\n\nВыйти без исправления?`
      );
      if (!proceed) return;
    }
    
    onBack();
  };

  const totalQuestions = gameQuestionsCount({ ...game, rounds });

  return (
    <div className="min-h-[100dvh] bg-purple-50 flex flex-col">
      {/* Шапка */}
      <header className="bg-purple-700 shadow-md sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={handleBack}
            className="text-white hover:text-purple-200 p-2 transition-colors"
            aria-label="Назад"
            title="Назад"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Редактор игры</h1>
            <p className="text-xs text-purple-200">
              раундов: {rounds.length} · вопросов: {totalQuestions}
            </p>
          </div>
          {saveMsg === 'saved' && (
            <span className="text-green-300 text-sm font-semibold flex items-center gap-1">
              <Check className="w-4 h-4" /> Сохранено
            </span>
          )}
          {saveMsg === 'error' && (
            <span className="text-red-300 text-sm font-semibold flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> Ошибка
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-5 py-5 space-y-4 pb-10">
        {/* Название игры */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Название игры
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Введите название игры"
            className="w-full rounded-xl border-2 border-purple-200 bg-purple-50 p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
          />
        </div>

        {/* Раунды */}
        {rounds.map((round, roundIndex) => (
          <div key={round.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Заголовок раунда */}
            <div className="p-4 border-b border-purple-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExpandedRound(expandedRound === round.id ? null : round.id)}
                  className="flex-1 min-w-0 flex items-center gap-2"
                  aria-expanded={expandedRound === round.id}
                >
                  {expandedRound === round.id ? (
                    <ChevronUp className="w-5 h-5 text-purple-600 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-purple-600 shrink-0" />
                  )}
                  <input
                    type="text"
                    value={round.title}
                    onChange={(e) => updateRoundTitle(round.id, e.target.value)}
                    placeholder={`Раунд ${roundIndex + 1}`}
                    className="flex-1 min-w-0 font-semibold text-gray-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-400 rounded px-1"
                    onClick={(e) => e.stopPropagation()}
                  />
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveRound(roundIndex, 'up')}
                    disabled={roundIndex === 0}
                    className="p-1.5 text-gray-400 hover:text-purple-600 disabled:opacity-30 transition-colors"
                    aria-label="Переместить вверх"
                    title="Переместить вверх"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveRound(roundIndex, 'down')}
                    disabled={roundIndex === rounds.length - 1}
                    className="p-1.5 text-gray-400 hover:text-purple-600 disabled:opacity-30 transition-colors"
                    aria-label="Переместить вниз"
                    title="Переместить вниз"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteRound(round.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Удалить раунд"
                    title="Удалить раунд"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1 ml-7">
                вопросов: {round.questions.length}
              </p>
            </div>

            {/* Вопросы раунда */}
            {expandedRound === round.id && (
              <div className="p-4 space-y-3">
                {round.questions.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    Нет вопросов. Добавьте первый вопрос.
                  </p>
                ) : (
                  round.questions.map((question, questionIndex) => (
                    <div
                      key={question.id}
                      className="border-2 border-purple-100 rounded-xl overflow-hidden"
                    >
                      <div className="p-3 bg-purple-50/50">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setExpandedQuestion(
                                expandedQuestion === question.id ? null : question.id
                              )
                            }
                            className="flex-1 min-w-0 flex items-center gap-2"
                            aria-expanded={expandedQuestion === question.id}
                          >
                            {expandedQuestion === question.id ? (
                              <ChevronUp className="w-4 h-4 text-purple-600 shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-purple-600 shrink-0" />
                            )}
                            <span className="font-semibold text-sm text-gray-700 truncate">
                              {question.text || `Вопрос ${questionIndex + 1}`}
                            </span>
                          </button>
                          <span className="text-sm font-bold text-purple-600 shrink-0">
                            {question.points} б.
                          </span>
                          <button
                            onClick={() => moveQuestion(round.id, question.id, 'up')}
                            disabled={questionIndex === 0}
                            className="p-1 text-gray-400 hover:text-purple-600 disabled:opacity-30 transition-colors"
                            aria-label="Вопрос вверх"
                            title="Вопрос вверх"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveQuestion(round.id, question.id, 'down')}
                            disabled={questionIndex === round.questions.length - 1}
                            className="p-1 text-gray-400 hover:text-purple-600 disabled:opacity-30 transition-colors"
                            aria-label="Вопрос вниз"
                            title="Вопрос вниз"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteQuestion(round.id, question.id)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            aria-label="Удалить вопрос"
                            title="Удалить вопрос"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {expandedQuestion === question.id && (
                        <div className="p-3 space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                              Текст вопроса
                            </label>
                            <textarea
                              value={question.text}
                              onChange={(e) =>
                                updateQuestion(round.id, question.id, 'text', e.target.value)
                              }
                              placeholder="Введите текст вопроса"
                              className="w-full rounded-lg border-2 border-purple-200 p-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-y min-h-[60px]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                              Ответ
                            </label>
                            <textarea
                              value={question.answer}
                              onChange={(e) =>
                                updateQuestion(round.id, question.id, 'answer', e.target.value)
                              }
                              placeholder="Введите ответ"
                              className="w-full rounded-lg border-2 border-purple-200 p-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-y min-h-[50px]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                              Баллы
                            </label>
                            <select
                              value={question.points}
                              onChange={(e) =>
                                updateQuestion(round.id, question.id, 'points', Number(e.target.value))
                              }
                              className="w-full rounded-lg border-2 border-purple-200 p-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                            >
                              {DEFAULT_POINTS.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                              <option value={question.points}>{question.points}</option>
                            </select>
                          </div>
                          <button
                            onClick={() => duplicateQuestion(round.id, question.id)}
                            className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold rounded-lg py-2 text-sm transition-colors"
                          >
                            Дублировать вопрос
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}

                <button
                  onClick={() => addQuestion(round.id)}
                  className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus className="w-5 h-5" /> Добавить вопрос
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Добавить раунд */}
        <button
          onClick={addRound}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" /> Добавить раунд
        </button>

        {/* Сохранить */}
        <button
          onClick={handleSave}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl py-4 flex items-center justify-center gap-2 transition-colors"
        >
          <Save className="w-5 h-5" /> Сохранить игру
        </button>
      </main>
    </div>
  );
}
