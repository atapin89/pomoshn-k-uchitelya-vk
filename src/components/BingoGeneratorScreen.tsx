import { useEffect, useMemo, useState } from 'react';
import { Grid3x3, Play, Save, Shuffle, Sparkles, Trash2, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { BingoConfig, BingoGame, GridSize, SavedBingoSet } from '@/types/bingo';
import { GRID_SIZES, generateBingoId } from '@/types/bingo';
import { generateBingoCards, generateCallOrder } from '@/lib/bingoGenerator';
import {
  clearCurrentBingoGame,
  deleteBingoSet,
  loadCurrentBingoGame,
  loadSavedBingoSets,
  saveBingoSet,
  saveCurrentBingoGame,
} from '@/lib/bingoStorage';
import { presetBingoSets } from '@/data/bingoPresets';
import BackButton from './BackButton';
import BingoPreviewScreen from './BingoPreviewScreen';
import BingoProjectorScreen from './BingoProjectorScreen';

type Screen = 'editor' | 'preview' | 'projector';

interface BingoGeneratorScreenProps {
  onBack: () => void;
}

export default function BingoGeneratorScreen({ onBack }: BingoGeneratorScreenProps) {
  const [screen, setScreen] = useState<Screen>('editor');
  const [name, setName] = useState('');
  const [wordsText, setWordsText] = useState('');
  const [gridSize, setGridSize] = useState<GridSize>('5x5');
  const [hasFreeCenter, setHasFreeCenter] = useState(true);
  const [cardCount, setCardCount] = useState(10);
  const [savedSets, setSavedSets] = useState<SavedBingoSet[]>([]);
  const [game, setGame] = useState<BingoGame | null>(null);
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [savedFlag, setSavedFlag] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    setSavedSets(loadSavedBingoSets());
    setHasSavedGame(loadCurrentBingoGame() !== null);
  }, []);

  const words = useMemo(() => {
    const seen = new Set<string>();
    return wordsText
      .split('\n')
      .map((w) => w.trim())
      .filter((w) => {
        if (!w) return false;
        const key = w.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [wordsText]);

  const cellsNeeded =
    GRID_SIZES[gridSize].total - (gridSize === '5x5' && hasFreeCenter ? 1 : 0);

  const buildConfig = (): BingoConfig => ({
    name: name.trim() || 'Бинго',
    gridSize,
    cardCount,
    hasFreeCenter: gridSize === '5x5' ? hasFreeCenter : false,
  });

  const startGame = (config: BingoConfig, gameWords: string[]) => {
    const newGame: BingoGame = {
      id: generateBingoId(),
      config,
      words: gameWords,
      cards: generateBingoCards(gameWords, config),
      callOrder: generateCallOrder(gameWords.length),
      currentCallIndex: 0,
      createdAt: Date.now(),
    };
    setGame(newGame);
    saveCurrentBingoGame(newGame);
    setHasSavedGame(true);
    setScreen('preview');
  };

  const generate = () => {
    if (words.length < cellsNeeded) return;
    startGame(buildConfig(), words);
  };

  const openSet = (set: SavedBingoSet) => {
    setName(set.name);
    setWordsText(set.words.join('\n'));
    setGridSize(set.config.gridSize);
    setHasFreeCenter(set.config.hasFreeCenter);
    setCardCount(set.config.cardCount);
    startGame({ ...set.config, name: set.name }, set.words);
  };

  const updateGame = (patch: Partial<BingoGame>) => {
    setGame((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      saveCurrentBingoGame(next);
      return next;
    });
  };

  const continueGame = () => {
    const saved = loadCurrentBingoGame();
    if (saved) {
      setGame(saved);
      setScreen('preview');
    }
  };

  const finishGame = () => {
    clearCurrentBingoGame();
    setHasSavedGame(false);
    setGame(null);
  };

  const saveSet = () => {
    if (words.length === 0) return;
    const set: SavedBingoSet = {
      id: generateBingoId(),
      name: name.trim() || 'Бинго',
      config: buildConfig(),
      words,
      createdAt: Date.now(),
    };
    saveBingoSet(set);
    setSavedSets(loadSavedBingoSets());
    setSavedFlag(true);
    setTimeout(() => setSavedFlag(false), 2000);
  };

  const removeSet = (id: string) => {
    deleteBingoSet(id);
    setSavedSets(loadSavedBingoSets());
  };

  const faqItems = [
    {
      q: 'Как играть в бинго?',
      a: 'Ведущий называет слова по порядку, игроки отмечают их на карточках. Первый, кто собрал линию (горизонталь, вертикаль или диагональ), кричит "Бинго!" и побеждает.',
    },
    {
      q: 'Сколько слов нужно для карточки?',
      a: 'Для 3×3 — минимум 8 слов (9 с FREE), для 4×4 — 16 слов, для 5×5 — 24 слова. Чем больше слов, тем разнообразнее карточки.',
    },
    {
      q: 'Что такое FREE-клетка?',
      a: 'В центре карточки 5×5 автоматически ставится "FREE" — она уже отмечена. Это классическое правило бинго, упрощающее победу.',
    },
    {
      q: 'Как использовать режим проектора?',
      a: 'Нажмите "Режим проектора" на экране просмотра карточек. Откроется тёмный экран с крупным текущим словом. Подключите проектор или интерактивную доску и нажмите "Во весь экран".',
    },
    {
      q: 'Зачем два PDF: карточки и список?',
      a: 'PDF карточек — для раздачи игрокам (печать). PDF списка — для ведущего, чтобы видеть порядок вызова слов и отмечать уже названные.',
    },
    {
      q: 'Можно ли играть онлайн без печати?',
      a: 'Да! В режиме просмотра карточки кликабельны — отмечайте их прямо на экране. Ученики могут играть на телефонах, а ведущий ведёт игру с проектора.',
    },
    {
      q: 'Как использовать готовые наборы?',
      a: 'Нажмите на готовый набор (например, "Математика") — карточки сгенерируются автоматически. Можете играть сразу или отредактировать слова и сгенерировать заново.',
    },
    {
      q: 'Идеи для урока',
      a: 'Повторение темы (термины, даты, формулы), изучение лексики иностранного языка, игра на закрепление правил, командная работа, разминка в начале урока, итоговая проверка знаний.',
    },
  ];

  if (screen === 'preview' && game) {
    return (
      <BingoPreviewScreen
        game={game}
        onBack={() => setScreen('editor')}
        onProjector={() => setScreen('projector')}
        onCardsChange={(cards) => updateGame({ cards })}
      />
    );
  }

  if (screen === 'projector' && game) {
    return (
      <BingoProjectorScreen
        game={game}
        onBack={() => setScreen('preview')}
        onUpdate={updateGame}
      />
    );
  }

  return (
    <div className="min-h-[100dvh] notebook-bg flex flex-col">
      <header className="bg-purple-700 shadow-md sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <div className="shrink-0">
            <BackButton onClick={onBack} variant="light" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h1 className="text-lg font-bold text-white leading-tight truncate">Бинго</h1>
            <p className="text-xs text-purple-200 leading-tight">Конструктор карточек</p>
          </div>
          <div className="shrink-0 w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
            <Grid3x3 className="w-5 h-5 text-white" />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-5 py-5 space-y-4 overflow-y-auto pb-10">
        {hasSavedGame && !game && (
          <div className="bg-gradient-to-br from-green-100 to-emerald-50 border-2 border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-green-800">Есть сохранённая игра</h3>
              <p className="text-sm text-green-700">Продолжите с того же места</p>
            </div>
            <button
              onClick={continueGame}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl px-4 py-3 flex items-center gap-2 active:scale-95 transition-transform shrink-0"
            >
              <Play className="w-5 h-5" /> Продолжить
            </button>
          </div>
        )}

        {game && (
          <div className="bg-gradient-to-br from-purple-100 to-violet-50 border-2 border-purple-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-purple-800 truncate">Игра: {game.config.name}</h3>
              <p className="text-sm text-purple-700">
                Вызвано {game.currentCallIndex} из {game.callOrder.length}
              </p>
            </div>
            <button
              onClick={() => setScreen('preview')}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl px-4 py-3 flex items-center gap-2 active:scale-95 transition-transform shrink-0"
            >
              <Play className="w-5 h-5" /> Открыть
            </button>
            <button
              onClick={finishGame}
              className="bg-white text-red-500 border-2 border-red-200 font-semibold rounded-xl px-3 py-3 active:scale-95 transition-transform shrink-0"
              aria-label="Завершить игру"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Готовые наборы */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-purple-700">Готовые наборы</h3>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {presetBingoSets.map((set) => (
              <button
                key={set.id}
                onClick={() => openSet(set)}
                className="bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 rounded-xl p-3 text-left active:scale-95 transition-transform"
              >
                <h4 className="font-semibold text-purple-800 text-sm leading-tight">{set.name}</h4>
                <p className="text-xs text-purple-500 mt-1">слов: {set.words.length}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Форма конструктора */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <div>
            <label className="text-sm font-semibold text-purple-700 block mb-2">Название бинго</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Столицы мира"
              className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-purple-700 block mb-2">
              Слова (каждое с новой строки)
            </label>
            <textarea
              value={wordsText}
              onChange={(e) => setWordsText(e.target.value)}
              placeholder={'Москва\nПариж\nТокио\n...'}
              className="w-full h-40 rounded-xl border border-purple-200 p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-y"
            />
            <p
              className={`text-xs font-semibold mt-1 ${
                words.length >= cellsNeeded ? 'text-green-600' : 'text-orange-600'
              }`}
            >
              Слов: {words.length} · нужно минимум {cellsNeeded}
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold text-purple-700 block mb-2">Размер сетки</label>
            <div className="grid grid-cols-3 gap-2">
              {(['3x3', '4x4', '5x5'] as GridSize[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setGridSize(s)}
                  className={`py-3 rounded-xl font-bold text-sm transition-colors ${
                    gridSize === s ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700'
                  }`}
                >
                  {s.replace('x', '×')}
                </button>
              ))}
            </div>
          </div>

          {gridSize === '5x5' && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-gray-700">Свободная клетка в центре (FREE)</span>
              <button
                onClick={() => setHasFreeCenter(!hasFreeCenter)}
                className={`relative shrink-0 w-12 h-7 rounded-full transition-colors duration-200 ${
                  hasFreeCenter ? 'bg-purple-600' : 'bg-gray-300'
                }`}
                aria-label="Свободная клетка"
              >
                <span
                  className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                    hasFreeCenter ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}

          <div>
            <label className="text-sm font-semibold text-purple-700 block mb-2">
              Количество карточек: {cardCount}
            </label>
            <input
              type="range"
              min="1"
              max="30"
              value={cardCount}
              onChange={(e) => setCardCount(Number(e.target.value))}
              className="w-full accent-purple-600"
            />
            <p className="text-xs text-gray-500 mt-1">От 1 до 30 уникальных карточек</p>
          </div>

          <button
            onClick={generate}
            disabled={words.length < cellsNeeded}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold rounded-xl py-4 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Shuffle className="w-5 h-5" /> Сгенерировать карточки
          </button>
        </div>

        {/* Мои наборы */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-purple-700">Мои наборы</h3>
            <button
              onClick={saveSet}
              disabled={words.length === 0}
              className="bg-purple-100 hover:bg-purple-200 disabled:opacity-50 text-purple-700 font-semibold rounded-xl px-3 py-2 text-sm flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              <Save className="w-4 h-4" /> {savedFlag ? 'Сохранено ✓' : 'Сохранить набор'}
            </button>
          </div>

          {savedSets.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Пока нет сохранённых наборов</p>
          ) : (
            <div className="space-y-2">
              {savedSets.map((set) => (
                <div key={set.id} className="border-2 border-purple-100 rounded-xl p-3 flex items-center gap-2">
                  <button onClick={() => openSet(set)} className="flex-1 min-w-0 text-left">
                    <h4 className="font-semibold text-gray-800 truncate">{set.name}</h4>
                    <p className="text-xs text-gray-500">
                      {set.config.gridSize.replace('x', '×')} · слов: {set.words.length} ·{' '}
                      {new Date(set.createdAt).toLocaleDateString('ru-RU')}
                    </p>
                  </button>
                  <button
                    onClick={() => removeSet(set.id)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                    aria-label="Удалить набор"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FAQ и подсказки */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-purple-700">Вопросы и подсказки</h3>
          </div>

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
      </main>
    </div>
  );
}
