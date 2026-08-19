import { useEffect, useMemo, useState } from 'react';
import {
  Grid3x3,
  Play,
  Save,
  Shuffle,
  Sparkles,
  Trash2,
  HelpCircle,
  GraduationCap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
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
  const [openMethod, setOpenMethod] = useState<number | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [showMethod, setShowMethod] = useState(false);

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

  const methodItems = [
    {
      q: 'Подготовка: печатный формат',
      a: '1) Выберите тему и список слов (от 24). 2) Сгенерируйте карточки: число учеников + 2–3 запасные. 3) Скачайте PDF карточек (2–4 на лист) и распечатайте. 4) Скачайте «Список ведущего». 5) Раздайте карточки, объясните правило линии (5 в ряд по горизонтали, вертикали или диагонали) и вызывайте слова. Собравший линию кричит «Бинго!» — сверьте карточку со списком.',
    },
    {
      q: 'Подготовка: онлайн с проектором',
      a: '1) Сгенерируйте карточки и откройте «Режим проектора» → «Во весь экран». 2) Ученики играют с распечаток или с телефонов — клетки отмечаются тапом. 3) Ведите игру кнопкой «Далее»; табло (иконка глаза) показывает вызванные слова. 4) Победителя проверяйте по табло: все слова его линии должны быть зелёными.',
    },
    {
      q: 'Практические советы',
      a: 'Закладывайте 10–15 минут, одна партия — 5–7 минут. Останавливайтесь после 1–2 победителей, иначе внимание рассеивается. Чем больше список слов, тем уникальнее карточки. Победителю — «+1 к оценке», наклейка или маленький приз.',
    },
    {
      q: 'Сценарий 1 · Разминка-повторение',
      a: 'Начало урока, любая тема. Набор по пройденному материалу (например, «Памятные даты истории РФ»). Называйте событие — ученики отмечают дату; на следующем уроке наоборот: дату — ищут событие. Первая линия — мини-победа, полное бинго — оценка.',
    },
    {
      q: 'Сценарий 2 · Терминологическое лото',
      a: 'Закрепление терминов (русский язык, биология, география). Читайте определение — ученики отмечают термин. Усложнение для сильных: называйте пример, синоним или антоним.',
    },
    {
      q: 'Сценарий 3 · Математическая перестрелка',
      a: 'Устный счёт, повторение перед контрольной. Называйте задание («корень из 144», «15% от 200») — ученики отмечают ответ. Темп 20–30 секунд на вызов. Игра парами: один считает, второй отмечает, потом меняются.',
    },
    {
      q: 'Сценарий 4 · Новогодний урок-праздник',
      a: 'Декабрь, начальная школа. Набор «Новый год»: загадывайте загадки — дети отмечают отгадки. Включите режим проектора с крупными словами — даже первоклашки следят за игрой всем классом.',
    },
    {
      q: 'Сценарий 5 · Командный турнир',
      a: 'Обобщающий урок. Класс делится на команды, у каждой своя стопка карточек. Слова вызываются для всех одновременно. Побеждает команда, первой собравшая 3 линии; спорные ситуации проверяются по табло на проекторе.',
    },
  ];

  const faqItems = [
    {
      q: 'Как играть в бинго?',
      a: 'Ведущий называет слова по порядку, игроки отмечают их на карточках. Первый, кто собрал линию (горизонталь, вертикаль или диагональ), кричит "Бинго!" и побеждает.',
    },
    {
      q: 'Сколько слов нужно для карточки?',
      a: 'Для 3×3 — минимум 9 слов, для 4×4 — 16 слов, для 5×5 — 24 слова (с FREE-клеткой). Чем больше слов, тем разнообразнее карточки.',
    },
    {
      q: 'Что такое FREE-клетка?',
      a: 'В центре карточки 5×5 автоматически ставится "FREE" — она уже отмечена. Это классическое правило бинго, упрощающее победу.',
    },
    {
      q: 'Как использовать режим проектора?',
      a: 'Нажмите "Режим проектора" на экране просмотра карточек. Откроется тёмный экран с крупным текущим словом. Подключите проектор или доску и нажмите "Во весь экран".',
    },
    {
      q: 'Зачем два PDF: карточки и список?',
      a: 'PDF карточек — для раздачи игрокам (печать). PDF списка — для ведущего: порядок вызова слов и отметки уже названных.',
    },
    {
      q: 'Можно ли играть онлайн без печати?',
      a: 'Да! В режиме просмотра карточки кликабельны — отмечайте их прямо на экране. Ученики играют на телефонах, ведущий ведёт игру с проектора.',
    },
    {
      q: 'Как использовать готовые наборы?',
      a: 'Откройте «Готовые наборы» и нажмите на плитку — карточки сгенерируются автоматически. Играйте сразу или вернитесь и отредактируйте слова.',
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
        {/* Сохранённая игра + кнопка Сброс */}
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
            <button
              onClick={finishGame}
              className="bg-white text-red-500 border-2 border-red-200 font-semibold rounded-xl px-3 py-3 active:scale-95 transition-transform shrink-0"
              aria-label="Сбросить сохранённую игру"
            >
              <Trash2 className="w-5 h-5" />
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

        {/* Готовые наборы: аккордеон с компактными горизонтальными плитками */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="w-full px-5 py-4 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-700">Готовые наборы</h3>
              <span className="text-xs font-bold text-purple-400">{presetBingoSets.length}</span>
            </div>
            {showPresets ? (
              <ChevronUp className="w-5 h-5 text-purple-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-purple-600" />
            )}
          </button>
          {showPresets && (
            <div className="px-5 pb-5 space-y-2">
              {presetBingoSets.map((set) => (
                <button
                  key={set.id}
                  onClick={() => openSet(set)}
                  className="w-full bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 rounded-xl p-3 flex items-center gap-3 text-left active:scale-95 transition-transform"
                >
                  <div className="shrink-0 w-11 h-11 rounded-xl bg-white flex items-center justify-center border border-purple-200">
                    <Grid3x3 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-purple-800 text-sm leading-tight truncate">
                      {set.name}
                    </h4>
                    <p className="text-xs text-purple-500 mt-0.5">слов: {set.words.length}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-purple-400 -rotate-90 shrink-0" />
                </button>
              ))}
            </div>
          )}
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

        {/* Методичка: аккордеон */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowMethod(!showMethod)}
            className="w-full px-5 py-4 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-700">Методичка: сценарии для урока</h3>
              <span className="text-xs font-bold text-purple-400">{methodItems.length}</span>
            </div>
            {showMethod ? (
              <ChevronUp className="w-5 h-5 text-purple-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-purple-600" />
            )}
          </button>
          {showMethod && (
            <div className="px-5 pb-5 space-y-2">
              {methodItems.map((item, idx) => (
                <div key={idx} className="border border-purple-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenMethod(openMethod === idx ? null : idx)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-purple-50 transition-colors"
                  >
                    <span className="font-semibold text-sm text-gray-800">{item.q}</span>
                    {openMethod === idx ? (
                      <ChevronUp className="w-4 h-4 text-purple-600 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-purple-600 shrink-0" />
                    )}
                  </button>
                  {openMethod === idx && (
                    <div className="px-4 pb-3 pt-1 text-sm text-gray-600 bg-purple-50/50 border-t border-purple-100">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FAQ */}
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
