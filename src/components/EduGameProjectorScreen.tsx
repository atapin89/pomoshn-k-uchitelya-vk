import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  Users,
  Trophy,
  X,
  Eye,
  Trash2,
  Upload,
  Download,
  Plus,
  RotateCcw,
} from 'lucide-react';
import type { EduGame, EduPlayer, EduQuestion, EduRound } from '@/types/eduGame';
import {
  parsePlayersText,
  serializePlayersResults,
  downloadTextFile,
  sanitizeFileName,
} from '@/lib/eduGameStorage';

interface EduGameProjectorScreenProps {
  game: EduGame;
  onBack: () => void;
}

interface ActiveCell {
  round: EduRound;
  question: EduQuestion;
}

function sessionKey(gameId: string): string {
  return `edu-session-${gameId}`;
}

function loadSession(gameId: string): { used: string[]; players: EduPlayer[]; rating: boolean } {
  try {
    const raw = localStorage.getItem(sessionKey(gameId));
    if (raw) {
      const p = JSON.parse(raw);
      return {
        used: Array.isArray(p.used) ? p.used : [],
        players: Array.isArray(p.players) ? p.players : [],
        rating: Boolean(p.rating),
      };
    }
  } catch {
    // ignore
  }
  return { used: [], players: [], rating: false };
}

function clearSession(gameId: string) {
  try {
    localStorage.removeItem(sessionKey(gameId));
  } catch {
    // ignore
  }
}

