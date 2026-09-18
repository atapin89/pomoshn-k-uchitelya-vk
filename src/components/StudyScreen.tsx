import { useState, useEffect } from 'react';
import { X, RotateCw, Check, RotateCcw, BookOpen, Award, HelpCircle, ChevronDown } from 'lucide-react';
import type { Deck, Card } from '@/types';
import { loadDecks, saveDecks } from '@/lib/storage';
import { triggerHaptic } from '@/lib/haptic';
import BackButton from './BackButton';

interface StudyScreenProps {
  deckId: string;
  onBack: () => void;
}

const FAQ_ITEMS = [
  {
    q: 'Как работает изучение карточек?',
    a: 'Нажмите на карточку, чтобы перевернуть её и увидеть ответ. Оцените себя честно: «Знаю» — карточка помечается как выученная, «Повторить» — возвращается в список для повторения. Честная самооценка — ключ к эффективному запоминанию.',
  },
  {
    q: 'Что означают статусы карточек?',
    a: 'У каждой карточки есть статус: «Новая» (не изучалась), «Выученная» (learned — не показывается в обычной сессии), «Ошибка» (mistake — требует повторения). Статус хранится в колоде и влияет на порядок показа карточек.',
  },
  {
    q: 'Как работает режим «Обратный»?',
    a: 'Кнопка «Обратный» меняет стороны местами: показывается ответ, а вам нужно вспомнить вопрос. Это тренирует обратные связи в памяти — полезно для иностранных языков (показать перевод, вспомнить слово) и формул (показать результат, вспомнить выражение).',
  },
  {
    q: 'Что такое «Повторение ошибок»?',
    a: 'Это специальная временная колода, которая собирает все карточки со статусом «ошибка» из всех ваших колод. Открывается через секцию «Повторить ошибки» на экране Флэш-карточек. Позволяет быстро проработать слабые места без перебора всех колод.',
  },
  {
    q: 'Почему изученные карточки не показываются?',
    a: 'В обычной сессии изученные карточки скрываются, чтобы не тратить время на уже известный материал. Они остаются в колоде и считаются в прогрессе (полоса заполнения). Чтобы изучить всё заново, можно сбросить статусы через редактирование колоды.',
  },
  {
    q: 'Сколько карточек изучать за раз?',
    a: 'Оптимально 15–20 карточек за сессию (5–7 минут). Больше — внимание рассеивается, запоминание ухудшается. Для длинных колод лучше делать несколько коротких сессий с перерывами. Мозг лучше усваивает информацию частыми короткими повторами.',
  },
];

