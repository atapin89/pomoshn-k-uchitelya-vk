import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  RotateCcw,
  Shuffle,
} from 'lucide-react';
import type { BingoGame } from '@/types/bingo';

interface BingoProjectorScreenProps {
  game: BingoGame;
  onBack: () => void;
  onUpdate: (patch: Partial<BingoGame>) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function BingoProjectorScreen({ game, onBack, onUpdate }: BingoProjectorScreenProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showBoard, setShowBoard] = useState(false);

  const { words, callOrder, currentCallIndex } = game;
  const calledIndexes = callOrder.slice(0, currentCallIndex);
  const currentWord =
    calledIndexes.length > 0 ? words[calledIndexes[calledIndexes.length - 1]] : null;
  const calledSet = useMemo(() => new Set(calledIndexes), [callOrder, currentCallIndex]);

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // браузер может запретить без касания — не критично
    }
  };

  const next = () => {
    if (currentCallIndex < callOrder.length) {
      onUpdate({ currentCallIndex: currentCallIndex + 1 });
    }
  };

  const shuffleRemaining = () => {
    const called = callOrder.slice(0, currentCallIndex);
    const remaining = shuffle(callOrder.slice(currentCallIndex));
    onUpdate({ callOrder: [...called, ...remaining] });
  };

  const reset = () => {
    onUpdate({ currentCallIndex: 0 });
  };

  return (
    <div className="min-h-[100dvh] bg-gray-900 flex flex-col">
      <header className="bg-gray-800/90 sticky top-0 z-10 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="text-gray-300 hover:text-white p-2" aria-label="Выход">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">{game.config.name}</h1>
            <p className="text-xs text-gray-400">
              Режим ведущего · Вызвано {currentCallIndex} из {callOrder.length}
            </p>
          </div>
          <button
            onClick={() => setShowBoard(!showBoard)}
            className="p-2 text-gray-300 hover:text-white"
            aria-label="Табло слов"
          >
            {showBoard ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-300 hover:text-white"
            aria-label="Во весь экран"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
        {/* Текущее слово крупно */}
        <div className="bg-gray-800 rounded-3xl p-8 sm:p-12 flex flex-col items-center justify-center text-center min-h-[38dvh]">
          {currentWord ? (
            <>
              <p className="text-gray-400 text-sm sm:text-base mb-3">Текущее слово:</p>
              <p className="text-white font-extrabold text-4xl sm:text-7xl leading-tight break-words">
                {currentWord}
              </p>
            </>
          ) : (
            <p className="text-gray-300 text-2xl sm:text-4xl font-bold">
              Нажмите «Далее», чтобы начать
            </p>
          )}
        </div>

        {/* Управление */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={next}
            disabled={currentCallIndex >= callOrder.length}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold rounded-2xl py-5 text-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            Далее <ArrowRight className="w-6 h-6" />
          </button>
          <button
            onClick={shuffleRemaining}
            className="bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-2xl py-5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Shuffle className="w-5 h-5" /> Перемешать остаток
          </button>
          <button
            onClick={reset}
            className="bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-2xl py-5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <RotateCcw className="w-5 h-5" /> Начать заново
          </button>
        </div>

        {/* История вызова */}
        <div className="bg-gray-800 rounded-2xl p-4">
          <h3 className="text-gray-300 text-sm font-semibold mb-3">История вызова (новые сначала)</h3>
          {calledIndexes.length === 0 ? (
            <p className="text-gray-500 text-sm">Пока ничего не вызвано</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {[...calledIndexes].reverse().map((wordIdx, pos) => (
                <span
                  key={`${wordIdx}-${pos}`}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                    pos === 0 ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {words[wordIdx]}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Табло всех слов */}
        {showBoard && (
          <div className="bg-gray-800 rounded-2xl p-4">
            <h3 className="text-gray-300 text-sm font-semibold mb-3">
              Все слова (вызвано {calledSet.size} из {words.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {words.map((word, idx) => (
                <div
                  key={idx}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold text-center break-words ${
                    calledSet.has(idx) ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {word}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
