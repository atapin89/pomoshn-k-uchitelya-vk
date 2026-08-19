import { useEffect, useMemo, useRef, useState } from 'react';
import {
  UserPlus,
  Users,
  LayoutGrid,
  Shuffle,
  Copy,
  Share2,
  Check,
  Dices,
  Download,
  Upload,
  Save,
  Trash2,
  HelpCircle,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Pencil,
  AlertTriangle,
} from 'lucide-react';
import BackButton from './BackButton';
import { triggerHaptic } from '@/lib/haptic';
import {
  parseStudents,
  shuffle,
  alternateByGender,
  loadSavedLists,
  saveSavedLists,
  type SavedList,
} from '@/lib/students';

const STORAGE_KEY = 'generator-class-list';
const GENDER_KEY = 'generator-consider-gender';

type Mode = 'one' | 'groups' | 'seating';

function shuffleArr<T>(arr: T[]): T[] {
  return shuffle(arr);
}

function loadListText(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export default function GeneratorScreen({ onBack }: { onBack: () => void }) {
  const [text, setText] = useState(loadListText());
  const [mode, setMode] = useState<Mode>('one');

  // roulette
  const [rouletteName, setRouletteName] = useState('???');
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState('');

  const [copied, setCopied] = useState(false);

  // groups
  const [groupCount, setGroupCount] = useState(2);
  const [groups, setGroups] = useState<string[][]>([]);

  // seating
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(4);
  const [seating, setSeating] = useState<string[]>([]);
  const [considerGender, setConsiderGender] = useState(() => {
    try {
      return localStorage.getItem(GENDER_KEY) === '1';
    } catch {
      return false;
    }
  });

  // saved lists
  const [savedLists, setSavedLists] = useState<SavedList[]>([]);
  const [listName, setListName] = useState('');
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [savedFlag, setSavedFlag] = useState(false);

  // accordions
  const [showHow, setShowHow] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [openHow, setOpenHow] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSavedLists(loadSavedLists());
  }, []);

  const students = useMemo(() => parseStudents(text), [text]);
  const boysCount = students.filter((s) => s.gender === 'm').length;
  const girlsCount = students.filter((s) => s.gender === 'f').length;
  const noGenderCount = students.length - boysCount - girlsCount;

  const handleSaveListText = () => {
    try {
      localStorage.setItem(STORAGE_KEY, text);
    } catch {
      // ignore
    }
    triggerHaptic('medium');
  };

  const handleClearList = () => {
    setText('');
    setGroups([]);
    setSeating([]);
    setWinner('');
    setEditingListId(null);
    setListName('');
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // ===== ИМПОРТ / ЭКСПОРТ / КОПИРОВАНИЕ =====
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result || ''));
      setListName(file.name.replace(/\.[^.]+$/, ''));
      setEditingListId(null);
      triggerHaptic('light');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportFile = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${listName.trim() || 'список_класса'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerHaptic('light');
  };

  const copyText = (t: string) => {
    navigator.clipboard
      .writeText(t)
      .then(() => {
        setCopied(true);
        triggerHaptic('light');
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };

  const handleShare = async (textToShare: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Список класса', text: textToShare });
        triggerHaptic('light');
      } catch {
        copyText(textToShare);
      }
    } else {
      copyText(textToShare);
    }
  };

  // ===== СОХРАНЁННЫЕ СПИСКИ =====
  const refreshLists = () => setSavedLists(loadSavedLists());

  const handleSaveNamedList = () => {
    if (!text.trim()) return;
    const now = Date.now();
    const lists = loadSavedLists();
    if (editingListId) {
      saveSavedLists(
        lists.map((l) =>
          l.id === editingListId
            ? { ...l, name: listName.trim() || l.name, text, updatedAt: now }
            : l,
        ),
      );
    } else {
      const newList: SavedList = {
        id: `list-${now}-${Math.random().toString(36).slice(2, 7)}`,
        name: listName.trim() || `Список ${lists.length + 1}`,
        text,
        createdAt: now,
        updatedAt: now,
      };
      saveSavedLists([...lists, newList]);
      setEditingListId(newList.id);
    }
    refreshLists();
    setSavedFlag(true);
    setTimeout(() => setSavedFlag(false), 2000);
    triggerHaptic('light');
  };

  const handleLoadList = (l: SavedList) => {
    setText(l.text);
    setListName(l.name);
    setEditingListId(l.id);
    setGroups([]);
    setSeating([]);
    setWinner('');
    window.scrollTo({ top: 0 });
    triggerHaptic('light');
  };

  const handleDeleteList = (id: string) => {
    saveSavedLists(loadSavedLists().filter((l) => l.id !== id));
    if (editingListId === id) setEditingListId(null);
    refreshLists();
  };

  // ===== РЕЖИМЫ =====
  const handlePickOne = () => {
    if (students.length === 0 || isSpinning) return;

    setIsSpinning(true);
    setWinner('');
    triggerHaptic('medium');

    const winnerIndex = Math.floor(Math.random() * students.length);
    const finalWinner = students[winnerIndex].name;

    const extraSpins = 5 * 360;
    const randomOffset = Math.floor(Math.random() * 360);
    setRotation((prev) => prev + extraSpins + randomOffset);

    let spinInterval: ReturnType<typeof setInterval>;
    spinInterval = setInterval(() => {
      setRouletteName(students[Math.floor(Math.random() * students.length)].name);
    }, 50);

    setTimeout(() => {
      clearInterval(spinInterval);
      setRouletteName(finalWinner);
      setWinner(finalWinner);
      setIsSpinning(false);
      triggerHaptic('heavy');
    }, 1500);
  };

  const handleSplitGroups = () => {
    if (students.length === 0) return;
    const n = Math.max(1, Math.min(groupCount, students.length));
    const shuffled = shuffleArr(students);
    const result: string[][] = Array.from({ length: n }, () => []);
    shuffled.forEach((s, i) => result[i % n].push(s.name));
    setGroups(result);
    setWinner('');
    triggerHaptic('medium');
  };

  const handleSeating = () => {
    if (students.length === 0) return;
    const total = Math.max(1, rows * cols);
    const ordered =
      considerGender && students.some((s) => s.gender !== null)
        ? alternateByGender(students)
        : shuffleArr(students);
    const grid: string[] = [];
    for (let i = 0; i < total; i++) {
      grid.push(i < ordered.length ? ordered[i].name : '');
    }
    setSeating(grid);
    setWinner('');
    triggerHaptic('medium');
  };

  const toggleConsiderGender = () => {
    const next = !considerGender;
    setConsiderGender(next);
    try {
      localStorage.setItem(GENDER_KEY, next ? '1' : '0');
    } catch {
      // ignore
    }
  };

  const modeButtons: { id: Mode; label: string; icon: typeof UserPlus }[] = [
    { id: 'one', label: 'Выбрать одного', icon: UserPlus },
    { id: 'groups', label: 'Разделить на группы', icon: Users },
    { id: 'seating', label: 'Случайная рассадка', icon: LayoutGrid },
  ];

  const getGroupsText = () => {
    return groups
      .map((g, i) => `Группа ${i + 1}:\n${g.map((name, j) => `  ${j + 1}. ${name}`).join('\n')}`)
      .join('\n\n');
  };

  const getSeatingText = () => {
    let result = 'Схема рассадки:\n';
    for (let r = 0; r < rows; r++) {
      const rowNames = seating.slice(r * cols, (r + 1) * cols);
      result += `Ряд ${r + 1}: ${rowNames.map((n) => n || 'Свободно').join(' | ')}\n`;
    }
    return result;
  };

  const howItems = [
    {
      q: 'Формат списка и пол учеников',
      a: 'Один ученик на строку. Пол — в скобках или через запятую: «Иван Петров (м)», «Аня Смирнова, ж», «Олег (мальчик)». Без отметки пол не учитывается. Дубликаты убираются автоматически. Счётчик под полем ввода покажет, сколько учеников и полов распознано.',
    },
    {
      q: 'Импорт списка: пошагово',
      a: '1) Подготовьте файл .txt в кодировке UTF-8 (Блокнот, Notes). 2) Каждая строка — один ученик: «Имя Фамилия» или с полом: «Иван Петров (м)». 3) Нажмите «Импорт» и выберите файл. 4) Проверьте счётчик распознанных учеников. Альтернатива: просто вставьте текст списка в поле ввода вручную.',
    },
    {
      q: 'Экспорт списка: пошагово',
      a: '«Экспорт» скачивает текущий список файлом «название.txt» (без названия — «список_класса.txt»); файл попадает в «Загрузки» устройства. «Копир.» кладёт список в буфер обмена для вставки в заметки или мессенджер. Экспорт — это резервная копия и способ перенести список на другое устройство через «Импорт».',
    },
    {
      q: 'Мои списки: сохранить, редактировать, копировать',
      a: 'Введите название (например, «5А») и нажмите «Сохранить». Список появится в «Моих списках». Тап по списку или карандаш — загрузить для редактирования (после правок нажмите «Обновить»). Копирование — список в буфер обмена. Корзина — удалить список безвозвратно.',
    },
    {
      q: 'Рассадка с учётом пола',
      a: 'В режиме «Случайная рассадка» включите «Чередовать мальчиков и девочек» — при наличии отметок пола алгоритм рассадит учеников с максимальным чередованием. Выключите — рассадка полностью случайная. Настройка запоминается.',
    },
    {
      q: 'Три режима жеребьёвки',
      a: '«Выбрать одного» — колесо случайного выбора (справедливый опрос). «Разделить на группы» — равные команды для проектов. «Случайная рассадка» — новая схема мест. Любой результат можно скопировать или отправить.',
    },
  ];

  const faqItems = [
    {
      q: '⚠️ Персональные данные: главное правило',
      a: 'Списки учеников — персональные данные (152-ФЗ). Держите их только на своём устройстве, не отправляйте в общие чаты и открытые облака. На проекторе и в публикациях показывайте только имена без фамилий. Приложение хранит списки локально и никуда не передаёт, но ответственность за содержание списков несёт пользователь. Удаляйте ненужные списки.',
    },
    {
      q: 'Сценарий 1 · Справедливый опрос',
      a: 'Откройте колесо на проекторе и вызывайте учеников случайным выбором. Случайность видна всему классу — никто не обижается, «любимчиков» нет.',
    },
    {
      q: 'Сценарий 2 · Команды за 10 секунд',
      a: 'Перед проектной или лабораторной работой нажмите «Разделить на группы». Нужно иначе — нажмите ещё раз. Результат копируется и отправляется в чат класса.',
    },
    {
      q: 'Сценарий 3 · Рассадка без обид',
      a: 'Новая четверть или «все хотят вместе»? Сгенерируйте случайную рассадку и выведите на проектор. Включите чередование по полу — меньше разговоров на уроке.',
    },
    {
      q: 'Сценарий 4 · Несколько классов и замены',
      a: 'Сохраните списки каждого класса («5А», «5Б»). Переключайтесь в один тап. Экспортируйте файл и передайте коллеге на замену — он загрузит его через «Импорт».',
    },
    {
      q: 'Сколько учеников можно ввести?',
      a: 'Практически до 200 и более. Оптимально 10–40. Если имена повторяются — добавьте фамилию или номер: дубликаты удаляются автоматически.',
    },
    {
      q: 'Где хранятся списки?',
      a: 'Только на вашем устройстве (локально). Для переноса или резервной копии используйте «Экспорт» (файл .txt) и «Импорт» на другом устройстве.',
    },
  ];

  return (
    <div className="min-h-[100dvh] notebook-bg flex flex-col">
      <header className="bg-purple-700 shadow-md sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <div className="shrink-0">
            <BackButton onClick={onBack} variant="light" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h1 className="text-lg font-bold text-white leading-tight truncate">Жеребьёвка</h1>
            <p className="text-xs text-purple-200 leading-tight">Случайный выбор и группы</p>
          </div>
          <div className="shrink-0 w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
            <Dices className="w-5 h-5 text-white" />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-5 py-6 space-y-6 pb-8">
        {/* Предупреждение о персональных данных */}
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 leading-relaxed">
            <p className="font-bold mb-1">Персональные данные детей</p>
            <p>
              ФИО ученика — персональные данные (152-ФЗ). Храните списки только на своём
              устройстве, не пересылайте в общие чаты и не публикуйте в открытом доступе.
              Для игр на проекторе используйте только имена без фамилий. Приложение хранит
              списки локально и никуда не передаёт; удаляйте ненужные списки кнопкой корзины.
            </p>
          </div>
        </div>

        {/* Список класса */}
        <section className="bg-white rounded-2xl shadow-md p-5">
          <h2 className="text-lg font-semibold text-purple-700 mb-3">Список класса</h2>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'Введите имена учеников, каждое с новой строки...\nПол — по желанию: Иван (м), Аня, ж'}
            className="w-full min-h-[140px] rounded-xl border border-gray-200 p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-y"
          />
          <p className="text-xs text-gray-500 mt-2">
            Формат: один ученик на строку. Пол — в скобках или через запятую: «Иван Петров (м)», «Аня Смирнова, ж». Без отметки пол не учитывается.
          </p>
          <p className="text-sm font-semibold text-purple-700 mt-2">
            В списке: {students.length} учеников
            {students.length > 0 && (
              <span className="text-gray-500 font-normal">
                {' '}· м: {boysCount} · ж: {girlsCount}
                {noGenderCount > 0 && ` · без пола: ${noGenderCount}`}
              </span>
            )}
          </p>

          {/* Импорт / экспорт / копирование */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl py-3 flex items-center justify-center gap-1.5 text-sm transition-colors touch-manipulation"
            >
              <Upload className="w-4 h-4" /> Импорт
            </button>
            <button
              onClick={handleExportFile}
              disabled={!text.trim()}
              className="bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-800 font-semibold rounded-xl py-3 flex items-center justify-center gap-1.5 text-sm transition-colors touch-manipulation"
            >
              <Download className="w-4 h-4" /> Экспорт
            </button>
            <button
              onClick={() => copyText(text)}
              disabled={!text.trim()}
              className="bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-800 font-semibold rounded-xl py-3 flex items-center justify-center gap-1.5 text-sm transition-colors touch-manipulation"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              Копир.
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={handleImportFile}
          />

          {/* Сохранение именованного списка */}
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="Название списка (например, 5А)"
              className="flex-1 min-w-0 rounded-xl border border-gray-200 p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <button
              onClick={handleSaveNamedList}
              disabled={!text.trim()}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-semibold rounded-xl px-4 py-3 flex items-center gap-1.5 transition-colors touch-manipulation shrink-0"
            >
              <Save className="w-4 h-4" /> {savedFlag ? '✓' : editingListId ? 'Обновить' : 'Сохранить'}
            </button>
          </div>

          <div className="flex gap-3 mt-3">
            <button
              onClick={handleSaveListText}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl py-3 min-h-14 transition-colors touch-manipulation"
            >
              Сохранить список
            </button>
            <button
              onClick={handleClearList}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-xl px-5 py-3 min-h-14 transition-colors touch-manipulation"
            >
              Очистить
            </button>
          </div>
        </section>

        {/* Мои списки */}
        {savedLists.length > 0 && (
          <section className="bg-white rounded-2xl shadow-md p-5">
            <h2 className="text-lg font-semibold text-purple-700 mb-3">Мои списки</h2>
            <div className="space-y-2">
              {savedLists.map((l) => (
                <div key={l.id} className="border-2 border-purple-100 rounded-xl p-3 flex items-center gap-2">
                  <button onClick={() => handleLoadList(l)} className="flex-1 min-w-0 text-left">
                    <h4 className="font-semibold text-gray-800 truncate">
                      {l.name}
                      {editingListId === l.id && (
                        <span className="ml-2 text-xs font-bold text-green-600">редактируется</span>
                      )}
                    </h4>
                    <p className="text-xs text-gray-500">
                      учеников: {parseStudents(l.text).length} ·{' '}
                      {new Date(l.updatedAt).toLocaleDateString('ru-RU')}
                    </p>
                  </button>
                  <button
                    onClick={() => copyText(l.text)}
                    className="p-2 text-gray-300 hover:text-purple-600 transition-colors shrink-0"
                    aria-label="Копировать список"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleLoadList(l)}
                    className="p-2 text-gray-300 hover:text-purple-600 transition-colors shrink-0"
                    aria-label="Редактировать список"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteList(l.id)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                    aria-label="Удалить список"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Режимы */}
        <section>
          <div className="grid grid-cols-3 gap-2">
            {modeButtons.map((m) => {
              const Icon = m.icon;
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setMode(m.id);
                    setWinner('');
                    setGroups([]);
                    setSeating([]);
                  }}
                  className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl min-h-14 transition-all touch-manipulation text-xs font-semibold ${
                    active
                      ? 'bg-purple-100 text-purple-800 border-2 border-purple-500'
                      : 'bg-white text-gray-500 border-2 border-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-center leading-tight">{m.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Режим: один */}
        {mode === 'one' && (
          <section className="bg-white rounded-2xl shadow-md p-5">
            <button
              onClick={handlePickOne}
              disabled={students.length === 0 || isSpinning}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white text-lg font-semibold rounded-xl py-4 min-h-14 transition-colors touch-manipulation disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Shuffle className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
              {isSpinning ? 'Крутим...' : 'Выбрать одного'}
            </button>

            {(isSpinning || winner) && (
              <div className="mt-6 flex flex-col items-center">
                <div className="relative w-56 h-56 mx-auto mb-4">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-red-500 drop-shadow-md" />
                  <div
                    className="w-full h-full rounded-full border-4 border-purple-600 bg-[conic-gradient(at_center,_var(--tw-gradient-stops))] from-purple-400 via-violet-500 to-purple-400 shadow-xl transition-transform duration-[1500ms] ease-[cubic-bezier(0.15,0,0.15,1)]"
                    style={{ transform: `rotate(${rotation}deg)` }}
                  >
                    <div className="absolute inset-4 rounded-full border-2 border-white/30 border-dashed" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="bg-white rounded-full w-24 h-24 flex items-center justify-center shadow-lg border-4 border-purple-100 p-2">
                      <p className="text-center text-sm font-bold text-purple-800 leading-tight break-words">
                        {rouletteName}
                      </p>
                    </div>
                  </div>
                </div>

                {winner && !isSpinning && (
                  <div className="w-full space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-2xl p-5 shadow-xl text-center">
                      <p className="text-sm text-white/80 mb-1">🎉 Выбран:</p>
                      <p className="text-3xl font-extrabold tracking-wide">{winner}</p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => copyText(`🎉 Выбран: ${winner}`)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Скопировано' : 'Копировать'}
                      </button>
                      <button
                        onClick={() => handleShare(`🎉 Выбран: ${winner}`)}
                        className="flex-1 bg-purple-100 hover:bg-purple-200 text-purple-800 font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                        Поделиться
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Режим: группы */}
        {mode === 'groups' && (
          <section className="bg-white rounded-2xl shadow-md p-5 space-y-4">
            <div>
              <label className="text-sm font-semibold text-purple-700 block mb-2">
                Количество групп
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={groupCount}
                onChange={(e) => setGroupCount(Math.max(1, Number(e.target.value) || 1))}
                className="w-full rounded-xl border border-gray-200 p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <button
              onClick={handleSplitGroups}
              disabled={students.length === 0}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white text-lg font-semibold rounded-xl py-4 min-h-14 transition-colors touch-manipulation disabled:opacity-40"
            >
              Распределить
            </button>

            {groups.length > 0 && (
              <div className="space-y-3 mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex gap-3">
                  <button
                    onClick={() => copyText(getGroupsText())}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors text-sm"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Скопировано' : 'Копировать'}
                  </button>
                  <button
                    onClick={() => handleShare(getGroupsText())}
                    className="flex-1 bg-purple-100 hover:bg-purple-200 text-purple-800 font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors text-sm"
                  >
                    <Share2 className="w-4 h-4" />
                    Поделиться
                  </button>
                </div>

                <div className="space-y-3">
                  {groups.map((g, i) => (
                    <div key={i} className="border-2 border-purple-400 rounded-2xl overflow-hidden">
                      <div className="bg-purple-100 text-purple-800 font-semibold px-4 py-2 flex justify-between">
                        <span>Группа {i + 1}</span>
                        <span className="text-purple-600">{g.length} чел.</span>
                      </div>
                      <ul className="p-3 space-y-1">
                        {g.map((name, j) => (
                          <li key={j} className="text-gray-700 text-sm flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-purple-200 text-purple-800 flex items-center justify-center text-xs font-bold">
                              {j + 1}
                            </span>
                            {name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Режим: рассадка */}
        {mode === 'seating' && (
          <section className="bg-white rounded-2xl shadow-md p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-purple-700 block mb-2">Рядов</label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={rows}
                  onChange={(e) => setRows(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full rounded-xl border border-gray-200 p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-purple-700 block mb-2">Колонок</label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={cols}
                  onChange={(e) => setCols(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full rounded-xl border border-gray-200 p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>

            {/* Учёт пола */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-gray-700">Чередовать мальчиков и девочек</span>
              <button
                onClick={toggleConsiderGender}
                className={`relative shrink-0 w-12 h-7 rounded-full transition-colors duration-200 ${
                  considerGender ? 'bg-purple-600' : 'bg-gray-300'
                }`}
                aria-label="Учитывать пол при рассадке"
              >
                <span
                  className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                    considerGender ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-gray-500 -mt-2">
              Работает, если у учеников указан пол: «Иван (м)», «Аня, ж». Настройка запоминается.
            </p>

            <button
              onClick={handleSeating}
              disabled={students.length === 0}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white text-lg font-semibold rounded-xl py-4 min-h-14 transition-colors touch-manipulation disabled:opacity-40"
            >
              Сгенерировать схему
            </button>

            {seating.length > 0 && (
              <div className="space-y-3 mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex gap-3">
                  <button
                    onClick={() => copyText(getSeatingText())}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors text-sm"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Скопировано' : 'Копировать'}
                  </button>
                  <button
                    onClick={() => handleShare(getSeatingText())}
                    className="flex-1 bg-purple-100 hover:bg-purple-200 text-purple-800 font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors text-sm"
                  >
                    <Share2 className="w-4 h-4" />
                    Поделиться
                  </button>
                </div>

                <div
                  className="grid gap-2"
                  style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                >
                  {seating.map((name, i) => (
                    <div
                      key={i}
                      className={`rounded-xl p-2 text-center text-xs font-medium min-h-14 flex flex-col items-center justify-center transition-all ${
                        name
                          ? 'bg-purple-50 border-2 border-purple-200 text-purple-900 shadow-sm'
                          : 'bg-gray-100 text-gray-400 border border-gray-200 border-dashed'
                      }`}
                    >
                      {name ? (
                        <>
                          <span className="text-[10px] text-purple-400 mb-0.5">Место {i + 1}</span>
                          <span className="leading-tight break-words w-full">{name}</span>
                        </>
                      ) : (
                        <span>Свободно</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Инструкции и сценарии */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowHow(!showHow)}
            className="w-full px-5 py-4 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-700">Инструкции и сценарии</h3>
              <span className="text-xs font-bold text-purple-400">{howItems.length}</span>
            </div>
            {showHow ? (
              <ChevronUp className="w-5 h-5 text-purple-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-purple-600" />
            )}
          </button>
          {showHow && (
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
            onClick={() => setShowFaq(!showFaq)}
            className="w-full px-5 py-4 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-700">Вопросы и подсказки</h3>
              <span className="text-xs font-bold text-purple-400">{faqItems.length}</span>
            </div>
            {showFaq ? (
              <ChevronUp className="w-5 h-5 text-purple-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-purple-600" />
            )}
          </button>
          {showFaq && (
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
    </div>
  );
}
