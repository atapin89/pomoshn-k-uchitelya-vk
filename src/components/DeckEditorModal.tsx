import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { Deck, FlashCard } from '@/types';
import { generateCardId } from '@/lib/storage';
import { triggerHaptic } from '@/lib/haptic';

interface DeckEditorModalProps {
  deck: Deck | null;
  onClose: () => void;
  onSave: (deck: Deck) => void;
}

const MAX_SIDES = 10;
const MIN_SIDES = 2;

export default function DeckEditorModal({ deck, onClose, onSave }: DeckEditorModalProps) {
  const [title, setTitle] = useState(deck?.title || '');
  const [cards, setCards] = useState<FlashCard[]>(
    deck?.cards || [{ id: generateCardId(), sides: ['', ''], status: 'new' }]
  );

  const addCard = () => {
    triggerHaptic('light');
    setCards([...cards, { id: generateCardId(), sides: ['', ''], status: 'new' }]);
  };

  const removeCard = (index: number) => {
    const card = cards[index];
    const hasContent = card.sides.some(s => s.trim() !== '');
    
    if (hasContent) {
      const proceed = window.confirm('Удалить карточку с заполненными данными?');
      if (!proceed) return;
    }
    
    triggerHaptic('medium');
    setCards(cards.filter((_, i) => i !== index));
  };

  const updateCardSide = (cardIndex: number, sideIndex: number, value: string) => {
    const updated = [...cards];
    const newSides = [...updated[cardIndex].sides];
    newSides[sideIndex] = value;
    updated[cardIndex] = { ...updated[cardIndex], sides: newSides };
    setCards(updated);
  };

  const addSide = (cardIndex: number) => {
    const card = cards[cardIndex];
    if (card.sides.length >= MAX_SIDES) {
      alert(`Максимум ${MAX_SIDES} сторон на карточку`);
      return;
    }
    
    triggerHaptic('light');
    const updated = [...cards];
    const newSides = [...card.sides, ''];
    updated[cardIndex] = { ...card, sides: newSides };
    setCards(updated);
  };

  const removeSide = (cardIndex: number, sideIndex: number) => {
    const card = cards[cardIndex];
    if (card.sides.length <= MIN_SIDES) {
      alert(`Минимум ${MIN_SIDES} стороны`);
      return;
    }
    
    const updated = [...cards];
    const newSides = card.sides.filter((_, i) => i !== sideIndex);
    updated[cardIndex] = { ...card, sides: newSides };
    setCards(updated);
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('Введите название колоды');
      return;
    }
    
    const validCards = cards
      .filter(c => c.sides.some(s => s.trim() !== ''))
      .map(c => ({
        ...c,
        sides: c.sides.map(s => s.trim()),
      }));

    if (validCards.length === 0) {
      alert('Добавьте хотя бы одну карточку с заполненной стороной');
      return;
    }

    const newDeck: Deck = {
      id: deck?.id || generateCardId(),
      title: title.trim(),
      cards: validCards,
      createdAt: deck?.createdAt || Date.now(),
    };
    triggerHaptic('heavy');
    onSave(newDeck);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={deck ? 'Редактировать колоду' : 'Новая колода'}
    >
      <div className="bg-white w-full max-w-md max-h-[90vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden">
        {/* Шапка */}
        <div className="bg-purple-700 text-white p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {deck ? 'Редактировать колоду' : 'Новая колода'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Закрыть"
            title="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Содержимое */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <input
            type="text"
            placeholder="Название колоды (например, 'Английские слова')"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-4 rounded-xl border-2 border-purple-200 focus:outline-none focus:border-purple-500 font-semibold text-lg"
            aria-label="Название колоды"
          />

          {cards.map((card, cardIdx) => {
            const isInsane = card.sides.length > 2;
            return (
              <div key={card.id} className="bg-purple-50 rounded-2xl p-4 border-2 border-purple-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-purple-700">Карточка {cardIdx + 1}</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      isInsane ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {isInsane ? 'Insane' : 'Lame'}
                    </span>
                  </div>
                  {cards.length > 1 && (
                    <button
                      onClick={() => removeCard(cardIdx)}
                      className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                      aria-label={`Удалить карточку ${cardIdx + 1}`}
                      title="Удалить карточку"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {card.sides.map((side, sideIdx) => (
                    <div key={sideIdx} className="flex gap-2">
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-purple-400">
                          {sideIdx + 1}
                        </span>
                        <input
                          type="text"
                          placeholder={
                            sideIdx === 0 ? 'Вопрос / Сторона 1' :
                            sideIdx === 1 ? 'Ответ / Сторона 2' :
                            `Сторона ${sideIdx + 1}`
                          }
                          value={side}
                          onChange={(e) => updateCardSide(cardIdx, sideIdx, e.target.value)}
                          className="w-full p-3 pl-8 rounded-lg bg-white border border-purple-200 focus:outline-none focus:border-purple-500"
                          aria-label={`Сторона ${sideIdx + 1} карточки ${cardIdx + 1}`}
                        />
                      </div>
                      {card.sides.length > 2 && (
                        <button
                          onClick={() => removeSide(cardIdx, sideIdx)}
                          className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                          aria-label={`Удалить сторону ${sideIdx + 1}`}
                          title="Удалить сторону"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => addSide(cardIdx)}
                  disabled={card.sides.length >= MAX_SIDES}
                  className="mt-3 w-full py-2 rounded-lg border-2 border-dashed border-purple-300 text-purple-600 text-sm font-semibold flex items-center justify-center gap-1 hover:bg-purple-50 disabled:opacity-40 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Добавить сторону (Insane режим)
                </button>
              </div>
            );
          })}

          <button
            onClick={addCard}
            className="w-full py-3 rounded-xl border-2 border-dashed border-purple-300 text-purple-600 font-semibold flex items-center justify-center gap-2 hover:bg-purple-50 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Добавить карточку
          </button>
        </div>

        {/* Кнопка сохранения */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl text-lg disabled:opacity-50 active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            {deck ? 'Сохранить изменения' : 'Создать колоду'}
          </button>
        </div>
      </div>
    </div>
  );
}
