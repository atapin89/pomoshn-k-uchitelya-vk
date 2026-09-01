// src/components/TapperScreen.tsx

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Users,
  Plus,
  Upload,
  Download,
  Save,
  Trash2,
  Pencil,
  Check,
  X,
  RotateCcw,
  UserCheck,
  UserX,
  List,
  AlertTriangle,
  HelpCircle,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import type { TapperList, TapperStudent } from '@/types/tapper';
import { generateTapperId, createEmptyTapperList } from '@/types/tapper';
import {
  loadTapperLists,
  upsertTapperList,
  deleteTapperList,
  renameTapperList,
  serializeTapperList,
  parseTapperListFile,
  loadTapperSession,
  saveTapperSession,
  clearTapperSession,
} from '@/lib/tapperStorage';
import { downloadTextFile, sanitizeFileName } from '@/lib/eduGameStorage';
import { triggerHaptic } from '@/lib/haptic';
import BackButton from './BackButton';

interface TapperScreenProps {
  onBack: () => void;
}

// ===== Демо-список =====

const DEMO_STUDENTS = [
  'Иванов Иван',
  'Петрова Анна',
  'Смирнов Пётр',
  'Кузнецова Мария',
  'Васильев Дмитрий',
  'Соколова Елена',
  'Михайлов Артём',
  'Новикова Софья',
  'Фёдоров Кирилл',
  'Морозова Дарья',
  'Волков Максим',
  'Лебедева Виктория',
];

