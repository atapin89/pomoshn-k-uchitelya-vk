import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Dumbbell,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Drum,
  Focus,
  HelpCircle,
  Trophy,
  Lightbulb,
  Zap,
} from 'lucide-react';
import BackButton from './BackButton';
import { triggerHaptic } from '@/lib/haptic';

// ===== Типы =====

type Tab = 'eyes' | 'drum' | 'focus';
type Trajectory = 'circle' | 'h-eight' | 'v-eight' | 'cross' | 'square' | 'zigzag';

interface DrumSet {
  id: string;
  name: string;
  actions: string[];
}

// ===== Данные =====

const TRAJECTORIES: { id: Trajectory; name: string; description: string }[] = [
  { id: 'circle', name: 'Круг', description: 'Плавное круговое движение' },
  { id: 'h-eight', name: 'Горизонтальная 8', description: 'Движение по знаку бесконечности' },
  { id: 'v-eight', name: 'Вертикальная 8', description: 'Вертикальная бесконечность' },
  { id: 'cross', name: 'Крест', description: 'Вверх-вниз, влево-вправо' },
  { id: 'square', name: 'По периметру', description: 'По углам прямоугольника' },
  { id: 'zigzag', name: 'Зигзаг', description: 'От левого верхнего к правому нижнему' },
];

const DEFAULT_SETS: DrumSet[] = [
  {
    id: 'active',
    name: 'Активная разминка',
    actions: [
      'Прыгни 5 раз',
      'Потянись вверх 3 раза',
      'Повернись вокруг себя',
      'Присядь 5 раз',
      'Похлопай 10 раз',
      'Потопай 10 раз',
      'Покрути головой 5 раз',
      'Разведи руки в стороны 3 раза',
      'Сделай мельницу руками',
      'Попрыгай на одной ноге 5 раз',
    ],
  },
  {
    id: 'calm',
    name: 'Спокойная разминка',
    actions: [
      'Сделай глубокий вдох',
      'Медленно выдохни',
      'Покрути плечами',
      'Потяни шею вправо',
      'Потяни шею влево',
      'Разожми и сожми кулаки',
      'Помассируй мочки ушей',
      'Помассируй кончики пальцев',
      'Поморгай 15 секунд',
      'Закрой глаза на 10 секунд',
    ],
  },
  {
    id: 'coordination',
    name: 'Координация',
    actions: [
      'Хлопни в ладоши 5 раз',
      'Дотронься правой рукой до левого уха',
      'Дотронься левой рукой до правого уха',
      'Щёлкни пальцами правой руки',
      'Щёлкни пальцами левой руки',
      'Покажи "класс" обеими руками',
      'Постучи пальцами по столу',
      'Сделай "ножницы" пальцами',
      'Покрути кулаками',
      'Сожми-разожми пальцы 10 раз',
    ],
  },
  {
    id: 'fun',
    name: 'Весёлая разминка',
    actions: [
      'Изобрази курицу',
      'Покажи, как летит самолёт',
      'Изобрази робота 10 секунд',
      'Покажи, как ходит медведь',
      'Изобрази лягушку',
      'Покажи, как растёт цветок',
      'Изобрази, как плывёт рыба',
      'Покажи, как прыгает заяц',
      'Изобрази ветер',
      'Покажи, как падает лист',
    ],
  },
];

const STORAGE_KEY = 'fizminutka-drum-sets';

const FAQ_ITEMS = [
  {
    q: 'Зачем нужна глазодвигательная гимнастика?',
    a: 'Движения глаз по разным траекториям снимают зрительное напряжение после долгой работы с бумагой или экраном, тренируют мышцы глаз и улучшают кровообращение. Особенно полезна на уроках чтения, письма и работы с проектором.',
  },
  {
    q: 'Сколько времени должна занимать физминутка?',
    a: 'Оптимально 1–3 минуты. Глазодвигательная гимнастика — 30–60 секунд, пара упражнений из барабана — ещё 30–60 секунд. Этого достаточно, чтобы вернуть внимание класса.',
  },
  {
    q: 'Что такое "метка на стекле"?',
    a: 'Классический метод тренировки аккомодации глаза: фиксируйте взгляд 5 секунд на ближней метке (на расстоянии 30 см), потом 5 секунд на дальнем объекте (не менее 3 метров). Повторяйте 3–5 минут. Тренирует хрусталик и снимает спазм.',
  },
  {
    q: 'Сохраняются ли свои наборы действий?',
    a: 'Да, все созданные наборы хранятся на устройстве. Вы можете добавлять, редактировать и удалять их в любой момент — изменения применяются сразу.',
  },
  {
    q: 'Как использовать физминутку на уроке?',
    a: 'Включите режим "Глаза" на проекторе — класс следит за точкой не поворачивая головы. Или запустите барабан и попросите весь класс выполнить выпавшее действие. 2 минуты — и концентрация возвращается.',
  },
];

