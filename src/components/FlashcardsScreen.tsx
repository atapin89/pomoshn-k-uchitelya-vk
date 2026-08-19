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
      a: 'Полоса на колоде показывает процент выученного. Секция «Повторить ошибки» собирает все карточки со статусом «о