function createDemoList(): TapperList {
  const students: TapperStudent[] = DEMO_STUDENTS.map((name) => ({
    id: generateTapperId('student'),
    name,
    answerCount: 0,
    isPresent: true,
  }));
  
  return {
    id: generateTapperId('tapper-list'),
    name: 'Демо-класс (5А)',
    students,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ===== Инструкции и FAQ =====

const HOW_ITEMS = [
  {
    q: 'Как начать работу',
    a: '1) Создайте список класса или импортируйте готовый.\n2) Нажимайте на карточку ученика, когда он отвечает — счётчик увеличится.\n3) ПКМ (долгое нажатие) — сбросить счётчик конкретного ученика.\n4) Кнопка «Итоги» покажет сводку в конце урока.\n\nДля быстрого знакомства нажмите «Загрузить демо-список».',
  },
  {
    q: 'Как добавить учеников',
    a: 'В поле ввода добавьте имена — по одному на строку:\n\nИванов Иван\nПетрова Анна\nСмирнов Пётр\n\nНажмите «Добавить учеников». Дубликаты (без учёта регистра) автоматически отфильтруются.',
  },
  {
    q: 'Как отметить отсутствующих',
    a: 'Нажмите ПКМ (долгое нажатие на телефоне) на карточке ученика и выберите «Отметить отсутствующим». Ученик станет серым и не будет учитываться в статистике. Повторное действие вернёт его в список присутствующих.',
  },
  {
    q: 'Как работает счётчик',
    a: 'Каждое нажатие на карточку ученика добавляет +1 ответ. Счётчик отображается в правом верхнем углу карточки. Зелёная карточка — ученик отвечал хотя бы раз. Белая — ещё не отвечал.',
  },
  {
    q: 'Сохранение и восстановление',
    a: 'Результаты сохраняются автоматически. При возвращении в список и повторном открытии счётчики восстановятся. Кнопка сброса (↺) очищает все результаты.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Сценарий 1 · Устный опрос',
    a: 'Используйте счётчик во время устного опроса. Нажимайте на ученика, когда он отвечает. В конце урока откройте «Итоги» и посмотрите, кого не спросили — их можно вызвать на следующем уроке.',
  },
  {
    q: 'Сценарий 2 · Дискуссия',
    a: 'Во время классной дискуссии фиксируйте каждое выступление. Счётчик покажет самых активных участников и тех, кто отмалчивается.',
  },
  {
    q: 'Сценарий 3 · Групповая работа',
    a: 'При работе в группах отмечайте вклад каждого ученика. Сводка покажет, кто был лидером, а кто пассивен.',
  },
  {
    q: 'Сценарий 4 · Накопление за неделю',
    a: 'Ведите один список в течение недели. Счётчики накопят статистику по всем урокам. Экспортируйте результат в .txt для отчёта.',
  },
  {
    q: 'Импорт списка: формат и порядок',
    a: 'Формат: .json (из этого приложения) или .txt (простой текст).\n\nДля .txt: каждая строка — один ученик:\nИванов Иван\nПетрова Анна\n\nНажмите «Импорт» и выберите файл. Список появится в «Моих списках».',
  },
  {
    q: 'Экспорт списка: как поделиться',
    a: 'Кнопка «Экспорт» (иконка ↓) на карточке списка скачивает файл .json. Его можно отправить коллеге — он импортирует через «Импорт». Для отчёта используйте «Экспорт .txt» на экране результатов.',
  },
];

export default function TapperScreen({ onBack }: TapperScreenProps) {
  const [lists, setLists] = useState<TapperList[]>([]);
  const [activeList, setActiveList] = useState<TapperList | null>(null);
  const [importMsg, setImportMsg] = useState<'ok' | 'error' | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [openHow, setOpenHow] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [results, setResults] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadedLists = loadTapperLists();
    setLists(loadedLists);
    
    // ПРАВКА 1: защита от null при отсутствии сессии
    const sessionResults = loadTapperSession() || {};
    if (Object.keys(sessionResults).length > 0) {
      setResults(sessionResults);
    }
  }, []);

  useEffect(() => {
    if (Object.keys(results).length > 0) {
      saveTapperSession(results);
    }
  }, [results]);

  const refreshLists = () => setLists(loadTapperLists());

  const handleCreateList = () => {
    const newList = createEmptyTapperList('Новый список');
    upsertTapperList(newList);
    refreshLists();
    setActiveList(newList);
    setResults({});
    clearTapperSession();
    triggerHaptic('light');
  };

  const handleLoadDemoList = () => {
    const demoList = createDemoList();
    upsertTapperList(demoList);
    refreshLists();
    setActiveList(demoList);
    setResults({});
    clearTapperSession();
    triggerHaptic('medium');
  };

  const handleImportList = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      // Пробуем JSON, если не получилось — парсим как TXT
      const text = String(reader.result || '');
      let list: TapperList | null = parseTapperListFile(text);
      
      if (!list) {
        // Пробуем как TXT
        const names = text
          .split('\n')
          .map((n) => n.trim())
          .filter((n) => n);
        
        if (names.length > 0) {
          const students: TapperStudent[] = names.map((name) => ({
            id: generateTapperId('student'),
            name,
            answerCount: 0,
            isPresent: true,
          }));
          
          list = {
            id: generateTapperId('tapper-list'),
            name: file.name.replace(/\.[^.]+$/, '') || 'Импортированный список',
            students,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
        }
      }
      
      if (list) {
        upsertTapperList(list);
        refreshLists();
        setActiveList(list);
        setResults({});
        clearTapperSession();
        setImportMsg('ok');
      } else {
        setImportMsg('error');
      }
      setTimeout(() => setImportMsg(null), 2500);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportList = (list: TapperList) => {
    downloadTextFile(
      sanitizeFileName(`активность_${list.name}.json`),
      serializeTapperList(list),
      'application/json;charset=utf-8',
    );
    triggerHaptic('light');
  };

  const handleDeleteList = (id: string) => {
    const list = lists.find((l) => l.id === id);
    const proceed = window.confirm(`Удалить список «${list?.name}»?`);
    if (!proceed) return;
    deleteTapperList(id);
    refreshLists();
    if (activeList?.id === id) {
      setActiveList(null);
      setResults({});
      clearTapperSession();
    }
  };

  const handleRenameList = (id: string, newName: string) => {
    if (!newName.trim()) return;
    renameTapperList(id, newName.trim());
    refreshLists();
    if (activeList?.id === id) {
      setActiveList({ ...activeList, name: newName.trim() });
    }
  };

  const handleAddStudentsBulk = (text: string) => {
    if (!activeList) return;
    const names = text
      .split('\n')
      .map((n) => n.trim())
      .filter((n) => n);
    
    if (names.length === 0) return;
    
    const existingNames = new Set(activeList.students.map((s) => s.name.toLowerCase()));
    const newStudents: TapperStudent[] = names
      .filter((name) => !existingNames.has(name.toLowerCase()))
      .map((name) => ({
        id: generateTapperId('student'),
        name,
        answerCount: 0,
        isPresent: true,
      }));
    
    if (newStudents.length === 0) {
      alert('Все имена уже есть в списке');
      return;
    }
    
    const updated: TapperList = {
      ...activeList,
      students: [...activeList.students, ...newStudents],
      updatedAt: Date.now(),
    };
    setActiveList(updated);
    upsertTapperList(updated);
    refreshLists();
    triggerHaptic('medium');
  };

  const handleRemoveStudent = (studentId: string) => {
    if (!activeList) return;
    const student = activeList.students.find((s) => s.id === studentId);
    const proceed = window.confirm(`Удалить ученика «${student?.name}»?`);
    if (!proceed) return;
    
    const updated: TapperList = {
      ...activeList,
      students: activeList.students.filter((s) => s.id !== studentId),
      updatedAt: Date.now(),
    };
    setActiveList(updated);
    upsertTapperList(updated);
    refreshLists();
    
    const newResults = { ...results };
    delete newResults[studentId];
    setResults(newResults);
  };

  const handleTapStudent = (studentId: string) => {
    const currentCount = results[studentId] || 0;
    const newCount = currentCount + 1;
    setResults((prev) => ({ ...prev, [studentId]: newCount }));
    triggerHaptic('light');
  };

  const handleResetStudent = (studentId: string) => {
    setResults((prev) => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
    triggerHaptic('medium');
  };

  const handleResetAll = () => {
    const proceed = window.confirm('Сбросить все результаты?');
    if (!proceed) return;
    setResults({});
    clearTapperSession();
    triggerHaptic('heavy');
  };

  const handleTogglePresent = (studentId: string) => {
    if (!activeList) return;
    const updated: TapperList = {
      ...activeList,
      students: activeList.students.map((s) =>
        s.id === studentId ? { ...s, isPresent: !s.isPresent } : s,
      ),
      updatedAt: Date.now(),
    };
    setActiveList(updated);
    upsertTapperList(updated);
    refreshLists();
    triggerHaptic('light');
  };

  const stats = useMemo(() => {
    if (!activeList) return null;
    
    const total = activeList.students.length;
    const present = activeList.students.filter((s) => s.isPresent).length;
    const absent = total - present;
    const answered = activeList.students.filter((s) => (results[s.id] || 0) > 0).length;
    const notAnswered = present - answered;
    const totalAnswers = Object.values(results).reduce((a, b) => a + b, 0);
    
    return { total, present, absent, answered, notAnswered, totalAnswers };
  }, [activeList, results]);

  const getResultsText = (): string => {
    if (!activeList || !stats) return '';
    
    const lines: string[] = [];
    lines.push(`📊 Счётчик активности: ${activeList.name}`);
    lines.push(`Дата: ${new Date().toLocaleDateString('ru-RU')}`);
    lines.push('');
    lines.push(`Всего учеников: ${stats.total}`);
    lines.push(`Присутствовали: ${stats.present}`);
    lines.push(`Отсутствовали: ${stats.absent}`);
    lines.push(`Ответили: ${stats.answered}`);
    lines.push(`Не ответили: ${stats.notAnswered}`);
    lines.push(`Всего ответов: ${stats.totalAnswers}`);
    lines.push('');
    lines.push('=== Ответившие ===');
    
    activeList.students
      .filter((s) => (results[s.id] || 0) > 0)
      .sort((a, b) => (results[b.id] || 0) - (results[a.id] || 0))
      .forEach((s) => {
        lines.push(`${s.name} — ${results[s.id] || 0} отв.`);
      });
    
    lines.push('');
    lines.push('=== Не ответившие ===');
    
    activeList.students
      .filter((s) => s.isPresent && (results[s.id] || 0) === 0)
      .forEach((s) => {
        lines.push(s.name);
      });
    
    if (stats.absent > 0) {
      lines.push('');
      lines.push('=== Отсутствовали ===');
      activeList.students
        .filter((s) => !s.isPresent)
        .forEach((s) => {
          lines.push(s.name);
        });
    }
    
    return lines.join('\n');
  };

  // ===== ЭКРАН РЕЗУЛЬТАТОВ =====
  if (showResults && activeList && stats) {
    return (
      <div className="min-h-[100dvh] bg-purple-50 flex flex-col">
        <header className="bg-purple-700 shadow-md sticky top-0 z-10">
          <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
            <BackButton onClick={() => setShowResults(false)} variant="light" />
            <div className="flex-1">
              <h1 className="text-lg font-bold text-white">Результаты</h1>
              <p className="text-xs text-purple-200">{activeList.name}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-md mx-auto w-full px-5 py-5 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
              <UserCheck className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-gray-800">{stats.answered}</p>
              <p className="text-xs text-gray-500">ответили</p>
            </div>
            <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
              <UserX className="w-5 h-5 text-orange-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-gray-800">{stats.notAnswered}</p>
              <p className="text-xs text-gray-500">не ответили</p>
            </div>
            <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
              <Users className="w-5 h-5 text-purple-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-gray-800">{stats.totalAnswers}</p>
              <p className="text-xs text-gray-500">всего ответов</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-bold text-green-700 mb-3">✅ Ответившие ({stats.answered})</h3>
            {activeList.students
              .filter((s) => (results[s.id] || 0) > 0)
              .sort((a, b) => (results[b.id] || 0) - (results[a.id] || 0))
              .map((s, i) => (
                <div key={s.id} className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-gray-400 text-sm w-6">{i + 1}</span>
                  <span className="flex-1 text-gray-800 font-medium">{s.name}</span>
                  <span className="text-green-600 font-bold">{results[s.id] || 0} отв.</span>
                </div>
              ))}
            {stats.answered === 0 && (
              <p className="text-gray-400 text-sm text-center py-2">Никто не ответил</p>
            )}
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-bold text-orange-700 mb-3">❌ Не ответившие ({stats.notAnswered})</h3>
            {activeList.students
              .filter((s) => s.isPresent && (results[s.id] || 0) === 0)
              .map((s, i) => (
                <div key={s.id} className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-gray-400 text-sm w-6">{i + 1}</span>
                  <span className="flex-1 text-gray-800 font-medium">{s.name}</span>
                </div>
              ))}
            {stats.notAnswered === 0 && (
              <p className="text-gray-400 text-sm text-center py-2">Все ответили!</p>
            )}
          </div>

          {stats.absent > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-500 mb-3">🏠 Отсутствовали ({stats.absent})</h3>
              {activeList.students
                .filter((s) => !s.isPresent)
                .map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
                    <span className="text-gray-400 text-sm w-6">{i + 1}</span>
                    <span className="flex-1 text-gray-400 font-medium line-through">{s.name}</span>
                  </div>
                ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => downloadTextFile(
                sanitizeFileName(`результаты_активность_${activeList.name}.txt`),
                getResultsText(),
              )}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Download className="w-5 h-5" /> Экспорт .txt
            </button>
            <button
              onClick={handleResetAll}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl px-4 py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
              aria-label="Сбросить все"
              title="Сбросить все результаты"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ===== ЭКРАН СПИСКОВ =====
  if (!activeList) {
    return (
      <div className="min-h-[100dvh] notebook-bg flex flex-col">
        <header className="bg-purple-700 shadow-md sticky top-0 z-10">
          <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
            <BackButton onClick={onBack} variant="light" />
            <div className="flex-1">
              <h1 className="text-lg font-bold text-white">Счётчик активности</h1>
              <p className="text-xs text-purple-200">Отслеживание опросов</p>
            </div>
            <Users className="w-6 h-6 text-white/70" />
          </div>
        </header>

        <main className="flex-1 max-w-md mx-auto w-full px-5 py-5 space-y-4">
          {/* Кнопки */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCreateList}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Plus className="w-5 h-5" /> Создать список
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Upload className="w-5 h-5" /> Импорт
            </button>
          </div>

          {/* Демо-список */}
          <button
            onClick={handleLoadDemoList}
            className="w-full bg-gradient-to-r from-violet-100 to-purple-100 border-2 border-purple-300 text-purple-800 font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Sparkles className="w-5 h-5" /> Загрузить демо-список
          </button>

          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json,.txt,text/plain"
            className="hidden"
            onChange={handleImportList}
          />
          {importMsg === 'ok' && (
            <p className="text-sm font-semibold text-green-600 flex items-center gap-1.5" role="alert">
              <Check className="w-4 h-4" /> Список импортирован
            </p>
          )}
          {importMsg === 'error' && (
            <p className="text-sm font-semibold text-red-600 flex items-center gap-1.5" role="alert">
              <AlertTriangle className="w-4 h-4" /> Не удалось прочитать файл
            </p>
          )}

          {/* Мои списки */}
          {lists.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">Пока нет списков. Создайте первый или загрузите демо!</p>
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="font-semibold text-purple-700 text-sm">Мои списки ({lists.length})</h3>
              {lists.map((list) => (
                <div key={list.id} className="border-2 border-purple-100 rounded-xl p-3 flex items-center gap-2 bg-white">
                  <button
                    onClick={() => {
                      setActiveList(list);
                      // ПРАВКА 2: защита от null при отсутствии сессии
                      setResults(loadTapperSession() || {});
                    }}
                    className="flex-1 min-w-0 text-left"
                  >
                    <h4 className="font-semibold text-gray-800 text-sm truncate">{list.name}</h4>
                    <p className="text-xs text-gray-500">
                      учеников: {list.students.length} ·{' '}
                      {new Date(list.updatedAt).toLocaleDateString('ru-RU')}
                    </p>
                  </button>
                  <button
                    onClick={() => handleExportList(list)}
                    className="p-2 text-gray-300 hover:text-green-600 transition-colors"
                    aria-label="Экспорт списка"
                    title="Экспорт .json"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      const newName = window.prompt('Новое название:', list.name);
                      if (newName && newName.trim()) handleRenameList(list.id, newName);
                    }}
                    className="p-2 text-gray-300 hover:text-purple-600 transition-colors"
                    aria-label="Переименовать"
                    title="Переименовать"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteList(list.id)}
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
              {showHow ? (
                <ChevronUp className="w-5 h-5 text-purple-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-purple-600" />
              )}
            </button>
            {showHow && (
              <div className="px-5 pb-5 space-y-2">
                {HOW_ITEMS.map((item, idx) => (
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
                      <div className="px-4 pb-3 pt-1 text-sm text-gray-600 bg-purple-50/50 border-t border-purple-100 whitespace-pre-line">
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
              {showFaq ? (
                <ChevronUp className="w-5 h-5 text-purple-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-purple-600" />
              )}
            </button>
            {showFaq && (
              <div className="px-5 pb-5 space-y-2">
                {FAQ_ITEMS.map((item, idx) => (
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
                      <div className="px-4 pb-3 pt-1 text-sm text-gray-600 bg-purple-50/50 border-t border-purple-100 whitespace-pre-line">
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

  // ===== ОСНОВНОЙ ЭКРАН =====
  return (
    <div className="min-h-[100dvh] bg-purple-50 flex flex-col">
      <header className="bg-purple-700 shadow-md sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={() => {
            setActiveList(null);
            setShowResults(false);
          }} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">{activeList.name}</h1>
            <p className="text-xs text-purple-200">
              {activeList.students.length} учеников
              {stats && ` · ответили: ${stats.answered}/${stats.present}`}
            </p>
          </div>
          <button
            onClick={() => setShowResults(true)}
            className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-3 py-2 text-sm font-semibold flex items-center gap-1.5 transition-colors"
          >
            <List className="w-4 h-4" /> Итоги
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-4 pb-8">
        <div className="bg-white rounded-2xl p-3 shadow-sm mb-4">
          <textarea
            placeholder={'Добавьте учеников (по одному на строку):\nИван\nАня\nПетр'}
            className="w-full min-h-[60px] rounded-xl border border-gray-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-y"
            id="tapper-add-students"
          />
          <button
            onClick={() => {
              const textarea = document.getElementById('tapper-add-students') as HTMLTextAreaElement;
              if (textarea) {
                handleAddStudentsBulk(textarea.value);
                textarea.value = '';
              }
            }}
            className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold rounded-xl py-2 text-sm flex items-center justify-center gap-1.5 transition-colors mt-2"
          >
            <Plus className="w-4 h-4" /> Добавить учеников
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {activeList.students.map((student) => {
            const count = results[student.id] || 0;
            const hasAnswered = count > 0;
            
            return (
              <div
                key={student.id}
                className={`relative rounded-xl p-2 min-h-16 flex flex-col items-center justify-center text-center transition-all cursor-pointer select-none ${
                  !student.isPresent
                    ? 'bg-gray-200 opacity-60'
                    : hasAnswered
                      ? 'bg-green-100 border-2 border-green-400'
                      : 'bg-white border-2 border-purple-200'
                }`}
                onClick={() => {
                  if (!student.isPresent) return;
                  handleTapStudent(student.id);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleResetStudent(student.id);
                }}
                title={`${student.name}: ${count} ответ(ов). ПКМ — сбросить`}
              >
                <span className={`text-xs font-semibold truncate w-full ${!student.isPresent ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                  {student.name}
                </span>
                {hasAnswered && (
                  <span className="absolute -top-1.5 -right-1.5 bg-green-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow">
                    {count}
                  </span>
                )}
                {!student.isPresent && (
                  <span className="text-[10px] text-gray-400 mt-0.5">отсутствует</span>
                )}
              </div>
            );
          })}
        </div>

        {activeList.students.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">
            Добавьте учеников в список
          </p>
        )}

        <p className="text-xs text-gray-400 text-center mt-4">
          Нажмите на ученика — добавить ответ. ПКМ (долгое нажатие) — сбросить.
        </p>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setShowResults(true)}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <List className="w-5 h-5" /> Сводка
          </button>
          <button
            onClick={handleResetAll}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl px-4 py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            aria-label="Сбросить все"
            title="Сбросить все результаты"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </main>
    </div>
  );
}