const SCENARIO_ITEMS = [
  { icon: '📖', title: 'После чтения', description: 'Урок литературы или русского: 1 минута глазодвигательной гимнастики снимает усталость от работы с текстом.' },
  { icon: '💻', title: 'После компьютера', description: 'Урок информатики: "метка на стекле" или круговое движение глаз возвращает комфортное зрение после экрана.' },
  { icon: '🏃', title: 'На длинном уроке', description: 'Вторая половина пары: запустите барабан "Активная разминка" — 2 случайных упражнения взбодрят весь класс.' },
  { icon: '🎨', title: 'На творческом уроке', description: 'ИЗО или технология: барабан "Весёлая разминка" переключит внимание и поднимет настроение.' },
  { icon: '🧒', title: 'Для начальной школы', description: 'Первоклашки теряют внимание через 10 минут: 30 секунд кругового движения глаз — и можно продолжать.' },
  { icon: '🏠', title: 'При домашней работе', description: 'Ребёнок делает уроки дома: напоминание делать "метку на стекле" каждые 20 минут защищает зрение.' },
];

// ===== Генерация координат точки по траектории =====

function getPointOnTrajectory(t: number, traj: Trajectory): { x: number; y: number } {
  // t в диапазоне [0, 1] — нормализованное время
  switch (traj) {
    case 'circle': {
      const angle = t * 2 * Math.PI;
      return { x: 50 + 40 * Math.cos(angle), y: 50 + 40 * Math.sin(angle) };
    }
    case 'h-eight': {
      const angle = t * 2 * Math.PI;
      return { x: 50 + 40 * Math.sin(angle), y: 50 + 25 * Math.sin(2 * angle) };
    }
    case 'v-eight': {
      const angle = t * 2 * Math.PI;
      return { x: 50 + 25 * Math.sin(2 * angle), y: 50 + 40 * Math.sin(angle) };
    }
    case 'cross': {
      // 4 сегмента: верх-низ-лево-право
      const seg = t * 4;
      const i = Math.floor(seg) % 4;
      const p = seg - Math.floor(seg);
      const positions = [
        { x: 50, y: 15 + p * 70 }, // вниз
        { x: 15 + p * 70, y: 50 }, // вправо
        { x: 50, y: 85 - p * 70 }, // вверх
        { x: 85 - p * 70, y: 50 }, // влево
      ];
      return positions[i];
    }
    case 'square': {
      // 4 стороны прямоугольника
      const seg = t * 4;
      const i = Math.floor(seg) % 4;
      const p = seg - Math.floor(seg);
      const positions = [
        { x: 15 + p * 70, y: 15 }, // верх
        { x: 85, y: 15 + p * 70 }, // право
        { x: 85 - p * 70, y: 85 }, // низ
        { x: 15, y: 85 - p * 70 }, // лево
      ];
      return positions[i];
    }
    case 'zigzag': {
      // диагональ туда-обратно
      const cycle = (t * 4) % 1;
      const dir = Math.floor(t * 4) % 2;
      const y = 15 + cycle * 70;
      const x = dir === 0 ? 15 + cycle * 70 : 85 - cycle * 70;
      return { x, y };
    }
  }
}

// ===== Компонент =====

