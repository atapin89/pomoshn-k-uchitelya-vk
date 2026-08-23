// src/components/PomodoroScreen.tsx

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Square,
  SkipForward,
  Plus,
  Trash2,
  Check,
  Clock,
  Settings,
  BarChart3,
  Pencil,
  X,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  GraduationCap,
  Coffee,
  Brain,
  type LucideIcon,
} from 'lucide-react';
import type { PomodoroTask, PomodoroMode, PomodoroSettings } from '@/types/pomodoro';
import {
  DEFAULT_SETTINGS,
  ALARM_SOUNDS,
  generatePomodoroId,
  createEmptyTask,
  getTodayKey,
  formatPomodoroTime,
} from '@/types/pomodoro';
import {
  loadPomodoroState,
  savePomodoroState,
  loadPomodoroSettings,
  savePomodoroSettings,
  addCompletedPomodoro,
  getTodayStats,
  getLast7DaysStats,
  exportPomodoroData,
  importPomodoroData,
  exportPomodoroCSV,
} from '@/lib/pomodoroStorage';
import { downloadTextFile, sanitizeFileName } from '@/lib/eduGameStorage';
import { playBell } from '@/lib/sound';
import { triggerHaptic } from '@/lib/haptic';
import BackButton from './BackButton';

interface PomodoroScreenProps {
  onBack: () => void;
}

const MODE_LABELS: Record<PomodoroMode, string> = {
  focus: 'Фокус',
  shortBreak: 'Перерыв',
  longBreak: 'Длинный перерыв',
};

const MODE_ICONS: Record<PomodoroMode, LucideIcon> = {
  focus: Brain,
  shortBreak: Coffee,
  longBreak: Coffee,
};

const HOW_ITEMS = [
  {
    q: 'Как работает техника Помодоро',
    a: 'Работайте 25 минут (одна «помидорка»), затем 5 минут отдыхайте. После 4 «помидорок» — длинный перерыв 15 минут.\n\n1. Добавьте задачи в список\n2. Выберите активную задачу\n3. Нажмите «Старт»\n4. Работайте до сигнала\n5. Перерыв → снова работа',
  },
  {
    q: 'Как управлять задачами',
    a: '• Добавьте задачу — введите название и нажмите Enter или «+»\n• Оценка — сколько «помидорок» займёт задача\n• Клик по задаче — сделать её активной\n• Чекбокс — отметить выполненной\n• Корзина — удалить задачу\n• Карандаш — редактировать',
  },
  {
    q: 'Настройки таймера',
    a: 'Нажмите шестерёнку, чтобы настроить:\n• Длительность фокуса (15-90 минут)\n• Длительность перерывов\n• После скольких «помидорок» длинный перерыв\n• Автозапуск перерывов и фокуса\n• Звук сигнала и громкость',
  },
  {
    q: 'Статистика и отчёты',
    a: 'Кнопка с графиком показывает:\n• Сколько «помидорок» завершено сегодня\n• Общее время фокуса\n• График за последние 7 дней\n• Разбивку по задачам\n\nЭкспорт в CSV — для Excel или Google Sheets.',
  },
  {
    q: 'Импорт и экспорт данных',
    a: 'Экспорт JSON — полная копия задач, настроек и статистики. Импорт — восстановление на другом устройстве.\n\nCSV — только статистика для отчётов.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Сценарий 1 · Подготовка к уроку',
    a: 'Поставьте задачи: «Написать план урока», «Проверить тетради», «Подготовить презентацию». Оцените каждую в «помидорках». Запустите таймер и работайте без отвлечений.',
  },
  {
    q: 'Сценарий 2 · Проверка работ',
    a: 'Создайте задачу «Проверить контрольные 5А» с оценкой 4 «помидорки». Работайте сериями по 25 минут с перерывами — глаза меньше устают.',
  },
  {
    q: 'Сценарий 3 · Планирование недели',
    a: 'В понедельник добавьте все задачи на неделю. Расставьте приоритеты, перетаскивая задачи. В конце недели посмотрите статистику — сколько времени ушло на каждую задачу.',
  },
  {
    q: 'Как долго работать?',
    a: 'Классика — 25 минут. Если задача сложная, увеличьте до 40-50 минут. Главное — не отвлекаться во время «помидорки»!',
  },
  {
    q: 'Что делать, если отвлекся?',
    a: 'Остановите таймер, сбросьте текущую «помидорку» и начните заново. Техника работает только при полной концентрации.',
  },
];

