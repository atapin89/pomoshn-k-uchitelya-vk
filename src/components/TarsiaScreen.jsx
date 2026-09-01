import { useState } from 'react'
import {
  Triangle as TriangleIcon,
  Hexagon,
  Plus,
  Upload,
  Download,
  Pencil,
  Trash2,
  Save,
  Sparkles,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Shuffle,
} from 'lucide-react'
import grids from '@/data/grids'
import PreviewSvgDiv from '@/components/PreviewSvgDiv'
import PrintableSvgDiv from '@/components/PrintableSvgDiv'
import QuestionAnswer from '@/components/QuestionAnswer'
import { shuffeArray } from '@/utils/shuffeArray'
import { saveToFile, loadFromFile } from '@/utils/saveLoadExport'
import BackButton from '@/components/BackButton'
import { triggerHaptic } from '@/lib/haptic'

const STORAGE_KEY = 'tarsia-puzzles'

const GRID_OPTIONS = [
  { id: 'smallTriangleGrid', label: 'Треуг. мал.', Icon: TriangleIcon },
  { id: 'triangleGrid', label: 'Треуг. бол.', Icon: TriangleIcon },
  { id: 'smallHexGrid', label: 'Шест. мал.', Icon: Hexagon },
  { id: 'hexGrid', label: 'Шест. бол.', Icon: Hexagon },
]

const HOW_ITEMS = [
  { q: 'Как создать пазл', a: 'Нажмите «Создать», введите пары «вопрос → ответ» (до 15 символов). Количество пар фиксировано формой: у каждой грани своё место. Пазл сохраняется автоматически при выходе из редактора.' },
  { q: 'Предпросмотр и печать', a: 'В редакторе видно живой предпросмотр фигуры. Кнопки «PDF» у блоков «Решение» и «Вырезалка» скачивают готовые листы для печати.' },
  { q: 'Импорт и экспорт', a: '«Импорт» принимает .json (пазлы коллег) и .txt (пары «вопрос\tответ» по строкам). «Экспорт JSON» скачивает файл для обмена.' },
  { q: 'Сценарии на уроке', a: 'Малый треугольник — разминка 5–10 мин. Большой треугольник и шестиугольники — повторение и командная работа 20–40 мин.' },
]

function requiredPairs(grid) {
  let max = 0
  grid.forEach((t) =>
    t.values.forEach((v) => {
      if (v) {
        const n = parseInt(v, 10)
        if (n > max) max = n
      }
    }),
  )
  return max
}

function makePairs(n, source) {
  return Array.from({ length: n }, (_, i) => ({
    id: `p-${Date.now()}-${i}`,
    left: source?.[i]?.left || '',
    right: source?.[i]?.right || '',
  }))
}

function loadPuzzles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter((p) => p && p.id && Array.isArray(p.pairs)) : []
  } catch {
    return []
  }
}

function persistPuzzles(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // ignore
  }
}

