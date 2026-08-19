import { useEffect, useState } from 'react';
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
import type { Deck } from '@/types';

interface FlashcardsProjectorScreenProps {
  deck: Deck;
  onBack: () => void;
}

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FlashcardsProjectorScreen({ deck, onBack }: FlashcardsProjectorScreenProps) {
  const [order, setOrder] = useState<number[]>(() => deck.cards.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const card = deck.cards[order[pos]];

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
      // браузер может запретить без касания
    }
  };

  const next = () => {
    if (pos < order.length - 1) {
      setPos(pos + 1);
      setShowAnswer(false);
    }
  };

  const prev = () => {
    if (pos > 0) {
      setPos(pos - 1);
      setShowAnswer(false);
    }
  };

  const toggleShuffle = () => {
    if (isShuffled) {
      setOrder(deck.cards.map((_, i) => i));
    } else {
      setOrder(shuffleArr(deck.cards.map((_, i) => i)));
    }
    setIsShuffled(!isShuffled);
    setPos(0);
    setShowAnswer(false);
  };

  const restart = () => {
    setPos(0);
    setShowAnswer(false);
  };

  return (
    <div className="min-h-[100dvh] bg-gray-900 flex flex-col">
      <header className="bg-gray-800/90 sticky top-0 z-10 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="text-gray-300 hover:text-white p-2" aria-label="Выход">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">{deck.title}</h1>
            <p className="text-xs text-gray-400">
              Проектор · Карточка {pos + 1} из {order.length}
            </p>
          </div>
          <button
            onClick={toggleShuffle}
            className={`p-2 hover:text-white ${isShuffled ? 'text-purple-400' : 'text-gray-300'}`}
            aria-label="Перемешать"
          >
            <Shuffle className="w-5 h-5" />
          </button>
          <button onClick={restart} className="p-2 text-gray-300 hover:text-white" aria-label="Сначала">
            <RotateCcw className="w-5 h-5" />
          </button>
          <button onClick={toggleFullscreen} className="p-2 text-gray-300 hover:text-white" aria-label="Во весь экран">
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
        {/* Вопрос крупно */}
        <div className="bg-gray-800 rounded-3xl p-8 sm:p-12 flex flex-col items-center justify-center text-center min-h-[45dvh]">
          <p className="text-gray-400 text-sm sm:text-base mb-3">Вопрос:</p>
          <p className="text-white font-extrabold text-3xl sm:text-6xl leading-tight break-words">
            {card?.sides[0] || '...'}
          </p>
        </div>

        {/* Ответ */}
        {showAnswer && (
          <div className="bg-green-900/60 border-2 border-green-600 rounded-3xl p-6 sm:p-8 text-center">
            <p className="text-green-300 text-sm sm:text-base mb-2">Ответ:</p>
            <p className="text-white font-bold text-2xl sm:text-5xl leading-tight break-words">
              {card?.sides[1] || '...'}
            </p>
            {card && card.sides.length > 2 && (
              <div className="mt-4 space-y-2">
                {card.sides.slice(2).map((side, idx) => (
                  <p key={idx} className="text-green-200 text-base sm:text-xl">{side}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Управление */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={prev}
            disabled={pos === 0}
            className="bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white font-semibold rounded-2xl py-5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-6 h-6" /> Назад
          </button>
          <button
            onClick={() => setShowAnswer(!showAnswer)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl py-5 text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            {showAnswer ? (
              <>
                <EyeOff className="w-6 h-6" /> Скрыть
              </>
            ) : (
              <>
                <Eye className="w-6 h-6" /> Показать ответ
              </>
            )}
          </button>
          <button
            onClick={next}
            disabled={pos === order.length - 1}
            className="bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white font-semibold rounded-2xl py-5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            Далее <ArrowRight className="w-6 h-6" />
          </button>
        </div>

        <p className="text-center text-gray-500 text-sm">
          Показывайте вопрос классу, собирайте ответы, затем открывайте ответ для проверки.
        </p>
      </main>
    </div>
  );
}