export default function PomodoroScreen({ onBack }: PomodoroScreenProps) {
  const [settings, setSettings] = useState<PomodoroSettings>(loadPomodoroSettings());
  const [tasks, setTasks] = useState<PomodoroTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [mode, setMode] = useState<PomodoroMode>('focus');
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(settings.focusDuration * 60);
  const [currentPomodoro, setCurrentPomodoro] = useState(1);
  const [completedToday, setCompletedToday] = useState(0);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingEstimate, setEditingEstimate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [openHow, setOpenHow] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const state = loadPomodoroState();
    setTasks(state.tasks);
    setActiveTaskId(state.activeTaskId);
    setCurrentPomodoro(state.currentPomodoro || 1);
    
    const todayStats = getTodayStats();
    setCompletedToday(todayStats?.completedPomodoros || 0);
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Таймер завершён
          clearInterval(intervalRef.current!);
          setIsRunning(false);
          handleTimerComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const handleTimerComplete = () => {
    playBell(settings.alarmRepeat);
    triggerHaptic('heavy');
    
    if (mode === 'focus') {
      // Завершена "помидорка"
      addCompletedPomodoro(activeTaskId, settings.focusDuration);
      setCompletedToday((prev) => prev + 1);
      
      // Обновляем задачу
      if (activeTaskId) {
        setTasks((prev) => prev.map((t) =>
          t.id === activeTaskId ? { ...t, completedPomodoros: t.completedPomodoros + 1 } : t
        ));
      }
      
      // Проверяем длинный перерыв
      if (currentPomodoro >= settings.longBreakInterval) {
        setMode('longBreak');
        setSecondsLeft(settings.longBreakDuration * 60);
        setCurrentPomodoro(1);
      } else {
        setMode('shortBreak');
        setSecondsLeft(settings.shortBreakDuration * 60);
        setCurrentPomodoro((prev) => prev + 1);
      }
      
      // Автозапуск перерыва
      if (settings.autoStartBreaks) {
        setIsRunning(true);
      }
    } else {
      // Перерыв завершён
      setMode('focus');
      setSecondsLeft(settings.focusDuration * 60);
      
      // Автозапуск фокуса
      if (settings.autoStartPomodoros) {
        setIsRunning(true);
      }
    }
  };

  const switchMode = (newMode: PomodoroMode) => {
    setMode(newMode);
    setIsRunning(false);
    
    if (newMode === 'focus') {
      setSecondsLeft(settings.focusDuration * 60);
    } else if (newMode === 'shortBreak') {
      setSecondsLeft(settings.shortBreakDuration * 60);
    } else {
      setSecondsLeft(settings.longBreakDuration * 60);
    }
  };

  const handleSkip = () => {
    setIsRunning(false);
    handleTimerComplete();
  };

  const handleReset = () => {
    setIsRunning(false);
    switchMode(mode);
  };

  const toggleTimer = () => {
    setIsRunning((prev) => !prev);
    triggerHaptic('light');
  };

  // ===== ЗАДАЧИ =====

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    const task = createEmptyTask(newTaskTitle, 1);
    setTasks((prev) => [...prev, task]);
    setNewTaskTitle('');
    triggerHaptic('light');
  };

  const handleToggleComplete = (taskId: string) => {
    setTasks((prev) => prev.map((t) =>
      t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
    ));
    triggerHaptic('medium');
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (activeTaskId === taskId) setActiveTaskId(null);
    triggerHaptic('medium');
  };

  const handleEditTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setEditingTaskId(taskId);
      setEditingTitle(task.title);
      setEditingEstimate(task.estimate);
    }
  };

  const handleSaveEdit = () => {
    if (!editingTaskId || !editingTitle.trim()) return;
    setTasks((prev) => prev.map((t) =>
      t.id === editingTaskId
        ? { ...t, title: editingTitle.trim(), estimate: Math.max(1, editingEstimate), updatedAt: Date.now() }
        : t
    ));
    setEditingTaskId(null);
    triggerHaptic('light');
  };

  const handleClearCompleted = () => {
    setTasks((prev) => prev.filter((t) => !t.isCompleted));
    triggerHaptic('medium');
  };

  // ===== НАСТРОЙКИ =====

  const handleSaveSettings = () => {
    savePomodoroSettings(settings);
    setShowSettings(false);
    triggerHaptic('light');
    // Перезапускаем таймер с новыми настройками
    setIsRunning(false);
    switchMode(mode);
  };

  // ===== ЭКСПОРТ / ИМПОРТ =====

  const handleExportJSON = () => {
    downloadTextFile(
      sanitizeFileName('pomodoro_data.json'),
      exportPomodoroData(),
      'application/json;charset=utf-8',
    );
  };

  const handleExportCSV = () => {
    downloadTextFile(
      sanitizeFileName('pomodoro_stats.csv'),
      exportPomodoroCSV(),
      'text/csv;charset=utf-8',
    );
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const success = importPomodoroData(String(reader.result || ''));
      if (success) {
        const state = loadPomodoroState();
        setTasks(state.tasks);
        setActiveTaskId(state.activeTaskId);
        setSettings(state.settings);
        alert('Данные импортированы!');
      } else {
        alert('Не удалось импортировать данные');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const activeTask = tasks.find((t) => t.id === activeTaskId);
  const totalFocusSeconds = settings.focusDuration * 60;
  const progress = totalFocusSeconds > 0 ? (secondsLeft / totalFocusSeconds) * 100 : 0;

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
      return b.updatedAt - a.updatedAt;
    });
  }, [tasks]);

  // ===== ЭКРАН НАСТРОЕК =====
  if (showSettings) {
    return (
      <div className="min-h-[100dvh] bg-purple-50 flex flex-col">
        <header className="bg-purple-700 shadow-md sticky top-0 z-10">
          <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
            <BackButton onClick={() => setShowSettings(false)} variant="light" />
            <div className="flex-1">
              <h1 className="text-lg font-bold text-white">Настройки</h1>
              <p className="text-xs text-purple-200">Таймер Помодоро</p>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-md mx-auto w-full px-5 py-5 space-y-4">
          {/* Длительности */}
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-purple-700">Длительность (минуты)</h3>
            
            <div>
              <label className="text-sm font-medium text-gray-600">Фокус: {settings.focusDuration} мин</label>
              <input
                type="range"
                min={5}
                max={90}
                value={settings.focusDuration}
                onChange={(e) => setSettings({ ...settings, focusDuration: Number(e.target.value) })}
                className="w-full accent-purple-600"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">Короткий перерыв: {settings.shortBreakDuration} мин</label>
              <input
                type="range"
                min={1}
                max={30}
                value={settings.shortBreakDuration}
                onChange={(e) => setSettings({ ...settings, shortBreakDuration: Number(e.target.value) })}
                className="w-full accent-purple-600"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">Длинный перерыв: {settings.longBreakDuration} мин</label>
              <input
                type="range"
                min={5}
                max={60}
                value={settings.longBreakDuration}
                onChange={(e) => setSettings({ ...settings, longBreakDuration: Number(e.target.value) })}
                className="w-full accent-purple-600"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">Длинный перерыв после: {settings.longBreakInterval} помидорок</label>
              <input
                type="range"
                min={2}
                max={8}
                value={settings.longBreakInterval}
                onChange={(e) => setSettings({ ...settings, longBreakInterval: Number(e.target.value) })}
                className="w-full accent-purple-600"
              />
            </div>
          </div>

          {/* Автозапуск */}
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-purple-700">Автозапуск</h3>
            
            <label className="flex items-center justify-between gap-2">
              <span className="text-sm text-gray-700">Автозапуск перерывов</span>
              <button
                onClick={() => setSettings({ ...settings, autoStartBreaks: !settings.autoStartBreaks })}
                className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${settings.autoStartBreaks ? 'bg-purple-600' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${settings.autoStartBreaks ? 'translate-x-5' : ''}`} />
              </button>
            </label>
            
            <label className="flex items-center justify-between gap-2">
              <span className="text-sm text-gray-700">Автозапуск фокуса</span>
              <button
                onClick={() => setSettings({ ...settings, autoStartPomodoros: !settings.autoStartPomodoros })}
                className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${settings.autoStartPomodoros ? 'bg-purple-600' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${settings.autoStartPomodoros ? 'translate-x-5' : ''}`} />
              </button>
            </label>
          </div>

          {/* Звук */}
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-purple-700">Звук</h3>
            
            <div>
              <label className="text-sm font-medium text-gray-600">Сигнал</label>
              <select
                value={settings.alarmSound}
                onChange={(e) => setSettings({ ...settings, alarmSound: e.target.value })}
                className="w-full rounded-xl border border-gray-200 p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                {ALARM_SOUNDS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">Громкость: {settings.alarmVolume}%</label>
              <input
                type="range"
                min={0}
                max={100}
                value={settings.alarmVolume}
                onChange={(e) => setSettings({ ...settings, alarmVolume: Number(e.target.value) })}
                className="w-full accent-purple-600"
              />
            </div>
          </div>

          {/* Данные */}
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-purple-700">Данные</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportJSON}
                className="bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold rounded-xl py-3 flex items-center justify-center gap-1.5 text-sm"
              >
                <Download className="w-4 h-4" /> Экспорт JSON
              </button>
              <button
                onClick={handleExportCSV}
                className="bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold rounded-xl py-3 flex items-center justify-center gap-1.5 text-sm"
              >
                <Download className="w-4 h-4" /> Экспорт CSV
              </button>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl py-3 flex items-center justify-center gap-1.5 text-sm"
            >
              <Upload className="w-4 h-4" /> Импорт данных
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImport}
            />
          </div>

          <button
            onClick={handleSaveSettings}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl py-4 text-lg"
          >
            Сохранить настройки
          </button>
        </main>
      </div>
    );
  }

  // ===== ЭКРАН СТАТИСТИКИ =====
  if (showStats) {
    const last7Days = getLast7DaysStats();
    const todayStats = getTodayStats();
    const maxPomodoros = Math.max(1, ...last7Days.map((s) => s.completedPomodoros));
    
    return (
      <div className="min-h-[100dvh] bg-purple-50 flex flex-col">
        <header className="bg-purple-700 shadow-md sticky top-0 z-10">
          <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
            <BackButton onClick={() => setShowStats(false)} variant="light" />
            <div className="flex-1">
              <h1 className="text-lg font-bold text-white">Статистика</h1>
              <p className="text-xs text-purple-200">Последние 7 дней</p>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-md mx-auto w-full px-5 py-5 space-y-4">
          {/* Общая сводка */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
              <Clock className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-800">{todayStats?.completedPomodoros || 0}</p>
              <p className="text-xs text-gray-500">помидоров сегодня</p>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
              <BarChart3 className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-800">
                {todayStats ? Math.round(todayStats.totalFocusMinutes / 60 * 10) / 10 : 0} ч
              </p>
              <p className="text-xs text-gray-500">фокуса сегодня</p>
            </div>
          </div>

          {/* График за 7 дней */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-purple-700 mb-4">График за 7 дней</h3>
            <div className="flex items-end gap-2 h-32">
              {last7Days.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-purple-600">
                    {day.completedPomodoros > 0 ? day.completedPomodoros : ''}
                  </span>
                  <div
                    className="w-full bg-purple-500 rounded-t-lg transition-all"
                    style={{
                      height: `${(day.completedPomodoros / maxPomodoros) * 100}%`,
                      minHeight: day.completedPomodoros > 0 ? '8px' : '2px',
                    }}
                  />
                  <span className="text-[10px] text-gray-400">
                    {new Date(day.date).toLocaleDateString('ru-RU', { weekday: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Разбивка по задачам */}
          {todayStats && Object.keys(todayStats.taskStats).length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-purple-700 mb-3">По задачам (сегодня)</h3>
              {Object.entries(todayStats.taskStats).map(([taskId, count]) => {
                const task = tasks.find((t) => t.id === taskId);
                return (
                  <div key={taskId} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-700">{task?.title || 'Удалённая задача'}</span>
                    <span className="text-sm font-bold text-purple-600">{count} 🍅</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Экспорт */}
          <button
            onClick={handleExportCSV}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" /> Экспорт CSV
          </button>
        </main>
      </div>
    );
  }

  // ===== ОСНОВНОЙ ЭКРАН =====
  const ModeIcon = MODE_ICONS[mode];

  return (
    <div className="min-h-[100dvh] bg-purple-50 flex flex-col">
      <header className="bg-purple-700 shadow-md sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">Таймер Помодоро</h1>
            <p className="text-xs text-purple-200">
              {activeTask ? `Задача: ${activeTask.title}` : 'Нет активной задачи'}
            </p>
          </div>
          <button
            onClick={() => setShowStats(true)}
            className="p-2 text-white/80 hover:text-white transition-colors"
            aria-label="Статистика"
            title="Статистика"
          >
            <BarChart3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-white/80 hover:text-white transition-colors"
            aria-label="Настройки"
            title="Настройки"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-5 py-5 space-y-4 pb-8">
        {/* Переключатель режимов */}
        <div className="grid grid-cols-3 gap-2">
          {(['focus', 'shortBreak', 'longBreak'] as PomodoroMode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                mode === m
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-purple-700'
              }`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        {/* Таймер */}
        <div className="bg-white rounded-3xl shadow-lg p-8 text-center">
          <ModeIcon className="w-8 h-8 text-purple-500 mx-auto mb-3" />
          <p className="text-sm text-purple-500 font-semibold mb-1">
            Помидор #{currentPomodoro}
          </p>
          <p className="text-6xl font-extrabold text-purple-800 tabular-nums tracking-tight">
            {formatPomodoroTime(secondsLeft)}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {activeTask ? activeTask.title : 'Нет активной задачи'}
          </p>
          
          {/* Прогресс-бар */}
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 rounded-full transition-all duration-1000"
              style={{ width: `${100 - progress}%` }}
            />
          </div>

          {/* Кнопки управления */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={handleReset}
              className="w-14 h-14 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              aria-label="Сброс"
              title="Сброс"
            >
              <Square className="w-6 h-6 text-gray-600" />
            </button>
            <button
              onClick={toggleTimer}
              className="w-20 h-20 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center transition-all active:scale-95 shadow-lg"
              aria-label={isRunning ? 'Пауза' : 'Старт'}
              title={isRunning ? 'Пауза' : 'Старт'}
            >
              {isRunning ? (
                <Pause className="w-10 h-10" />
              ) : (
                <Play className="w-10 h-10 ml-1" />
              )}
            </button>
            <button
              onClick={handleSkip}
              className="w-14 h-14 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              aria-label="Пропустить"
              title="Пропустить"
            >
              <SkipForward className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Задачи */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-purple-700 mb-3">Задачи</h3>
          
          {/* Добавление задачи */}
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTask();
              }}
              placeholder="Добавить задачу..."
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <button
              onClick={handleAddTask}
              disabled={!newTaskTitle.trim()}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl px-4 py-2.5 flex items-center justify-center transition-colors"
              aria-label="Добавить"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Список задач */}
          {sortedTasks.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">
              Нет задач. Добавьте первую!
            </p>
          ) : (
            <div className="space-y-2">
              {sortedTasks.map((task) => {
                const isActive = task.id === activeTaskId;
                
                if (editingTaskId === task.id) {
                  return (
                    <div key={task.id} className="border-2 border-purple-300 rounded-xl p-3 space-y-2">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={editingEstimate}
                          onChange={(e) => setEditingEstimate(Number(e.target.value))}
                          className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          aria-label="Оценка"
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="flex-1 bg-purple-600 text-white rounded-lg py-2 text-sm font-semibold"
                        >
                          Сохранить
                        </button>
                        <button
                          onClick={() => setEditingTaskId(null)}
                          className="bg-gray-200 text-gray-600 rounded-lg px-3 py-2"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div
                    key={task.id}
                    className={`border-2 rounded-xl p-3 flex items-center gap-2 transition-colors ${
                      isActive
                        ? 'border-purple-400 bg-purple-50'
                        : 'border-purple-100 bg-white'
                    }`}
                  >
                    {/* Чекбокс */}
                    <button
                      onClick={() => handleToggleComplete(task.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        task.isCompleted
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-300'
                      }`}
                      aria-label="Отметить выполненной"
                    >
                      {task.isCompleted && <Check className="w-4 h-4 text-white" />}
                    </button>

                    {/* Название */}
                    <button
                      onClick={() => setActiveTaskId(task.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className={`text-sm font-medium truncate ${task.isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {task.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {task.completedPomodoros}/{task.estimate} 🍅
                      </p>
                    </button>

                    {/* Кнопки */}
                    <button
                      onClick={() => handleEditTask(task.id)}
                      className="p-1.5 text-gray-300 hover:text-purple-600 transition-colors"
                      aria-label="Редактировать"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                      aria-label="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/*
