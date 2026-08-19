import { useState, useEffect } from 'react';
import { Layers, Plus, Pencil, Trash2, RotateCcw, AlertCircle, Monitor, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { Deck } from '@/types';
import { loadDecks, saveDecks } from '@/lib/storage';
import { triggerHaptic } from '@/lib/haptic';
import BackButton from './BackButton';
import DeckEditorModal from './DeckEditorModal';
import FlashcardsProjectorScreen from './FlashcardsProjectorScreen';

interface FlashcardsScreenProps {
  onBack: () => void;
  onStudy: (deckId: string) => void;
  onQuiz: (deckId: string) => void;
}

export default function FlashcardsScreen({ onBack, onStudy, onQuiz }: FlashcardsScreenProps) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [editing, setEditing] = useState<Deck | null>(null);
  const [creating, setCreating] = useState(false);
  const [mistakeCards, setMistakeCards] = useState<{ card: any; deckTitle: string; deckId: string }[]>([]);
  const [projectorDeck, setProjectorDeck] = useState<Deck | null>(null);
  const [openHow, setOpenHow] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const loaded = loadDecks();
    setDecks(loaded);

    const mistakes: { card: any; deckTitle: string; deckId: string }[] = [];
    loaded.forEach((deck) => {
      deck.cards
        .filter((c) => c.status === 'mistake')
        .forEach((card) => {
          mistakes.push({ card, deckTitle: deck.title, deckId: deck.id });
        });
    });
    setMistakeCards(mistakes);
  }, []);

  const persist = (next: Deck[]) => {
    setDecks(next);
    saveDecks(next);
  };

  const handleSaveDeck = (deck: Deck) => {
    const exists = decks.some((d) => d.id === deck.id);
    const next = exists
      ? decks.map((d) => (d.id === deck.id ? deck : d))
      : [...decks, deck];
    persist(next);
    setEditing(null);
    setCreating(false);
  };

  const handleDeleteDeck = (id: string) => {
    triggerHaptic('medium');
    persist(decks.filter((d) => d.id !== id));
  };

  const getDeckProgress = (deck: Deck) => {
    const total = deck.cards.length;
    const learned = deck.cards.filter((c) => c.status === 'learned').length;
    const mistakes = deck.cards.filter((c) => c.status === 'mistake').length;
    const pct = total > 0 ? Math.round((learned / total) * 100) : 0;
    return { total, learned, mistakes, pct };
  };

  const howItems = [
    {
      q: 'Создание колоды',
      a: 'Нажмите «Создать новую колоду», введите название и добавьте карточки «вопрос — ответ». Можно добавить дополнительные стороны (сторона 3, 4…) для подробных ответов.',
    },
    {
      q: 'Изучение',
      a: 'Откройте «Изучать»: переворачивайте карточку тапом и честно отмечайте «Знаю» или «Повторить». Ошибки автоматически попадают в секцию «Повторить ошибки» сверху.',
    },
    {
      q: 'Тесты',
      a: 'Три формата: выбор ответа из 4 вариантов, ввод текста с клавиатуры и соответствие пар. В конце — процент и счёт. Кнопка «Обратный» меняет стороны местами.',
    },
    {
      q: 'Режим проектора',
      a: 'Кнопка с иконкой монитора на карточке колоды открывает проектор: вопрос крупно на весь экран, «Показать ответ» — для проверки, «Далее/Назад» — листать, перемешивание и полноэкранный режим — в шапке.',
    },
    {
      q: 'Прогресс и ошибки',
      a: 'Полоса на колоде показывает процент выученного. Секция «Повторить ошибки» собирает все карточки со статусом «ошибка» в одну временную колоду для быстрой проработки.',
    },
  ];

  const faqItems = [
    {
      q: 'Где хранятся колоды?',
      a: 'На вашем устройстве. Данные никуда не отправляются. В будущих версиях — облачная синхронизация через VK ID с подпиской Pro.',
    },
    {
      q: 'Сколько карточек добавлять?',
      a: 'Оптимально 20–40 карточек на тему. Для разминки на уроке достаточно 10–15. В тесте можно выбрать от 2 до 20 вопросов.',
    },
    {
      q: 'Что такое интервальное повторение?',
      a: 'Карточки с ошибками возвращаются на повторение чаще, выученные — реже. Так материал закрепляется с минимальными затратами времени.',
    },
    {
      q: 'Как провести с классом?',
      a: 'Откройте режим проектора: показывайте вопрос — ученики отвечают с места или поднимают руку, затем «Показать ответ» для проверки. Второй вариант: распечатайте список и проведите бинго из раздела «Бинго».',
    },
    {
      q: 'Как удалить или изменить колоду?',
      a: 'На карточке колоды: карандаш — редактирование (название и карточки), корзина — удаление без возможности восстановления.',
    },
  ];

  if (projectorDeck) {
    return <FlashcardsProjectorScreen deck={projectorDeck} onBack={() => setProjectorDeck(null)} />;
  }

  return (
    <div className="min-h-[100dvh] bg-purple-50 flex flex-col">
      <header className="bg-purple-700 shadow-md sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <div className="shrink-0">
            <BackButton onClick={onBack} variant="light" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h1 className="text-lg font-bold text-white leading-tight truncate">Флэш-карточки</h1>
            <p className="text-xs text-purple-200 leading-tight">Интервальное повторение</p>
          </div>
          <div className="shrink-0 w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
            <Layers className="w-5 h-5 text-white" />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-5 py-5 flex flex-col gap-4 overflow-y-auto pb-10">
        {/* СЕКЦИЯ: ПОВТОРИТЬ ОШИБКИ */}
        {mistakeCards.length > 0 && (
          <div className="bg-gradient-to-br from-orange-100 to-red-50 border-2 border-orange-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <h3 className="font-bold text-orange-800">Повторить ошибки</h3>
              <span className="ml-auto bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                {mistakeCards.length}
              </span>
            </div>
            <p className="text-sm text-orange-700 mb-3">
              У вас {mistakeCards.length} карточек, которые нужно повторить
            </p>
            <button
              onClick={() => {
                triggerHaptic('heavy');
                const tempDeck: Deck = {
                  id: 'mistakes-temp',
                  title: 'Повторение ошибок',
                  cards: mistakeCards.map((m) => m.card),
                  createdAt: Date.now(),
                };
                localStorage.setItem('temp_study_deck', JSON.stringify(tempDeck));
                onStudy('mistakes-temp');
              }}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <RotateCcw className="w-5 h-5" /> Начать повторение
            </button>
          </div>
        )}

        {/* СПИСОК КОЛОД */}
        {decks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Layers className="w-16 h-16 text-purple-300 mb-4" />
            <p className="text-lg font-semibold text-purple-700">Пока нет колод</p>
            <p className="text-sm text-gray-500 mt-1">Создайте первую колоду карточек</p>
          </div>
        ) : (
          decks.map((deck) => {
            const { total, learned, mistakes, pct } = getDeckProgress(deck);
            return (
              <div key={deck.id} className="bg-white rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-purple-700 truncate">{deck.title}</h3>
                    <p className="text-sm text-gray-500">
                      {total} карточек · Изучено {learned}
                      {mistakes > 0 && <span className="text-orange-600"> · Ошибок {mistakes}</span>}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        setProjectorDeck(deck);
                      }}
                      className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 active:scale-95 transition-transform"
                      aria-label="Режим проектора"
                    >
                      <Monitor className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        setEditing(deck);
                      }}
                      className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 active:scale-95 transition-transform"
                      aria-label="Редактировать"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteDeck(deck.id)}
                      className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500 active:scale-95 transition-transform"
                      aria-label="Удалить"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="w-full h-2.5 bg-purple-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-violet-600 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5 mt-1">
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      onStudy(deck.id);
                    }}
                    disabled={total === 0}
                    className="bg-purple-600 text-white font-semibold rounded-xl py-3 min-h-12 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-40"
                  >
                    <Layers className="w-5 h-5" /> Изучать
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      onQuiz(deck.id);
                    }}
                    disabled={total < 2}
                    className="bg-white border-2 border-purple-200 text-purple-700 font-semibold rounded-xl py-3 min-h-12 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-40"
                  >
                    Тест
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Кнопка создания */}
        <button
          onClick={() => {
            triggerHaptic('light');
            setCreating(true);
          }}
          className="w-full bg-white border-2 border-dashed border-purple-300 rounded-2xl py-4 flex items-center justify-center gap-2 text-purple-600 font-semibold active:scale-95 transition-transform min-h-14"
        >
          <Plus className="w-5 h-5" /> Создать новую колоду
        </button>

        {/* Как это работает */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setOpenHow(openHow === -1 ? null : -1)}
            className="w-full px-5 py-4 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-700">Как это работает</h3>
              <span className="text-xs font-bold text-purple-400">{howItems.length}</span>
            </div>
            {openHow === -1 ? (
              <ChevronUp className="w-5 h-5 text-purple-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-purple-600" />
            )}
          </button>
          {openHow === -1 && (
            <div className="px-5 pb-5 space-y-2">
              {howItems.map((item, idx) => (
                <div key={idx} className="border border-purple-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenHow(openHow === idx ? null : idx)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-purple-50 transition-colors"
                  >
                    <span className="font-semibold text-sm text-gray-800">{item.q}</span>
                    {openHow === idx ? (
                      <ChevronUp className="w-4 h-4 text-purple-600 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-purple-600 shrink-0" />
                    )}
                  </button>
                  {openHow === idx && (
                    <div className="px-4 pb-3 pt-1 text-sm text-gray-600 bg-purple-50/50 border-t border-purple-100">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Вопросы и подсказки */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setOpenFaq(openFaq === -1 ? null : -1)}
            className="w-full px-5 py-4 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-700">Вопросы и подсказки</h3>
              <span className="text-xs font-bold text-purple-400">{faqItems.length}</span>
            </div>
            {openFaq === -1 ? (
              <ChevronUp className="w-5 h-5 text-purple-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-purple-600" />
            )}
          </button>
          {openFaq === -1 && (
            <div className="px-5 pb-5 space-y-2">
              {faqItems.map((item, idx) => (
                <div key={idx} className="border border-purple-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-purple-50 transition-colors"
                  >
                    <span className="font-semibold text-sm text-gray-800">{item.q}</span>
                    {openFaq === idx ? (
                      <ChevronUp className="w-4 h-4 text-purple-600 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-purple-600 shrink-0" />
                    )}
                  </button>
                  {openFaq === idx && (
                    <div className="px-4 pb-3 pt-1 text-sm text-gray-600 bg-purple-50/50 border-t border-purple-100">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {(creating || editing) && (
        <DeckEditorModal
          deck={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={handleSaveDeck}
        />
      )}
    </div>
  );
}