export default function EduGameProjectorScreen({ game, onBack }: EduGameProjectorScreenProps) {
  const initial = useMemo(() => loadSession(game.id), [game.id]);

  const [used, setUsed] = useState<string[]>(initial.used);
  const [players, setPlayers] = useState<EduPlayer[]>(initial.players);
  const [rating, setRating] = useState(initial.rating);

  const [active, setActive] = useState<ActiveCell | null>(null);
  const [showQuestion, setShowQuestion] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  const [showPlayers, setShowPlayers] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [newPlayersText, setNewPlayersText] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const usedSet = useMemo(() => new Set(used), [used]);

  // Сохранение сессии
  useEffect(() => {
    try {
      localStorage.setItem(sessionKey(game.id), JSON.stringify({ used, players, rating }));
    } catch {
      // ignore
    }
  }, [used, players, rating, game.id]);

  // Fullscreen
  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Закрытие по Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (active) {
          closeCell();
        } else if (showPlayers) {
          setShowPlayers(false);
        } else if (showResults) {
          setShowResults(false);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, showPlayers, showResults]);

  // Блокировка прокрутки фона
  useEffect(() => {
    if (active || showPlayers || showResults) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [active, showPlayers, showResults]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // браузер может запретить без касания
    }
  };

  const openCell = (round: EduRound, question: EduQuestion) => {
    setActive({ round, question });
    setShowQuestion(false);
    setShowAnswer(false);
  };

  const closeCell = () => {
    if (active) {
      const key = `${active.round.id}:${active.question.id}`;
      if (!usedSet.has(key)) setUsed([...used, key]);
    }
    setActive(null);
    setShowQuestion(false);
    setShowAnswer(false);
  };

  const changeScore = (playerId: string, delta: number) => {
    setPlayers((ps) => ps.map((p) => (p.id === playerId ? { ...p, score: p.score + delta } : p)));
  };

  const addPlayers = (text: string) => {
    const parsed = parsePlayersText(text);
    setPlayers((ps) => {
      const existing = new Set(ps.map((p) => p.name.toLowerCase()));
      const fresh = parsed.filter((p) => !existing.has(p.name.toLowerCase()));
      return [...ps, ...fresh];
    });
    setNewPlayersText('');
  };

  const handleImportPlayers = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => addPlayers(String(reader.result || ''));
    reader.readAsText(file);
    e.target.value = '';
  };

  const removePlayer = (id: string) => setPlayers((ps) => ps.filter((p) => p.id !== id));

  const exportResults = () => {
    downloadTextFile(
      sanitizeFileName(`результаты_${game.title}.txt`),
      serializePlayersResults(players),
    );
  };

  const resetAll = () => {
    const proceed = window.confirm(
      'Начать новую игру? Все результаты и использованные вопросы будут сброшены.'
    );
    if (!proceed) return;
    setUsed([]);
    setPlayers((ps) => ps.map((p) => ({ ...p, score: 0 })));
    setShowResults(false);
    setActive(null);
  };

  const handleBack = () => {
    // Проверяем, есть ли активный прогресс
    const hasProgress = used.length > 0 || players.some((p) => p.score !== 0);
    if (hasProgress) {
      const proceed = window.confirm(
        'Выйти из проектора? Прогресс будет сохранён, но игра не будет сброшена.'
      );
      if (!proceed) return;
    }
    onBack();
  };

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-[100dvh] bg-gray-900 flex flex-col">
      {/* Шапка */}
      <header className="bg-gray-800/90 sticky top-0 z-20 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2">
          <button 
            onClick={handleBack} 
            className="text-gray-300 hover:text-white p-2 transition-colors" 
            aria-label="Выход из проектора"
            title="Выйти из проектора"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">{game.title}</h1>
            <p className="text-xs text-gray-400">
              Табло · раундов: {game.rounds.length}
              {rating && players.length > 0 && ` · участников: ${players.length}`}
            </p>
          </div>
          <button
            onClick={() => setShowPlayers(true)}
            className={`p-2 ${rating ? 'text-purple-400' : 'text-gray-300'} hover:text-white transition-colors`}
            aria-label="Участники и рейтинг"
            title="Участники и рейтинг"
          >
            <Users className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowResults(true)}
            className="p-2 text-gray-300 hover:text-white transition-colors"
            aria-label="Результаты"
            title="Результаты"
          >
            <Trophy className="w-5 h-5" />
          </button>
          <button
            onClick={resetAll}
            className="p-2 text-gray-300 hover:text-orange-400 transition-colors"
            aria-label="Новая игра"
            title="Новая игра (сбросить прогресс)"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button 
            onClick={toggleFullscreen} 
            className="p-2 text-gray-300 hover:text-white transition-colors" 
            aria-label={isFullscreen ? 'Выйти из полноэкранного режима' : 'Во весь экран'}
            title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Во весь экран'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Табло */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <div className="overflow-x-auto pb-2">
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${game.rounds.length}, minmax(150px, 1fr))`,
              minWidth: game.rounds.length * 160,
            }}
          >
            {game.rounds.map((round) => (
              <div key={round.id} className="space-y-2">
                <h3 className="text-center text-gray-100 font-bold text-sm sm:text-base bg-gray-800 rounded-xl py-2.5 px-2 truncate">
                  {round.title}
                </h3>
                {[...round.questions]
                  .sort((a, b) => a.points - b.points)
                  .map((q) => {
                    const isUsed = usedSet.has(`${round.id}:${q.id}`);
                    return (
                      <button
                        key={q.id}
                        disabled={isUsed}
                        onClick={() => openCell(round, q)}
                        className={`w-full rounded-xl py-4 sm:py-5 font-extrabold text-xl sm:text-2xl transition-all ${
                          isUsed
                            ? 'bg-gray-800 text-gray-600 line-through cursor-not-allowed'
                            : 'bg-purple-600 hover:bg-purple-500 text-white active:scale-95'
                        }`}
                        aria-label={`${round.title}: ${q.points} баллов${isUsed ? ' (отвечено)' : ''}`}
                      >
                        {q.points}
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
        <p className="text-center text-gray-500 text-sm mt-4">
          Нажмите на баллы — откроется вопрос. После обсуждения закройте клетку — она погаснет.
        </p>
      </main>

      {/* Оверлей вопроса */}
      {active && (
        <div className="fixed inset-0 z-30 bg-gray-900 flex flex-col overflow-y-auto">
          <div className="max-w-5xl mx-auto w-full px-4 py-6 flex flex-col gap-5 flex-1">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-purple-300 text-sm font-semibold">{active.round.title}</p>
                <p className="text-white font-extrabold text-3xl">{active.question.points} баллов</p>
              </div>
              <button 
                onClick={closeCell} 
                className="p-2 text-gray-300 hover:text-white transition-colors" 
                aria-label="Закрыть вопрос"
                title="Закрыть вопрос"
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            <div className="bg-gray-800 rounded-3xl p-8 sm:p-10 flex items-center justify-center text-center min-h-[30dvh]">
              {showQuestion ? (
                <p className="text-white font-bold text-2xl sm:text-4xl leading-snug break-words">
                  {active.question.text}
                </p>
              ) : (
                <p className="text-gray-400 text-xl sm:text-2xl font-semibold">
                  Нажмите «Показать вопрос»
                </p>
              )}
            </div>

            {showQuestion && showAnswer && active.question.answer.trim() && (
              <div className="bg-green-900/60 border-2 border-green-600 rounded-3xl p-6 text-center animate-fadeIn">
                <p className="text-green-300 text-sm mb-1">Ответ:</p>
                <p className="text-white font-bold text-xl sm:text-3xl break-words">
                  {active.question.answer}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {!showQuestion ? (
                <button
                  onClick={() => setShowQuestion(true)}
                  className="col-span-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl py-5 text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <Eye className="w-6 h-6" /> Показать вопрос
                </button>
              ) : (
                <>
                  {active.question.answer.trim() && !showAnswer && (
                    <button
                      onClick={() => setShowAnswer(true)}
                      className="bg-green-700 hover:bg-green-600 text-white font-bold rounded-2xl py-5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    >
                      <Eye className="w-5 h-5" /> Показать ответ
                    </button>
                  )}
                  <button
                    onClick={closeCell}
                    className={`${active.question.answer.trim() && !showAnswer ? '' : 'col-span-2'} bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-2xl py-5 flex items-center justify-center gap-2 active:scale-95 transition-transform`}
                  >
                    Закрыть клетку
                  </button>
                </>
              )}
            </div>

            {/* Начисление баллов */}
            {rating && players.length > 0 && (
              <div className="bg-gray-800 rounded-2xl p-4">
                <h4 className="text-gray-300 text-sm font-semibold mb-3">
                  Начислить баллы (вопрос стоит {active.question.points})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[40dvh] overflow-y-auto">
                  {players.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 bg-gray-700 rounded-xl px-3 py-2">
                      <span className="flex-1 min-w-0 text-white text-sm font-semibold truncate">
                        {p.name}
                      </span>
                      <span className="text-purple-300 text-sm font-bold w-14 text-right">{p.score}</span>
                      <button
                        onClick={() => changeScore(p.id, -active.question.points)}
                        className="w-9 h-9 rounded-lg bg-red-600/80 hover:bg-red-600 text-white font-bold text-lg shrink-0 transition-colors"
                        aria-label={`Снять баллы у ${p.name}`}
                        title={`Снять баллы у ${p.name}`}
                      >
                        −
                      </button>
                      <button
                        onClick={() => changeScore(p.id, active.question.points)}
                        className="w-9 h-9 rounded-lg bg-green-600/80 hover:bg-green-600 text-white font-bold text-lg shrink-0 transition-colors"
                        aria-label={`Начислить баллы ${p.name}`}
                        title={`Начислить баллы ${p.name}`}
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Панель участников */}
      {showPlayers && (
        <div
          className="fixed inset-0 z-30 bg-black/60 flex items-end sm:items-center justify-center animate-fadeIn"
          onClick={() => setShowPlayers(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Участники и рейтинг"
        >
          <div
            className="bg-gray-800 w-full max-w-md max-h-[85dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-white font-bold text-lg">Участники и рейтинг</h3>
              <button 
                onClick={() => setShowPlayers(false)} 
                className="p-2 text-gray-300 hover:text-white transition-colors" 
                aria-label="Закрыть"
                title="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Переключатель рейтинга */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-gray-200">Индивидуальный рейтинг</span>
              <button
                onClick={() => setRating(!rating)}
                className={`relative shrink-0 w-12 h-7 rounded-full transition-colors duration-200 ${
                  rating ? 'bg-purple-600' : 'bg-gray-600'
                }`}
                aria-label={rating ? 'Выключить рейтинг' : 'Включить рейтинг'}
                role="switch"
                aria-checked={rating}
              >
                <span
                  className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                    rating ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Добавление участников */}
            <textarea
              value={newPlayersText}
              onChange={(e) => setNewPlayersText(e.target.value)}
              placeholder={'Имена участников, каждое с новой строки:\nАня\nИван'}
              className="w-full min-h-[90px] rounded-xl border border-gray-600 bg-gray-700 p-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-y"
              aria-label="Имена участников"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => addPlayers(newPlayersText)}
                disabled={!newPlayersText.trim()}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-1.5 text-sm active:scale-95 transition-transform"
              >
                <Plus className="w-4 h-4" /> Добавить
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold rounded-xl py-3 flex items-center justify-center gap-1.5 text-sm active:scale-95 transition-transform"
              >
                <Upload className="w-4 h-4" /> Импорт .txt
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={handleImportPlayers}
              aria-label="Импорт участников из файла"
            />

            {/* Список участников */}
            {players.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-2">Пока нет участников</p>
            ) : (
              <div className="space-y-2">
                {players.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 bg-gray-700 rounded-xl px-3 py-2">
                    <span className="flex-1 min-w-0 text-white text-sm font-semibold truncate">{p.name}</span>
                    <span className="text-purple-300 text-sm font-bold">{p.score}</span>
                    <button
                      onClick={() => removePlayer(p.id)}
                      className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                      aria-label={`Удалить участника ${p.name}`}
                      title={`Удалить ${p.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {players.length > 0 && (
              <button
                onClick={exportResults}
                className="w-full bg-green-700 hover:bg-green-600 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 text-sm active:scale-95 transition-transform"
              >
                <Download className="w-4 h-4" /> Экспорт результатов (.txt)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Результаты */}
      {showResults && (
        <div
          className="fixed inset-0 z-30 bg-black/60 flex items-end sm:items-center justify-center animate-fadeIn"
          onClick={() => setShowResults(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Результаты"
        >
          <div
            className="bg-gray-800 w-full max-w-md max-h-[85dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" /> Результаты
              </h3>
              <button 
                onClick={() => setShowResults(false)} 
                className="p-2 text-gray-300 hover:text-white transition-colors" 
                aria-label="Закрыть"
                title="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {sortedPlayers.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                Нет участников. Добавьте их через иконку «Люди».
              </p>
            ) : (
              <div className="space-y-2">
                {sortedPlayers.map((p, i) => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                      i === 0 ? 'bg-yellow-500/20 border-2 border-yellow-500' : 'bg-gray-700'
                    }`}
                  >
                    <span className={`font-extrabold w-6 ${i === 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                      {i + 1}
                    </span>
                    <span className="flex-1 min-w-0 text-white font-semibold truncate">{p.name}</span>
                    <span className="text-purple-300 font-bold">{p.score}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={exportResults}
                disabled={players.length === 0}
                className="bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-1.5 text-sm active:scale-95 transition-transform"
              >
                <Download className="w-4 h-4" /> Экспорт
              </button>
              <button
                onClick={resetAll}
                className="bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-1.5 text-sm active:scale-95 transition-transform"
              >
                <RotateCcw className="w-4 h-4" /> Новая игра
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
