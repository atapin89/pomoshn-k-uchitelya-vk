// src/components/TarsiaScreen.tsx

import { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Upload,
  Download,
  Save,
  Trash2,
  Pencil,
  Check,
  AlertTriangle,
  HelpCircle,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Shuffle,
  FileImage,
  FileText,
  Triangle,
  Hexagon,
  LayoutGrid,
  List,
} from 'lucide-react';
import type { TarsiaPuzzle, TarsiaPair, TarsiaShape } from '@/types/tarsia';
import {
  SHAPE_LABELS,
  CARD_SIZES,
  generateTarsiaId,
  createEmptyTarsiaPair,
  createEmptyTarsiaPuzzle,
  validateTarsiaPairs,
} from '@/types/tarsia';
import {
  loadTarsiaPuzzles,
  upsertTarsiaPuzzle,
  deleteTarsiaPuzzle,
  renameTarsiaPuzzle,
  serializeTarsiaPuzzle,
  parseTarsiaPuzzleFile,
  parseTarsiaTxtFile,
  exportTarsiaTxt,
} from '@/lib/tarsiaStorage';
import { exportTarsiaToPDF, exportTarsiaToPNG } from '@/lib/tarsiaPdf';
import { downloadTextFile, sanitizeFileName } from '@/lib/eduGameStorage';
import { triggerHaptic } from '@/lib/haptic';
import BackButton from './BackButton';

interface TarsiaScreenProps {
  onBack: () => void;
}

const SHAPE_ICONS: Record<TarsiaShape, typeof Triangle> = {
  triangle: Triangle,
  hexagon: Hexagon,
  domino: LayoutGrid,
};

const HOW_ITEMS = [
  {
    q: 'Что такое Тарсия',
    a: 'Тарсия — это образовательная головоломка. Ученикам раздаются карточки в виде треугольников, шестиугольников или домино. На гранях написаны вопросы и ответы. Задача — собрать цельную фигуру, совмещая грани так, чтобы вопрос совпадал с ответом.',
  },
  {
    q: 'Как создать головоломку',
    a: '1) Выберите форму (треугольник, шестиугольник, домино).\n2) Введите пары «Вопрос — Ответ» в таблицу.\n3) Настройте заголовки и размер карточек.\n4) Нажмите «Скачать PDF» или «Скачать PNG».\n\nВ PDF будет две страницы: перемешанное задание и решение.',
  },
  {
    q: 'Формат ввода пар',
    a: 'Каждая строка таблицы — одна пара:\n• Левая колонка — вопрос или задание\n• Правая колонка — ответ или соответствие\n\nПример:\n2+2 | 4\nСтолица Франции | Париж\nH2O | Вода',
  },
  {
    q: 'Импорт из текстового файла',
    a: 'Поддерживается .txt файл. Каждая строка — одна пара. Разделители: табуляция, «=», «|», «;» или « - ».\n\nПример:\nСтолица России = Москва\n5×7 | 35\nКислород - O2',
  },
  {
    q: 'Сохранение и обмен',
    a: 'Сохраняйте готовые головоломки в «Моих пазлах». Экспорт .json — для обмена с коллегами. Импорт .json — восстановление на другом устройстве.\n\nЭкспорт .txt — сохранение пар в простом текстовом формате.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Сценарий 1 · Математика: устный счёт',
    a: 'Создайте головоломку с примерами: «15+27» → «42». Ученики собирают треугольник, решая примеры. Самопроверка: фигура не сойдётся, если есть ошибка.',
  },
  {
    q: 'Сценарий 2 · Иностранный язык: перевод',
    a: 'Пары: «Apple» → «Яблоко». Ученики сопоставляют английские слова с русскими. Форма домино идеальна для парных карточек.',
  },
  {
    q: 'Сценарий 3 · История: даты и события',
    a: 'Пары: «1812 год» → «Бородинское сражение». Шестиугольная форма позволяет собрать большую «соту» из 18+ карточек.',
  },
  {
    q: 'Сценарий 4 · Химия: формулы',
    a: 'Пары: «H2O» → «Вода». Ученики сопоставляют формулы с названиями. Треугольная форма — классика для такой головоломки.',
  },
  {
    q: 'Сценарий 5 · Групповая работа',
    a: 'Раздайте одну головоломку на группу из 3-4 учеников. Они обсуждают и собирают фигуру вместе. Побеждает группа, собравшая первой.',
  },
  {
    q: 'Как хранить наборы',
    a: 'Печатайте на цветной бумаге — разные цвета для разных тем. Храните в конвертах с названием. Наклейки с номером набора на обратной стороне каждой карточки.',
  },
];

