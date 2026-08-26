import { useEffect, useRef, useState } from 'react';
import {
  Triangle,
  Hexagon,
  Plus,
  Upload,
  Download,
  FileText,
  Pencil,
  Trash2,
  Save,
  Sparkles,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  GraduationCap,
} from 'lucide-react';
import type { TarsiaPuzzle, TarsiaShape, TarsiaCardSize } from '@/types/tarsia';
import { generateTarsiaId, validateTarsiaPairs } from '@/types/tarsia';
import {
  loadTarsiaPuzzles,
  upsertTarsiaPuzzle,
  deleteTarsiaPuzzle,
  renameTarsiaPuzzle,
  serializeTarsiaPuzzle,
  parseTarsiaPuzzleFile,
  parseTarsiaTxtFile,
} from '@/lib/tarsiaStorage';
import { getTarsiaGridById } from '@/data/tarsiaGrids';
import { exportTarsiaToPDF } from '@/lib/tarsiaPdf';
import BackButton from './BackButton';
import { triggerHaptic } from '@/lib/haptic';

interface TarsiaScreenProps {
  onBack: () => void;
}

const SHAPE_OPTIONS: { id: TarsiaShape; label: string; Icon: typeof Triangle }[] = [
  { id: 'small-triangle', label: 'Треуг. мал.', Icon: Triangle },
  { id: 'triangle', label: 'Треуг. бол.', Icon: Triangle },
  { id: 'small-hex', label: 'Шест. мал.', Icon: Hexagon },
  { id: 'hex', label: 'Шест. бол.', Icon: Hexagon },
];

const CARD_SIZES: { id: TarsiaCardSize; label: string }[] = [
  { id: 'small', label: 'Мелкий' },
  { id: 'medium', label: 'Средний' },
  { id: 'large', label: 'Крупный' },
];

const DEMO_PAIRS: { left: string; right: string }[] = [
  { left: 'Столица России', right: 'Москва' },
  { left: 'Самая длинная река России', right: 'Обь' },
  { left: 'Самое глубокое озеро', right: 'Байкал' },
  { left: 'Самая высокая гора мира', right: 'Эверест' },
  { left: 'Материк, на котором живём', right: 'Евразия' },
  { left: 'Океан у берегов России на востоке', right: 'Тихий' },
];