function createPuzzle(gridName, pairsSource, title) {
  return {
    id: `tarsia-${Date.now()}`,
    title: title || 'Новый пазл',
    gridName,
    pairs: makePairs(requiredPairs(grids[gridName]), pairsSource),
    puzzleTitle: 'Соедини вопрос с ответом',
    solutionTitle: 'Решение',
    showSolution: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

const DEMO_PAIRS = [
  { left: 'Столица России', right: 'Москва' },
  { left: 'Самая длинная река', right: 'Обь' },
  { left: 'Глубокое озеро', right: 'Байкал' },
  { left: 'Высочайшая гора', right: 'Эверест' },
  { left: 'Наш материк', right: 'Евразия' },
  { left: 'Океан на востоке', right: 'Тихий' },
  { left: 'Крупнейшая страна', right: 'Россия' },
  { left: 'Озеро-море', right: 'Каспийское' },
  { left: 'Вулкан Камчатки', right: 'Ключевская' },
  { left: 'Город на Неве', right: 'Санкт-Петербург' },
  { left: 'Река-матушка', right: 'Волга' },
]

export default function TarsiaScreen({ onBack }) {
  const [puzzles, setPuzzles] = useState(() => loadPuzzles())
  const [active, setActive] = useState(null)
  const [importMsg, setImportMsg] = useState(null)
  const [showHelp, setShowHelp] = useState(false)
  const [openHelp, setOpenHelp] = useState(null)

  const refresh = (list) => {
    persistPuzzles(list)
    setPuzzles(list)
  }

  const upsert = (puzzle) => {
    const next = { ...puzzle, updatedAt: Date.now() }
    const list = puzzles.some((p) => p.id === next.id)
      ? puzzles.map((p) => (p.id === next.id ? next : p))
      : [...puzzles, next]
    refresh(list)
    return next
  }

  const handleCreate = () => {
    const puzzle = createPuzzle('smallTriangleGrid')
    upsert(puzzle)
    setActive(puzzle)
    triggerHaptic('light')
  }

  const handleDemo = () => {
    const puzzle = createPuzzle('smallTriangleGrid', DEMO_PAIRS, 'Окружающий мир (демо)')
    upsert(puzzle)
    setActive(puzzle)
    triggerHaptic('light')
  }

  const handleImport = async () => {
    try {
      const data = await loadFromFile()
      let puzzle
      if (data.format === 'txt') {
        puzzle = createPuzzle('smallTriangleGrid', data.pairs, 'Импортированный пазл')
      } else {
        const gridName = grids[data.gridName] ? data.gridName : 'smallTriangleGrid'
        puzzle = {
          ...createPuzzle(gridName, data.pairs, data.title || 'Импортированный пазл'),
          puzzleTitle: data.puzzleTitle || 'Соедини вопрос с ответом',
          solutionTitle: data.solutionTitle || 'Решение',
          showSolution: data.showSolution !== false,
        }
      }
      if (puzzle && puzzle.pairs.some((p) => p.left.trim() && p.right.trim())) {
        upsert(puzzle)
        setActive(puzzle)
        setImportMsg('ok')
      } else {
        setImportMsg('error')
      }
    } catch {
      setImportMsg('error')
    }
    setTimeout(() => setImportMsg(null), 2500)
  }

  const handleExportJSON = (puzzle) => {
    saveToFile(puzzle, `тарсия_${puzzle.title}.json`)
    triggerHaptic('light')
  }

  const handleRename = (id) => {
    const puzzle = puzzles.find((p) => p.id === id)
    if (!puzzle) return
    const newName = window.prompt('Новое название:', puzzle.title)
    if (newName && newName.trim()) {
      upsert({ ...puzzle, title: newName.trim() })
    }
  }

  const handleDelete = (id) => {
    refresh(puzzles.filter((p) => p.id !== id))
    if (active?.id === id) setActive(null)
    triggerHaptic('light')
  }

  const handleBackFromEditor = () => {
    if (active) upsert(active)
    setActive(null)
  }

  const changeGrid = (gridName) => {
    setActive((a) => ({ ...a, gridName, pairs: makePairs(requiredPairs(grids[gridName]), a.pairs) }))
  }

  const updatePair = (i, field, value) => {
    setActive((a) => {
      const pairs = [...a.pairs]
      pairs[i] = { ...pairs[i], [field]: value }
      return { ...a, pairs }
    })
  }

  const shufflePairs = () => {
    setActive((a) => ({ ...a, pairs: shuffeArray(a.pairs) }))
    triggerHaptic('light')
  }

  // ===== ЭКРАН РЕДАКТОРА =====
  if (active) {
    const grid = grids[active.gridName]
    const required = requiredPairs(grid)
    const valid = active.pairs.filter((p) => p.left.trim() && p.right.trim()).length

    return (
      <div className="min-h-[100dvh] bg-purple-50 flex flex-col">
        <header className="bg-purple-700 shadow-md sticky top-0 z-10">
          <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
            <BackButton onClick={handleBackFromEditor} variant="light" />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white truncate">{active.title}</h1>
              <p className="text-xs text-purple-200">пар: {valid} из {required}</p>
            </div>
            <button
              onClick={() => { upsert(active); triggerHaptic('light') }}
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
              value={active.title}
              onChange={(e) => setActive({ ...active, title: e.target.value })}
              className="w-full rounded-xl border border-gray-200 p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Форма */}
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <label className="text-sm font-semibold text-purple-700">Форма головоломки</label>
            <div className="grid grid-cols-2 gap-2">
              {GRID_OPTIONS.map((opt) => {
                const Icon = opt.Icon
                return (
                  <button
                    key={opt.id}
                    onClick={() => changeGrid(opt.id)}
                    className={`py-3 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-colors ${
                      active.gridName === opt.id ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {opt.label}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-gray-500">Пар для этой формы: {required}</p>
          </div>

          {/* Заголовки и решение */}
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <label className="text-sm font-semibold text-purple-700">Заголовки для печати</label>
            <div>
              <label className="text-xs text-gray-500">Задание</label>
              <input
                type="text"
                value={active.puzzleTitle}
                onChange={(e) => setActive({ ...active, puzzleTitle: e.target.value })}
                className="w-full rounded-xl border border-gray-200 p-2.5 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Решение</label>
              <input
                type="text"
                value={active.solutionTitle}
                onChange={(e) => setActive({ ...active, solutionTitle: e.target.value })}
                className="w-full rounded-xl border border-gray-200 p-2.5 text-sm mt-1"
              />
            </div>
            <label className="flex items-center justify-between gap-2">
              <span className="text-sm text-gray-700">Показывать решение</span>
              <button
                onClick={() => setActive({ ...active, showSolution: !active.showSolution })}
                className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${active.showSolution ? 'bg-purple-600' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${active.showSolution ? 'translate-x-5' : ''}`} />
              </button>
            </label>
          </div>

          {/* Пары */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-purple-700">
                Пары «Вопрос → Ответ» · до 15 символов
              </label>
              <button
                onClick={shufflePairs}
                className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                aria-label="Перемешать пары"
                title="Перемешать пары"
              >
                <Shuffle className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {active.pairs.map((pair, idx) => (
                <QuestionAnswer
                  key={pair.id}
                  index={idx}
                  question={pair}
                  onChange={updatePair}
                />
              ))}
            </div>
          </div>

          {/* Предпросмотр */}
          <PreviewSvgDiv gridName={active.gridName} grid={grid} questions={active.pairs} />

          {/* Печать */}
          {active.showSolution && (
            <PrintableSvgDiv
              gridName={active.gridName}
              grid={grid}
              questions={active.pairs}
              title={active.solutionTitle}
              isSolution={true}
            />
          )}
          <PrintableSvgDiv
            gridName={active.gridName}
            grid={grid}
            questions={active.pairs}
            title={active.puzzleTitle}
            isSolution={false}
          />

          {/* Экспорт JSON */}
          <button
            onClick={() => handleExportJSON(active)}
            disabled={valid === 0}
            className="w-full bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-800 font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Download className="w-5 h-5" /> Экспорт JSON
          </button>
        </main>
      </div>
    )
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
          <TriangleIcon className="w-6 h-6 text-white/70" />
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-5 py-5 space-y-4 pb-8">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleCreate}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5" /> Создать
          </button>
          <button
            onClick={handleImport}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Upload className="w-5 h-5" /> Импорт
          </button>
        </div>

        <button
          onClick={handleDemo}
          className="w-full bg-gradient-to-r from-amber-100 to-orange-100 border-2 border-orange-300 text-orange-800 font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <Sparkles className="w-5 h-5" /> Демо: «Окружающий мир»
        </button>

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

        {puzzles.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">Пока нет головоломок. Создайте свою или загрузите демо!</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h3 className="font-semibold text-purple-700 text-sm">Мои пазлы ({puzzles.length})</h3>
            {puzzles.map((puzzle) => (
              <div key={puzzle.id} className="border-2 border-purple-100 rounded-xl p-3 flex items-center gap-2 bg-white">
                <button onClick={() => setActive(puzzle)} className="flex-1 min-w-0 text-left">
                  <h4 className="font-semibold text-gray-800 text-sm truncate">{puzzle.title}</h4>
                  <p className="text-xs text-gray-500">
                    {GRID_OPTIONS.find((g) => g.id === puzzle.gridName)?.label} · пар:{' '}
                    {puzzle.pairs.filter((p) => p.left.trim() && p.right.trim()).length} ·{' '}
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
                  onClick={() => handleRename(puzzle.id)}
                  className="p-2 text-gray-300 hover:text-purple-600 transition-colors"
                  aria-label="Переименовать"
                  title="Переименовать"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(puzzle.id)}
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
            onClick={() => setShowHelp(!showHelp)}
            className="w-full px-5 py-4 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-700">Как пользоваться</h3>
              <span className="text-xs font-bold text-purple-400">{HOW_ITEMS.length}</span>
            </div>
            {showHelp ? <ChevronUp className="w-5 h-5 text-purple-600" /> : <ChevronDown className="w-5 h-5 text-purple-600" />}
          </button>
          {showHelp && (
            <div className="px-5 pb-5 space-y-2">
              {HOW_ITEMS.map((item, idx) => (
                <div key={idx} className="border border-purple-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenHelp(openHelp === idx ? null : idx)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-purple-50"
                  >
                    <span className="font-semibold text-sm text-gray-800">{item.q}</span>
                    {openHelp === idx ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />}
                  </button>
                  {openHelp === idx && (
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
  )
}
