import { useState, useEffect } from 'react';
import { X, RotateCw, Check, RotateCcw } from 'lucide-react';
import type { Deck } from '@/types';
import { loadDecks, saveDecks } from '@/lib/storage';
import { triggerHaptic } from '@/lib/haptic';
import BackButton from './BackButton';

interface StudyScreenProps {
  deckId: string;
  onBack: () => void;
}

export default function StudyScreen({ deckId, onBack }: StudyScreenProps) {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isReverse, setIsReverse] = useState(false);
  const [sessionCards, setSessionCards] = useState<any[]>([]);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [stats, setStats] = useState({ learned: 0, mistakes: 0 });

  useEffect(() => {
    let deckToStudy: Deck | null = null;
    
    if (deckId === 'mistakes-temp') {
      const tempData = localStorage.getItem('temp_study_deck');
      if (tempData) deckToStudy = JSON.parse(tempData);
    } else {
      const allDecks = loadDecks();
      deckToStudy = allDecks.find((d) => d.id === deckId) || null;
    }

    if (deckToStudy) {
      setDeck(deckToStudy);
      let cards = deckToStudy.cards;
      if (deckId !== 'mistakes-temp') {
        cards = cards.filter((c) => c.status !== 'learned');
      }
      const shuffled = [...cards].sort(() => Math.random() - 0.5);
      setSessionCards(shuffled);
    }
  }, [deckId]);

  const handleEvaluate = (knows: boolean) => {
    if (!deck || sessionCards.length === 0) return;
    const currentCard = sessionCards[currentIndex];
    
    const updatedDecks = loadDecks().map((d) => {
      if (d.id !== deck.id) return d;
      return {
        ...d,
        cards: d.cards.map((card) => {
          if (card.id === currentCard.id) {
            return {
              ...card,
              status: knows ? 'learned' as const : 'mistake' as const,
              lastReviewed: Date.now(),
              errorCount: knows ? 0 : (card.errorCount || 0) + 1,
            };
          }
          return card;
        }),
        lastStudied: Date.now(),
      };
    });

    saveDecks(updatedDecks);
    setDeck(updatedDecks.find((d) => d.id === deck.id) || null);
    triggerHaptic(knows ? 'heavy' : 'medium');

    if (knows) setStats(s => ({ ...s, learned: s.learned + 1 }));
    else setStats(s => ({ ...s, mistakes: s.mistakes + 1 }));

    if (currentIndex < sessionCards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    } else {
      setSessionComplete(true);
    }
  };

  if (!deck) {
    return (
      <div className="min-h-[100dvh] bg-purple-50 flex flex-col items-center justify-center p-6">
        <p className="text-purple-700 text-lg font-semibold mb-4">Колода не найдена</p>
        <button onClick={onBack} className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold">Назад</button>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="min-h-[100dvh] bg-purple-50 flex flex-col">
        <header className="bg-purple-700 shadow-md sticky top-0 z-10">
          <div className="max-w-md mx-auto px-5 py-4"><BackButton onClick={onBack} variant="light" /></div>
        </header>
        <main className="flex-1 max-w-md mx-auto w-full px-5 py-6 flex flex-col items-center justify-center text-center">
          <div className="bg-white rounded-3xl p-8 shadow-xl w-full">
            <h2 className="text-3xl font-bold text-purple-700 mb-2">Сессия завершена! 🎉</h2>
            <p className="text-gray-600 mb-6">{deck.title}</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 rounded-2xl p-4">
                <div className="text-3xl font-bold text-green-600">{stats.learned}</div>
                <div className="text-sm text-green-700">Выучено</div>
              </div>
              <div className="bg-orange-50 rounded-2xl p-4">
                <div className="text-3xl font-bold text-orange-600">{stats.mistakes}</div>
                <div className="text-sm text-orange-700">На повторение</div>
              </div>
            </div>
            <button onClick={onBack} className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold text-lg">Вернуться к колодам</button>
          </div>
        </main>
      </div>
    );
  }

  if (sessionCards.length === 0) {
    return (
      <div className="min-h-[100dvh] bg-purple-50 flex flex-col items-center justify-center p-6">
        <p className="text-purple-700 text-lg font-semibold mb-4">Все карточки изучены! 🎉</p>
        <button onClick={onBack} className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold">Назад</button>
      </div>
    );
  }

  const currentCard = sessionCards[currentIndex];
  const progress = ((currentIndex) / sessionCards.length) * 100;
  const questionSide = isReverse ? currentCard.sides[currentCard.sides.length - 1] : currentCard.sides[0];
  const answerSide = isReverse ? currentCard.sides[0] : currentCard.sides[1];
  const extraSides = currentCard.sides.slice(2);

  return (
    <div className="min-h-[100dvh] bg-purple-50 flex flex-col">
      <header className="bg-purple-700 shadow-md sticky top-0 z-10">
        <div className="max-w-md mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <BackButton onClick={onBack} variant="light" />
            <button
              onClick={() => { setIsReverse(!isReverse); setIsFlipped(false); triggerHaptic('light'); }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${isReverse ? 'bg-orange-500 text-white' : 'bg-white/20 text-white'}`}
            >
              <RotateCcw className="w-3 h-3" /> Обратный
            </button>
          </div>
          <div className="flex items-center justify-between mt-3">
            <h1 className="text-lg font-bold text-white truncate">{deck.title}</h1>
            <span className="text-white/80 text-sm font-semibold">{currentIndex + 1} / {sessionCards.length}</span>
          </div>
          <div className="w-full h-1.5 bg-white/20 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-5 py-6 flex flex-col items-center justify-center gap-6">
        <div
          onClick={() => { setIsFlipped(!isFlipped); triggerHaptic('light'); }}
          className="w-full aspect-[4/5] bg-white rounded-3xl shadow-xl border-2 border-purple-200 flex flex-col items-center justify-center p-8 text-center cursor-pointer active:scale-95 transition-transform relative"
        >
          <span className="text-xs text-purple-400 uppercase tracking-wider mb-4 font-semibold">
            {isFlipped ? (isReverse ? 'Вопрос' : 'Ответ') : (isReverse ? 'Ответ' : 'Вопрос')}
          </span>
          <p className="text-2xl font-bold text-purple-900 leading-relaxed">
            {isFlipped ? (answerSide || '...') : (questionSide || '...')}
          </p>
          {currentCard.sides.length > 2 && isFlipped && extraSides.length > 0 && (
            <div className="mt-6 space-y-2 w-full">
              {extraSides.map((side, idx) => (
                <div key={idx} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <span className="text-xs font-bold text-purple-500 block mb-1">Сторона {idx + 3}</span>
                  <p className="text-sm text-purple-800">{side}</p>
                </div>
              ))}
            </div>
          )}
          <p className="absolute bottom-6 text-purple-400 text-sm">
            {isFlipped ? 'Нажми, чтобы вернуться' : 'Нажми, чтобы перевернуть'}
          </p>
        </div>

        {!isFlipped ? (
          <button onClick={() => setIsFlipped(true)} className="w-full bg-purple-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform">
            <RotateCw size={20} /> Показать ответ
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-4 w-full">
            <button onClick={() => handleEvaluate(false)} className="bg-orange-100 text-orange-700 py-4 rounded-2xl font-bold text-lg flex flex-col items-center gap-1 border-2 border-orange-200 active:scale-95 transition-transform">
              <X size={24} /> <span className="text-sm">Повторить</span>
            </button>
            <button onClick={() => handleEvaluate(true)} className="bg-purple-600 text-white py-4 rounded-2xl font-bold text-lg flex flex-col items-center gap-1 shadow-lg active:scale-95 transition-transform">
              <Check size={24} /> <span className="text-sm">Знаю</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