export default function FizminutkaScreen({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('eyes');

  // ===== Тренажёр для глаз =====
  const [trajectory, setTrajectory] = useState<Trajectory>('circle');
  const [duration, setDuration] = useState(20); // секунд на полный цикл
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const animRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }
    startRef.current = performance.now();
    const animate = (now: number) => {
      const elapsed = (now - startRef.current) / 1000;
      const p = (elapsed % duration) / duration;
      setProgress(p);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, duration]);

  const pointPos = useMemo(() => getPointOnTrajectory(progress, trajectory), [progress, trajectory]);

  // ===== Барабан действий =====
  const [sets, setSets] = useState<DrumSet[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as DrumSet[];
        if (Array.isArray(arr) && arr.length > 0) return [...DEFAULT_SETS, ...arr];
      }
    } catch {}
    return DEFAULT_SETS;
  });
  const [activeSetId, setActiveSetId] = useState<string>('active');
  const [drumResult, setDrumResult] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    try {
      // Сохраняем только пользовательские (не дефолтные) наборы
      const custom = sets.filter((s) => !DEFAULT_SETS.find((d) => d.id === s.id));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
    } catch {}
  }, [sets]);

  const activeSet = sets.find((s) => s.id === activeSetId) || sets[0];

  const spinDrum = () => {
    if (!activeSet.actions.length) return;
    setIsSpinning(true);
    setDrumResult(null);
    triggerHaptic('medium');
    // Анимация "мигания" разных действий 1.5 сек
    const total = 1500;
    const step = 80;
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += step;
      const random = activeSet.actions[Math.floor(Math.random() * activeSet.actions.length)];
      setDrumResult(random);
      if (elapsed >= total) {
        clearInterval(interval);
        const final = activeSet.actions[Math.floor(Math.random() * activeSet.actions.length)];
        setDrumResult(final);
        setIsSpinning(false);
        triggerHaptic('heavy');
      }
    }, step);
  };

  const addCustomSet = () => {
    const newSet: DrumSet = {
      id: 'custom-' + Date.now().toString(36),
      name: 'Мой набор',
      actions: ['Новое действие 1', 'Новое действие 2'],
    };
    setSets((prev) => [...prev, newSet]);
    setActiveSetId(newSet.id);
    triggerHaptic('light');
  };

  const removeCustomSet = (id: string) => {
    if (DEFAULT_SETS.find((d) => d.id === id)) return;
    setSets((prev) => prev.filter((s) => s.id !== id));
    if (activeSetId === id) setActiveSetId(DEFAULT_SETS[0].id);
    triggerHaptic('light');
  };

  const updateSetActions = (id: string, actions: string[]) => {
    setSets((prev) => prev.map((s) => (s.id === id ? { ...s, actions } : s)));
  };

  const updateSetName = (id: string, name: string) => {
    setSets((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  };

  // ===== Метка на стекле =====
  const [focusTimer, setFocusTimer] = useState(0);
  const [focusPhase, setFocusPhase] = useState<'near' | 'far'>('near');
  const [focusRunning, setFocusRunning] = useState(false);
  const [focusTotal, setFocusTotal] = useState(120); // 2 минуты
  const focusIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!focusRunning) {
      if (focusIntervalRef.current) clearInterval(focusIntervalRef.current);
      return;
    }
    setFocusTimer(0);
    setFocusPhase('near');
    focusIntervalRef.current = window.setInterval(() => {
      setFocusTimer((prev) => {
        const next = prev + 1;
        if (next >= focusTotal) {
          setFocusRunning(false);
          return focusTotal;
        }
        // каждые 10 сек — смена фазы
        if (next % 10 === 0) {
          setFocusPhase((p) => (p === 'near' ? 'far' : 'near'));
          triggerHaptic('medium');
        }
        return next;
      });
    }, 1000);
    return () => {
      if (focusIntervalRef.current) clearInterval(focusIntervalRef.current);
    };
  }, [focusRunning, focusTotal]);

  const isCustomSet = (id: string) => !DEFAULT_SETS.find((d) => d.id === id);

  return (
    <div className="min-h-[100dvh] notebook-bg flex flex-col">
      {/* ЕДИНАЯ ШАПКА */}
      <header className="bg-purple-700 shadow-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Физминутка</h1>
          </div>
          <Dumbbell className="w-6 h-6 text-white/70 shrink-0" />
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-4 space-y-4 pb-8">
        {/* ===== Переключатель вкладок ===== */}
        <div className="grid grid-cols-3 gap-1.5 bg-white rounded-2xl p-1.5 shadow-sm">
          <button
            onClick={() => setTab('eyes')}
            className={`py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 ${
              tab === 'eyes' ? 'bg-purple-600 text-white shadow-md' : 'text-purple-700 hover:bg-purple-50'
            }`}
          >
            <Eye className="w-4 h-4" /> Глаза
          </button>
          <button
            onClick={() => setTab('drum')}
            className={`py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 ${
              tab === 'drum' ? 'bg-purple-600 text-white shadow-md' : 'text-purple-700 hover:bg-purple-50'
            }`}
          >
            <Drum className="w-4 h-4" /> Барабан
          </button>
          <button
            onClick={() => setTab('focus')}
            className={`py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 ${
              tab === 'focus' ? 'bg-purple-600 text-white shadow-md' : 'text-purple-700 hover:bg-purple-50'
            }`}
          >
            <Focus className="w-4 h-4" /> Метка
          </button>
        </div>

        {/* ===== ТРЕНАЖЁР ДЛЯ ГЛАЗ ===== */}
        {tab === 'eyes' && (
          <>
            <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-purple-700 text-base">Глазодвигательная гимнастика</h3>
              </div>
              <p className="text-xs text-gray-500">
                Следите за точкой только глазами, не поворачивая головы. Держите экран на расстоянии 40–60 см.
              </p>

              {/* Область движения точки */}
              <div className="relative bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl border-2 border-purple-100 aspect-square sm:aspect-[4/3] overflow-hidden">
                {/* Центральная метка */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-purple-300" />
                {/* Движущаяся точка */}
                <div
                  className="absolute w-10 h-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg transition-transform"
                  style={{
                    left: `${pointPos.x}%`,
                    top: `${pointPos.y}%`,
                    boxShadow: '0 0 20px rgba(124, 58, 237, 0.6)',
                  }}
                />
                {/* Стрелки-подсказки по углам */}
                <div className="absolute inset-4 border-2 border-dashed border-purple-200 rounded-xl pointer-events-none" />
              </div>

              {/* Выбор траектории */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-2">Траектория</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {TRAJECTORIES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTrajectory(t.id)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left ${
                        trajectory === t.id
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                      }`}
                    >
                      <div>{t.name}</div>
                      <div className={`text-[10px] mt-0.5 ${trajectory === t.id ? 'text-purple-200' : 'text-purple-500'}`}>
                        {t.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Скорость */}
              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Длительность цикла</span>
                  <span className="font-mono font-bold text-purple-700">{duration} сек</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={40}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full accent-purple-600"
                />
              </div>

              {/* Управление */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsPlaying((p) => !p);
                    triggerHaptic('light');
                  }}
                  className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? 'Пауза' : 'Старт'}
                </button>
                <button
                  onClick={() => {
                    setProgress(0);
                    setIsPlaying(false);
                    triggerHaptic('light');
                  }}
                  className="px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> Сброс
                </button>
              </div>
            </section>

            <section className="bg-purple-50 border border-purple-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-purple-900 text-sm">Рекомендации</h3>
              </div>
              <ul className="list-disc list-inside text-sm text-purple-900 space-y-1">
                <li>Голова неподвижна — двигаются только глаза</li>
                <li>Расстояние до экрана 40–60 см</li>
                <li>30–60 секунд на одну траекторию достаточно</li>
                <li>Выводите на проектор — пусть весь класс следит вместе</li>
              </ul>
            </section>
          </>
        )}

        {/* ===== БАРАБАН ДЕЙСТВИЙ ===== */}
        {tab === 'drum' && (
          <>
            <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Drum className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-purple-700 text-base">Барабан действий</h3>
              </div>

              {/* Выбор набора */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-2">Набор действий</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {sets.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSetId(s.id)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${
                        activeSetId === s.id
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                      }`}
                    >
                      <span className="truncate">{s.name}</span>
                      <span className={`text-[10px] ml-1 ${activeSetId === s.id ? 'text-purple-200' : 'text-purple-500'}`}>
                        {s.actions.length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Барабан */}
              <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 sm:p-8 min-h-[200px] flex flex-col items-center justify-center">
                <div className="absolute top-2 left-2 text-amber-400 text-2xl">🎯</div>
                <div className="absolute top-2 right-2 text-amber-400 text-2xl">🎯</div>
                {drumResult ? (
                  <div
                    className={`text-center ${
                      isSpinning ? 'animate-pulse opacity-70' : 'animate-in fade-in'
                    }`}
                  >
                    <div className="text-xs text-amber-700 font-semibold uppercase tracking-widest mb-3">
                      {isSpinning ? 'Крутится...' : 'Ваше задание'}
                    </div>
                    <div className="text-2xl sm:text-4xl font-bold text-amber-900 leading-tight">
                      {drumResult}
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <Drum className="w-16 h-16 text-amber-400 mx-auto mb-3" />
                    <p className="text-sm text-amber-700">Нажмите кнопку, чтобы получить случайное действие</p>
                  </div>
                )}
              </div>

              <button
                onClick={spinDrum}
                disabled={isSpinning || !activeSet.actions.length}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <Zap className="w-4 h-4" />
                {isSpinning ? 'Крутится барабан...' : 'Крутить барабан'}
              </button>
            </section>

            {/* ===== Редактирование набора ===== */}
            <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-purple-700 text-base">Управление наборами</h3>
                  <span className="text-xs text-gray-400">({activeSet.actions.length} действий)</span>
                </div>
                <button
                  onClick={addCustomSet}
                  className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Новый набор
                </button>
              </div>

              {/* Название активного набора */}
              <input
                value={activeSet.name}
                onChange={(e) => updateSetName(activeSetId, e.target.value)}
                disabled={!isCustomSet(activeSetId)}
                placeholder="Название набора"
                className="w-full rounded-lg border-2 border-purple-200 px-3 py-2 text-sm font-semibold text-purple-900 disabled:bg-gray-50 disabled:cursor-not-allowed focus:outline-none focus:border-purple-500"
              />

              {/* Действия */}
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {activeSet.actions.map((a, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <input
                      value={a}
                      onChange={(e) => {
                        const newActions = [...activeSet.actions];
                        newActions[idx] = e.target.value;
                        updateSetActions(activeSetId, newActions);
                      }}
                      disabled={!isCustomSet(activeSetId)}
                      placeholder="Действие"
                      className="flex-1 min-w-0 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm disabled:bg-gray-50 disabled:cursor-not-allowed focus:outline-none focus:border-purple-400"
                    />
                    {isCustomSet(activeSetId) && (
                      <button
                        onClick={() => {
                          const newActions = activeSet.actions.filter((_, i) => i !== idx);
                          updateSetActions(activeSetId, newActions);
                          triggerHaptic('light');
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        aria-label="Удалить действие"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {isCustomSet(activeSetId) && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      updateSetActions(activeSetId, [...activeSet.actions, 'Новое действие']);
                      triggerHaptic('light');
                    }}
                    className="py-2 rounded-lg border-2 border-dashed border-purple-300 text-purple-700 text-xs font-semibold hover:bg-purple-50 flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Добавить действие
                  </button>
                  <button
                    onClick={() => removeCustomSet(activeSetId)}
                    className="py-2 rounded-lg border-2 border-dashed border-red-300 text-red-600 text-xs font-semibold hover:bg-red-50 flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Удалить набор
                  </button>
                </div>
              )}

              {!isCustomSet(activeSetId) && (
                <p className="text-[11px] text-gray-500 text-center">
                  Готовый набор нельзя изменить. Создайте свой набор кнопкой «Новый набор».
                </p>
              )}
            </section>
          </>
        )}

        {/* ===== МЕТКА НА СТЕКЛЕ ===== */}
        {tab === 'focus' && (
          <>
            <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Focus className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-purple-700 text-base">Метка на стекле</h3>
              </div>
              <p className="text-xs text-gray-500">
                Тренировка аккомодации: чередование фокуса на ближнем и дальнем объекте.
              </p>

              {/* Визуализация */}
              <div
                className={`relative rounded-2xl border-2 p-6 sm:p-8 min-h-[240px] flex flex-col items-center justify-center transition-colors ${
                  focusPhase === 'near'
                    ? 'bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200'
                    : 'bg-gradient-to-br from-blue-50 to-cyan-100 border-blue-200'
                }`}
              >
                <div className={`text-xs uppercase tracking-widest font-semibold mb-4 ${
                  focusPhase === 'near' ? 'text-purple-600' : 'text-blue-600'
                }`}>
                  Сейчас смотрите
                </div>
                <div className="flex items-center gap-6">
                  {/* Иконка ближнего объекта */}
                  <div className={`flex flex-col items-center gap-2 ${focusPhase === 'near' ? 'scale-110' : 'opacity-40'} transition-all`}>
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl ${
                      focusPhase === 'near' ? 'bg-purple-500 shadow-lg' : 'bg-gray-300'
                    }`}>
                      🎯
                    </div>
                    <span className={`text-sm font-semibold ${focusPhase === 'near' ? 'text-purple-900' : 'text-gray-500'}`}>
                      БЛИЖНИЙ
                    </span>
                    <span className="text-[10px] text-gray-500">30 см от глаз</span>
                  </div>

                  {/* Таймер текущей фазы */}
                  <div className="text-4xl font-bold text-gray-700 font-mono min-w-[60px] text-center">
                    {10 - (focusTimer % 10)}
                  </div>

                  {/* Иконка дальнего объекта */}
                  <div className={`flex flex-col items-center gap-2 ${focusPhase === 'far' ? 'scale-110' : 'opacity-40'} transition-all`}>
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl ${
                      focusPhase === 'far' ? 'bg-blue-500 shadow-lg' : 'bg-gray-300'
                    }`}>
                      🏔️
                    </div>
                    <span className={`text-sm font-semibold ${focusPhase === 'far' ? 'text-blue-900' : 'text-gray-500'}`}>
                      ДАЛЬНИЙ
                    </span>
                    <span className="text-[10px] text-gray-500">3+ метра</span>
                  </div>
                </div>

                <div className="mt-4 text-sm text-gray-600 text-center">
                  Осталось: <span className="font-mono font-bold">{Math.max(0, focusTotal - focusTimer)} сек</span>
                </div>
              </div>

              {/* Длительность сессии */}
              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Длительность сессии</span>
                  <span className="font-mono font-bold text-purple-700">{Math.floor(focusTotal / 60)} мин {focusTotal % 60} сек</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={300}
                  step={30}
                  value={focusTotal}
                  onChange={(e) => {
                    setFocusTotal(Number(e.target.value));
                    setFocusTimer(0);
                  }}
                  className="w-full accent-purple-600"
                />
              </div>

              {/* Управление */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setFocusRunning((r) => !r);
                    triggerHaptic('light');
                  }}
                  className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  {focusRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {focusRunning ? 'Пауза' : focusTimer > 0 ? 'Продолжить' : 'Старт'}
                </button>
                <button
                  onClick={() => {
                    setFocusRunning(false);
                    setFocusTimer(0);
                    setFocusPhase('near');
                    triggerHaptic('light');
                  }}
                  className="px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> Сброс
                </button>
              </div>
            </section>

            <section className="bg-purple-50 border border-purple-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-purple-900 text-sm">Как использовать</h3>
              </div>
              <ol className="list-decimal list-inside text-sm text-purple-900 space-y-1">
                <li>Приклейте яркую метку (стикер, точку) на окно или держите палец на 30 см от лица</li>
                <li>Выберите дальний объект за окном — дерево, дом, облако (не ближе 3 метров)</li>
                <li>Когда приложение показывает «БЛИЖНИЙ» — смотрите на метку 10 секунд</li>
                <li>Когда приложение показывает «ДАЛЬНИЙ» — смотрите на дальний объект 10 секунд</li>
                <li>Чередуйте фокус до окончания таймера</li>
              </ol>
              <p className="text-xs text-purple-800 pt-2 border-t border-purple-200">
                <b>Польза:</b> тренирует хрусталик, снимает спазм аккомодации, улучшает способность глаза быстро переключать фокус между близкими и дальними объектами.
              </p>
            </section>
          </>
        )}

        {/* ===== FAQ ===== */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <details>
            <summary className="px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-700 text-sm">Частые вопросы</h3>
              <span className="text-xs font-bold text-purple-400">{FAQ_ITEMS.length}</span>
            </summary>
            <div className="px-4 pb-4 space-y-2">
              {FAQ_ITEMS.map((item, idx) => (
                <details key={idx} className="border border-purple-100 rounded-xl overflow-hidden">
                  <summary className="px-4 py-2.5 cursor-pointer hover:bg-purple-50 font-semibold text-sm text-gray-800">{item.q}</summary>
                  <div className="px-4 pb-3 pt-1 text-sm text-gray-600 bg-purple-50/50 border-t border-purple-100">{item.a}</div>
                </details>
              ))}
            </div>
          </details>
        </section>

        {/* ===== Сценарии ===== */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <details>
            <summary className="px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-purple-700 text-sm">Сценарии использования</h3>
              <span className="text-xs font-bold text-purple-400">{SCENARIO_ITEMS.length}</span>
            </summary>
            <div className="px-4 pb-4 space-y-2">
              {SCENARIO_ITEMS.map((s, idx) => (
                <div key={idx} className="border border-purple-100 rounded-xl p-3 flex gap-3">
                  <span className="text-3xl shrink-0">{s.icon}</span>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-gray-800 mb-1">{s.title}</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </section>
      </main>
    </div>
  );
}