export default function TarsiaScreen({ onBack }: TarsiaScreenProps) {
  const [puzzles, setPuzzles] = useState<TarsiaPuzzle[]>([]);
  const [activePuzzle, setActivePuzzle] = useState<TarsiaPuzzle | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [importMsg, setImportMsg] = useState<'ok' | 'error' | null>(null);
  const [showHow, setShowHow] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [openHow, setOpenHow] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPuzzles(loadTarsiaPuzzles());
  }, []);

  const refreshPuzzles = () => setPuzzles(loadTarsiaPuzzles());

  const handleCreatePuzzle = () => {
    const puzzle = createEmptyTarsiaPuzzle('Новая головоломка');
    upsertTarsiaPuzzle(puzzle);
    refreshPuzzles();
    setActivePuzzle(puzzle);
    triggerHaptic('light');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      
      // Пробуем JSON
      let puzzle = parseTarsiaPuzzleFile(text);
      
      // Если не JSON — пробуем TXT
      if (!puzzle) {
        const pairs = parseTarsiaTxtFile(text);
        if (pairs.length > 0) {
          puzzle = createEmptyTarsiaPuzzle(file.name.replace(/\.[^.]+$/, ''));
          puzzle.pairs = pairs;
        }
      }
      
      if (puzzle) {
        upsertTarsiaPuzzle(puzzle);
        refreshPuzzles();
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
    downloadTextFile(
      sanitizeFileName(`тарсия_${puzzle.title}.json`),
      serializeTarsiaPuzzle(puzzle),
      'application/json;charset=utf-8',
    );
    triggerHaptic('light');
  };

  const handleExportTXT = (puzzle: TarsiaPuzzle) => {
    downloadTextFile(
      sanitizeFileName(`тарсия_${puzzle.title}.txt`),
      exportTarsiaTxt(puzzle.pairs),
      'text/plain;charset=utf-8',
    );
    triggerHaptic('light');
  };

  const handleDeletePuzzle = (id: string) => {
    const puzzle = puzzles.find((p) => p.id === id);
    const proceed = window.confirm(`Удалить головоломку «${puzzle?.title}»?`);
    if (!proceed) return;
    deleteTarsiaPuzzle(id);
    refreshPuzzles();
    if (activePuzzle?.id === id) setActivePuzzle(null);
  };

  const handleRenamePuzzle = (id: string, newName: string) => {
    if (!newName.trim()) return;
    renameTarsiaPuzzle(id, newName.trim());
    refreshPuzzles();
    if (activePuzzle?.id === id) {
      setActivePuzzle({ ...activePuzzle, title: newName.trim() });
    }
  };

  const handleSavePuzzle = () => {
    if (!activePuzzle) return;
    const validPairs = validateTarsiaPairs(activePuzzle.pairs);
    if (validPairs.length === 0) {
      alert('Добавьте хотя бы одну пару «Вопрос — Ответ»');
      return;
    }
    upsertTarsiaPuzzle(activePuzzle);
    refreshPuzzles();
    triggerHaptic('heavy');
    alert('Головоломка сохранена!');
  };

  const handleUpdatePair = (pairId: string, field: 'left' | 'right', value: string) => {
    if (!activePuzzle) return;
    setActivePuzzle({
      ...activePuzzle,
      pairs: activePuzzle.pairs.map((p) =>
        p.id === pairId ? { ...p, [field]: value } : p,
      ),
      updatedAt: Date.now(),
    });
  };

  const handleAddPair = () => {
    if (!activePuzzle) return;
    setActivePuzzle({
      ...activePuzzle,
      pairs: [...activePuzzle.pairs, createEmptyTarsiaPair()],
    });
    triggerHaptic('light');
  };

  const handleRemovePair = (pairId: string) => {
    if (!activePuzzle) return;
    if (activePuzzle.pairs.length <= 3) {
      alert('Минимум 3 пары');
      return;
    }
    setActivePuzzle({
      ...activePuzzle,
      pairs: activePuzzle.pairs.filter((p) => p.id !== pairId),
    });
  };

  const handleShufflePairs = () => {
    if (!activePuzzle) return;
    setActivePuzzle({
      ...activePuzzle,
      pairs: [...activePuzzle.pairs].sort(() => Math.random() - 0.5),
    });
    triggerHaptic('medium');
  };

  const validPairsCount = activePuzzle
    ? validateTarsiaPairs(activePuzzle.pairs).length
    : 0;

  // ===== ЭКРАН РЕДАКТОРА =====
  if (activePuzzle) {
    return (
      <div className="min-h-[100dvh] bg-purple-50 flex flex-col">
        <header className="bg-purple-700 shadow-md sticky top-0 z-10">
          <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
            <BackButton onClick={() => setActivePuzzle(null)} variant="light" />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white truncate">{activePuzzle.title}</h1>
              <p className="text-xs text-purple-200">
                пар: {validPairsCount} · {SHAPE_LABELS[activePuzzle.shape]}
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
            <div className="grid grid-cols-3 gap-2">
              {(['triangle', 'hexagon', 'domino'] as TarsiaShape[]).map((shape) => {
                const Icon = SHAPE_ICONS[shape];
                return (
                  <button
                    key={shape}
                    onClick={() => setActivePuzzle({ ...activePuzzle, shape })}
                    className={`py-3 rounded-xl flex flex-col items-center gap-1 font-semibold text-sm transition-colors ${
                      activePuzzle.shape === shape
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-50 text-purple-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {SHAPE_LABELS[shape]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Заголовки */}
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <label className="text-sm font-semibold text-purple-700">Заголовки для печати</label>
            <div>
              <label className="text-xs text-gray-500">Заголовок задания</label>
              <input
                type="text"
                value={activePuzzle.puzzleTitle}
                onChange={(e) => setActivePuzzle({ ...activePuzzle, puzzleTitle: e.target.value })}
                className="w-full rounded-xl border border-gray-200 p-2.5 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Заголовок решения</label>
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
                  onClick={() => setActivePuzzle({ ...activePuzzle, cardSize: size.id as any })}
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
                aria-label="Перемешать"
                title="Перемешать пары"
              >
                <Shuffle className="w-4 h-4" />
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

          {/* Кнопки экспорта */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => exportTarsiaToPDF(activePuzzle)}
              disabled={validPairsCount === 0}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <FileText className="w-5 h-5" /> Скачать PDF
            </button>
            <button
              onClick={() => exportTarsiaToPNG(activePuzzle)}
              disabled={validPairsCount === 0}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <FileImage className="w-5 h-5" /> Скачать PNG
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
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">Тарсия пазлы</h1>
            <p className="text-xs text-purple-200">Генератор головоломок</p>
          </div>
          <Triangle className="w-6 h-6 text-white/70" />
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-5 py-5 space-y-4 pb-8">
        {/* Кнопки */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleCreatePuzzle}
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

        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json,.txt,text/plain"
          className="hidden"
          onChange={handleImportFile}
        />

        {importMsg === 'ok' && (
          <p className="text-sm font-semibold text-green-600 flex items-center gap-1.5" role="alert">
            <Check className="w-4 h-4" /> Головоломка импортирована
          </p>
        )}
        {importMsg === 'error' && (
          <p className="text-sm font-semibold text-red-600 flex items-center gap-1.5" role="alert">
            <AlertTriangle className="w-4 h-4" /> Не удалось прочитать файл
          </p>
        )}

        {/* Мои пазлы */}
        {puzzles.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">Пока нет головоломок. Создайте первую!</p>
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
                    {SHAPE_LABELS[puzzle.shape]} · пар: {validateTarsiaPairs(puzzle.pairs).length} ·{' '}
                    {new Date(puzzle.updatedAt).toLocaleDateString('ru-RU')}
                  </p>
                </button>
                <button
                  onClick={() => exportTarsiaToPDF(puzzle)}
                  className="p-2 text-gray-300 hover:text-purple-600 transition-colors"
                  aria-label="Скачать PDF"
                  title="Скачать PDF"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => exportTarsiaToPNG(puzzle)}
                  className="p-2 text-gray-300 hover:text-purple-600 transition-colors"
                  aria-label="Скачать PNG"
                  title="Скачать PNG"
                >
                  <FileImage className="w-4 h-4" />
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
                    {openHow === idx ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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

        {/* Вопросы */}
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
                    {openFaq === idx ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