export default function StudyScreen({ deckId, onBack }: StudyScreenProps) {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isReverse, setIsReverse] = useState(false);
  const [sessionCards, setSessionCards] = useState<Card[]>([]);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [stats, setStats] = useState({ learned: 0, mistakes: 0 });
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    let deckToStudy: Deck | null = null;
    
    if (deckId === 'mistakes-temp') {
      const tempData = localStorage.getItem('temp_study_deck');
      if (tempData) {
        try {
          deckToStudy = JSON.parse(tempData);
        } catch {
          console.error('Повреждённые данные временной колоды');
          deckToStudy = null;
        }
      }
    } else {
      const allDecks = loadDecks();
      deckToStudy = allDecks.find((d) => d.id === deckId) || null;
    }

    if (deckToStudy) {
      setDeck(deckToStudy);
      let cards = deckToStudy.cards || [];
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
    if (!currentCard) return;
    
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

  // 🆕 ЭКРАН ЗАВЕРШЕНИЯ
  if (sessionComplete) {
    return (
      <div className="min-h-[100dvh] bg-purple-50 flex flex-col">
        <header className="bg-purple-700 shadow-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <BackButton onClick={onBack} variant="light" />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white truncate">Результаты</h1>
            </div>
            <Award className="w-6 h-6 text-white/70 shrink-0" />
          </div>
        </header>
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 pb-8 flex flex-col items-center justify-center text-center">
          <div className="bg-white rounded-3xl p-8 shadow-xl w-full max-w-md">
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
  if (!currentCard) return null;

  const progress = ((currentIndex + 1) / sessionCards.length) * 100;
  const questionSide = isReverse ? currentCard.sides[currentCard.sides.length - 1] : currentCard.sides[0];
  const answerSide = isReverse ? currentCard.sides[0] : currentCard.sides[1];
  const extraSides = currentCard.sides.slice(2);

  return (
    <div className="min-h-[100dvh] bg-purple-50 flex flex-col">
      {/* 🆕 ЕДИНАЯ ШАПКА: кнопка → название → иконка */}
      <header className="bg-purple-700 shadow-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Изучение</h1>
          </div>
          <BookOpen className="w-6 h-6 text-white/70 shrink-0" />
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 space-y-4 pb-8">
        {/* 🆕 Информационная плашка (название колоды + счётчик + прогресс + кнопка Обратный) */}
        <div className="bg-white rounded-2xl shadow-sm p-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500">Колода</p>
              <p className="text-sm font-bold text-purple-700 truncate">{deck.title}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-gray-500">Карточка</p>
              <p className="text-sm font-bold text-purple-700">
                {currentIndex + 1} / {sessionCards.length}
              </p>
            </div>
            <div className="shrink-0 w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>

          {/* Прогресс-бар (перенесён из шапки) */}
          <div className="w-full h-2 bg-purple-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-violet-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>

          {/* Кнопка "Обратный" (перенесена из шапки) */}
          <button
            onClick={() => { setIsReverse(!isReverse); setIsFlipped(false); triggerHaptic('light'); }}
            className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
              isReverse
                ? 'bg-orange-100 text-orange-700 border border-orange-200'
                : 'bg-purple-50 text-purple-700 border border-purple-200'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {isReverse ? 'Режим: Ответ → Вопрос (нажмите, чтобы вернуть)' : 'Переключить на обратный режим'}
          </button>
        </div>

        {/* Карточка */}
        <div
          onClick={() => { setIsFlipped(!isFlipped); triggerHaptic('light'); }}
          className="w-full aspect-[4/5] bg-white rounded-3xl shadow-xl border-2 border-purple-200 flex flex-col items-center justify-center p-8 text-center cursor-pointer active:scale-95 transition-transform relative max-w-md mx-auto"
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

        {/* Кнопки управления */}
        {!isFlipped ? (
          <button onClick={() => setIsFlipped(true)} className="w-full bg-purple-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform max-w-md mx-auto">
            <RotateCw size={20} /> Показать ответ
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-4 w-full max-w-md mx-auto">
            <button onClick={() => handleEvaluate(false)} className="bg-orange-100 text-orange-700 py-4 rounded-2xl font-bold text-lg flex flex-col items-center gap-1 border-2 border-orange-200 active:scale-95 transition-transform">
              <X size={24} /> <span className="text-sm">Повторить</span>
            </button>
            <button onClick={() => handleEvaluate(true)} className="bg-purple-600 text-white py-4 rounded-2xl font-bold text-lg flex flex-col items-center gap-1 shadow-lg active:scale-95 transition-transform">
              <Check size={24} /> <span className="text-sm">Знаю</span>
            </button>
          </div>
        )}

        {/* 🆕 FAQ секция */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-lg font-bold text-purple-700 mb-3 flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Частые вопросы
          </h2>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, index) => (
              <div key={index} className="border border-purple-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between gap-2 hover:bg-purple-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-gray-800">{item.q}</span>
                  <ChevronDown className={`w-4 h-4 text-purple-600 shrink-0 transition-transform duration-200 ${openFaq === index ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === index && (
                  <div className="px-4 py-3 bg-purple-50 border-t border-purple-100">
                    <p className="text-sm text-gray-700 leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