function createDemoPuzzle(): TarsiaPuzzle {
  return {
    id: generateTarsiaId('tarsia'),
    title: 'Окружающий мир (демо)',
    shape: 'triangle',
    pairs: DEMO_PAIRS.map((p) => ({
      id: generateTarsiaId('pair'),
      left: p.left,
      right: p.right,
    })),
    puzzleTitle: 'Соедини вопрос с ответом',
    solutionTitle: 'Решение',
    showSolution: true,
    cardSize: 'medium',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

const HOW_ITEMS = [
  {
    q: 'Как создать пазл',
    a: 'Нажмите «Создать», введите название и выберите форму (треугольная или шестиугольная, маленькая или большая). В списке пар введите «вопрос → ответ» для каждой пары. Пазл сохраняет автоматически.',
  },
  {
    q: 'Выбор формы и размера',
    a: 'Маленький треугольник — 6 пар (15 мин урока). Большой треугольник — 18 пар (полный урок). Шестиугольники — сложнее, подходят для старших классов. Размер карточек (мелкий/средний/крупный) выбирается перед экспортом в PDF.',
  },
  {
    q: 'Импорт и экспорт',
    a: '«Импорт» принимает .json (пазлы из Помощника учителя) и .txt (пары в формате «вопрос\\tответ», по одной на строку). «Экспорт JSON» скачивает файл для обмена с коллегами.',
  },
  {
    q: 'Печать в PDF',
    a: '«Скачать PDF» создаёт две страницы: решение (собранная фигура) и вырезалка (разрезанные карточки для раздачи ученикам). Печатайте двусторонне, переворот по длинному краю.',
  },
  {
    q: 'Мои пазлы',
    a: 'Все созданные головоломки сохраняются в «Мои пазлы». Карандаш — переименовать, PDF — скачать для печати, корзина — удалить без возможности восстановления.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Сценарий 1 · Разминка в начале урока',
    a: 'Выберите «Треуг. мал.» (6 пар) по теме прошлого урока. Раздайте разрезанные карточки парам учеников, засекайте 5–7 минут. Первой паре, собравшей фигуру, — «+1 к оценке».',
  },
  {
    q: 'Сценарий 2 · Повторение перед контрольной',
    a: '«Треуг. бол.» (18 пар) — все ключевые определения темы. Команды по 3–4 человека, раздать распечатки. Кто быстрее и правильнее собрал — победитель.',
  },
  {
    q: 'Сценарий 3 · Межпредметный урок',
    a: 'Шестиугольная форма сложнее — используйте для терминов, где нужно соединить 3 стороны (например, «термин — определение — пример»). Хорошо работает на истории, биологии, химии.',
  },
  {
    q: 'Сценарий 4 · Обмен с коллегами',
    a: 'Сделали хороший пазл — нажмите «Экспорт JSON», отправьте файл коллеге через чат. Он в своём «Помощнике» нажимает «Импорт» — пазл готов к использованию.',
  },
  {
    q: 'Сколько пар нужно для урока?',
    a: '6 пар — 5–10 минут (разминка). 12 пар — 15–20 минут (повторение). 18 пар — 30–40 минут (полный урок или внеклассное мероприятие). Меньше 4 пар — пазл собирается слишком быстро.',
  },
  {
    q: '⚠️ Персональные данные',
    a: 'Имена учеников — персональные данные (152-ФЗ). В парах вопроса-ответа имён нет, поэтому пазлы безопасны. Если добавляете ФИО в пары (например, «кто открыл…»), не публикуйте PDF в открытом доступе.',
  },
];

export default function TarsiaScreen({ onBack }: TarsiaScreenProps) {
  const [puzzles, setPuzzles] = useState<TarsiaPuzzle[]>([]);
  const [activePuzzle, setActivePuzzle] = useState<TarsiaPuzzle | null>(null);

  const [importMsg, setImportMsg] = useState<'ok' | 'error' | null>(null);
  const [showHow, setShowHow] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [openHow, setOpenHow] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPuzzles(loadTarsiaPuzzles());
  }, []);

  const refresh = () => setPuzzles(loadTarsiaPuzzles());

  const handleCreate = () => {
    const puzzle: TarsiaPuzzle = {
      id: generateTarsiaId('tarsia'),
      title: 'Новый пазл',
      shape: 'triangle',
      pairs: [],
      puzzleTitle: 'Соедини вопрос с ответом',
      solutionTitle: 'Решение',
      showSolution: true,
      cardSize: 'medium',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    upsertTarsiaPuzzle(puzzle);
    refresh();
    setActivePuzzle(puzzle);
  };

  const handleLoadDemo = () => {
    const demo = createDemoPuzzle();
    upsertTarsiaPuzzle(demo);
    refresh();
    setActivePuzzle(demo);
    triggerHaptic('light');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      let puzzle: TarsiaPuzzle | null = null;

      if (file.name.endsWith('.txt')) {
        const pairs = parseTarsiaTxtFile(text);
        if (pairs.length > 0) {
          puzzle = {
            id: generateTarsiaId('tarsia'),
            title: file.name.replace(/\.[^.]+$/, '') || 'Импортированный пазл',
            shape: 'triangle',
            pairs,
            puzzleTitle: 'Соедини вопрос с ответом',
            solutionTitle: 'Решение',
            showSolution: true,
            cardSize: 'medium',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
        }
      } else {
        puzzle = parseTarsiaPuzzleFile(text);
      }

      if (puzzle) {
        upsertTarsiaPuzzle(puzzle);
        refresh();
        setActivePuzzle(puzzle);
        setImportMsg('ok');
      } else {
        setImportMsg('error');
      }
      setTimeout(() => setImportMsg(null), 2500);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportJSON = (puzzle: TarsiaPuzzle) => {
    const blob = new Blob([serializeTarsiaPuzzle(puzzle)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `тарсия_${puzzle.title}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerHaptic('light');
  };

  const handleRenamePuzzle = (id: string, newName: string) => {
    renameTarsiaPuzzle(id, newName);
    refresh();
    if (activePuzzle?.id === id) {
      setActivePuzzle({ ...activePuzzle, title: newName });
    }
  };

  const handleDeletePuzzle = (id: string) => {
    deleteTarsiaPuzzle(id);
    refresh();
    if (activePuzzle?.id === id) setActivePuzzle(null);
    triggerHaptic('light');
  };

  const handleSavePuzzle = () => {
    if (!activePuzzle) return;
    upsertTarsiaPuzzle(activePuzzle);
    refresh();
    triggerHaptic('light');
  };

  const handleAddPair = () => {
    if (!activePuzzle) return;
    setActivePuzzle({
      ...activePuzzle,
      pairs: [
        ...activePuzzle.pairs,
        { id: generateTarsiaId('pair'), left: '', right: '' },
      ],
    });
  };

  const handleUpdatePair = (pairId: string, field: 'left' | 'right', value: string) => {
    if (!activePuzzle) return;
    setActivePuzzle({
      ...activePuzzle,
      pairs: activePuzzle.pairs.map((p) =>
        p.id === pairId ? { ...p, [field]: value } : p,
      ),
    });
  };

  const handleRemovePair = (pairId: string) => {
    if (!activePuzzle) return;
    setActivePuzzle({
      ...activePuzzle,
      pairs: activePuzzle.pairs.filter((p) => p.id !== pairId),
    });
  };

  const handleShufflePairs = () => {
    if (!activePuzzle || activePuzzle.pairs.length === 0) return;
    const shuffled = [...activePuzzle.pairs].sort(() => Math.random() - 0.5);
    setActivePuzzle({
      ...activePuzzle,
      pairs: shuffled.map((p) => ({ ...p, id: generateTarsiaId('pair') })),
    });
    triggerHaptic('light');
  };

  const validPairsCount = activePuzzle
    ? validateTarsiaPairs(activePuzzle.pairs).length
    : 0;

  const gridInfo = activePuzzle ? getTarsiaGridById(activePuzzle.shape) : null;

  // ===== ЭКРАН РЕДАКТОРА =====
  if (activePuzzle) {
    return (
      <div className="min-h-[100dvh] bg-purple-50 flex flex-col">
        <header className="bg-purple-700 shadow-md sticky top-0 z-10">
          <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
            <BackButton onClick={() => { handleSavePuzzle(); setActivePuzzle(null); }} variant="light" />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white truncate">
                {activePuzzle.title}
              </h1>
              <p className="text-xs text-purple-200">
                пар: {validPairsCount} · {SHAPE_OPTIONS.find((s) => s.id === activePuzzle.shape)?.label}
              </p>
            </div>
            <button
              onClick={handleSavePuzzle}
              className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-3 py-2 text-sm font-semibold flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" /> Сохранить
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-md mx-auto w-full px-5 py-5 space-y-4 pb-8">
          {/* Название */}
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <label className="text-sm font-semibold text-purple-700">Название головоломки</label>
            <input
              type="text"
              value={activePuzzle.title}
              onChange={(e) => setActivePuzzle({ ...activePuzzle, title: e.target.value })}
              className="w-full rounded-xl border border-gray-200 p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Форма */}
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <label className="text-sm font-semibold text-purple-700">Форма головоломки</label>
            <div className="grid grid-cols-2 gap-2">
              {SHAPE_OPTIONS.map((opt) => {
                const Icon = opt.Icon;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setActivePuzzle({ ...activePuzzle, shape: opt.id })}
                    className={`py-3 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-colors ${
                      activePuzzle.shape === opt.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-50 text-purple-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {gridInfo && (
              <p className="text-xs text-gray-500">
                {gridInfo.description} — оптимально пар: {gridInfo.questionCount}
              </p>
            )}
          </div>

          {/* Заголовки */}
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <label className="text-sm font-semibold text-purple-700">Заголовки для печати</label>
            <div>
              <label className="text-xs text-gray-500">Задание</label>
              <input
                type="text"
                value={activePuzzle.puzzleTitle}
                onChange={(e) => setActivePuzzle({ ...activePuzzle, puzzleTitle: e.target.value })}
                className="w-full rounded-xl border border-gray-200 p-2.5 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Решение</label>
              <input
                type="text"
                value={activePuzzle.solutionTitle}
                onChange={(e) => setActivePuzzle({ ...activePuzzle, solutionTitle: e.target.value })}
                className="w-full rounded-xl border border-gray-200 p-2.5 text-sm mt-1"
              />
            </div>
            <label className="flex items-center justify-between gap-2">
              <span className="text-sm text-gray-700">Показывать решение в PDF</span>
              <button
                onClick={() => setActivePuzzle({ ...activePuzzle, showSolution: !activePuzzle.showSolution })}
                className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${activePuzzle.showSolution ? 'bg-purple-600' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${activePuzzle.showSolution ? 'translate-x-5' : ''}`} />
              </button>
            </label>
          </div>

          {/* Размер карточек */}
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <label className="text-sm font-semibold text-purple-700">Размер карточек</label>
            <div className="grid grid-cols-3 gap-2">
              {CARD_SIZES.map((size) => (
                <button
                  key={size.id}
                  onClick={() => setActivePuzzle({ ...activePuzzle, cardSize: size.id })}
                  className={`py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                    activePuzzle.cardSize === size.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-50 text-purple-700'
                  }`}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>

          {/* Пары */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-purple-700">
                Пары «Вопрос — Ответ» ({validPairsCount})
              </label>
              <button
                onClick={handleShufflePairs}
                className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                aria-label="Перемешать пары"
                title="Перемешать пары"
              >
                ↻
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {activePuzzle.pairs.map((pair, index) => (
                <div key={pair.id} className="flex gap-2 items-start">
                  <span className="text-xs font-bold text-purple-400 pt-3 w-6 shrink-0">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={pair.left}
                    onChange={(e) => handleUpdatePair(pair.id, 'left', e.target.value)}
                    placeholder="Вопрос"
                    className="flex-1 rounded-lg border border-gray-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <span className="text-gray-400 pt-3">→</span>
                  <input
                    type="text"
                    value={pair.right}
                    onChange={(e) => handleUpdatePair(pair.id, 'right', e.target.value)}
                    placeholder="Ответ"
                    className="flex-1 rounded-lg border border-gray-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <button
                    onClick={() => handleRemovePair(pair.id)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors mt-1"
                    aria-label="Удалить пару"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleAddPair}
              className="w-full mt-3 py-2.5 rounded-xl border-2 border-dashed border-purple-300 text-purple-600 font-semibold text-sm flex items-center justify-center gap-1.5 hover:bg-purple-50 transition-colors"
            >
              <Plus className="w-4 h-4" /> Добавить пару
            </button>
          </div>

          {/* Экспорт */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => exportTarsiaToPDF(activePuzzle)}
              disabled={validPairsCount === 0}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <FileText className="w-5 h-5" /> Скачать PDF
            </button>
            <button
              onClick={() => handleExportJSON(activePuzzle)}
              disabled={validPairsCount === 0}
              className="bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-800 font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Download className="w-5 h-5" /> Экспорт JSON
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ===== ЭКРАН СПИСКА =====
  return (
    <div className="min-h-[100dvh] notebook-bg flex flex-col">
      <header className="bg-purple-700 shadow-md sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Тарсия пазлы</h1>
            <p className="text-xs text-purple-200">Геометрические головоломки</p>
          </div>
          <Triangle className="w-6 h-6 text-white/70" />
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-5 py-5 space-y-4 pb-8">
        {/* Кнопки */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleCreate}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5" /> Создать
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Upload className="w-5 h-5" /> Импорт
          </button>
        </div>

        <button
          onClick={handleLoadDemo}
          className="w-full bg-gradient-to-r from-amber-100 to-orange-100 border-2 border-orange-300 text-orange-800 font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <Sparkles className="w-5 h-5" /> Загрузить демо: «Окружающий мир»
        </button>

        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json,.txt,text/plain"
          className="hidden"
          onChange={handleImportFile}
        />

        {importMsg === 'ok' && (
          <p className="text-sm font-semibold text-green-600 flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Головоломка импортирована
          </p>
        )}
        {importMsg === 'error' && (
          <p className="text-sm font-semibold text-red-600 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> Не удалось прочитать файл
          </p>
        )}

        {/* Мои пазлы */}
        {puzzles.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">
              Пока нет головоломок. Создайте свою или загрузите демо!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <h3 className="font-semibold text-purple-700 text-sm">Мои пазлы ({puzzles.length})</h3>
            {puzzles.map((puzzle) => (
              <div key={puzzle.id} className="border-2 border-purple-100 rounded-xl p-3 flex items-center gap-2 bg-white">
                <button
                  onClick={() => setActivePuzzle(puzzle)}
                  className="flex-1 min-w-0 text-left"
                >
                  <h4 className="font-semibold text-gray-800 text-sm truncate">{puzzle.title}</h4>
                  <p className="text-xs text-gray-500">
                    {SHAPE_OPTIONS.find((s) => s.id === puzzle.shape)?.label} · пар: {validateTarsiaPairs(puzzle.pairs).length} ·{' '}
                    {new Date(puzzle.updatedAt).toLocaleDateString('ru-RU')}
                  </p>
                </button>
                <button
                  onClick={() => handleExportJSON(puzzle)}
                  className="p-2 text-gray-300 hover:text-green-600 transition-colors"
                  aria-label="Экспорт JSON"
                  title="Экспорт JSON"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const newName = window.prompt('Новое название:', puzzle.title);
                    if (newName && newName.trim()) handleRenamePuzzle(puzzle.id, newName);
                  }}
                  className="p-2 text-gray-300 hover:text-purple-600 transition-colors"
                  aria-label="Переименовать"
                  title="Переименовать"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeletePuzzle(puzzle.id)}
                  className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                  aria-label="Удалить"
                  title="Удалить"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Инструкции */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowHow(!showHow)}
            className="w-full px-5 py-4 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-700">Как пользоваться</h3>
              <span className="text-xs font-bold text-purple-400">{HOW_ITEMS.length}</span>
            </div>
            {showHow ? <ChevronUp className="w-5 h-5 text-purple-600" /> : <ChevronDown className="w-5 h-5 text-purple-600" />}
          </button>
          {showHow && (
            <div className="px-5 pb-5 space-y-2">
              {HOW_ITEMS.map((item, idx) => (
                <div key={idx} className="border border-purple-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenHow(openHow === idx ? null : idx)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-purple-50"
                  >
                    <span className="font-semibold text-sm text-gray-800">{item.q}</span>
                    {openHow === idx ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />}
                  </button>
                  {openHow === idx && (
                    <div className="px-4 pb-3 pt-1 text-sm text-gray-600 bg-purple-50/50 whitespace-pre-line">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Вопросы и сценарии */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowFaq(!showFaq)}
            className="w-full px-5 py-4 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-700">Вопросы и сценарии</h3>
              <span className="text-xs font-bold text-purple-400">{FAQ_ITEMS.length}</span>
            </div>
            {showFaq ? <ChevronUp className="w-5 h-5 text-purple-600" /> : <ChevronDown className="w-5 h-5 text-purple-600" />}
          </button>
          {showFaq && (
            <div className="px-5 pb-5 space-y-2">
              {FAQ_ITEMS.map((item, idx) => (
                <div key={idx} className="border border-purple-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-purple-50"
                  >
                    <span className="font-semibold text-sm text-gray-800">{item.q}</span>
                    {openFaq === idx ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />}
                  </button>
                  {openFaq === idx && (
                    <div className="px-4 pb-3 pt-1 text-sm text-gray-600 bg-purple-50/50 whitespace-pre-line">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
