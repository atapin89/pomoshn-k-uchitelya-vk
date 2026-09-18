import { useState, useMemo, useEffect } from 'react';
import {
  Clock,
  Dices,
  Volume2,
  Layers,
  HelpCircle,
  Grid3x3,
  BookOpen,
  Box,
  Package,
  MonitorPlay,
  Cloud,
  PenTool,
  Calculator,
  Trophy,
  LayoutGrid,
  Users,
  Timer,
  Settings,
  FlaskConical,
  X,
  Sparkles,
  QrCode,
  BookText,
  CalendarDays,
  Search,
  Star,
  TrendingUp,
  History,
  type LucideIcon,
} from 'lucide-react';
import { HelpModal } from './HelpModal';
import { helpTexts } from '@/data/helpTexts';

// ===== Типы =====

type SectionId =
  | 'timer'
  | 'generator'
  | 'noise'
  | 'flashcards'
  | 'wordsearch'
  | 'manual'
  | 'calculators'
  | 'bingo'
  | 'edugame'
  | 'activity'
  | 'pomodoro'
  | 'dice'
  | 'equipment'
  | 'teleprompter'
  | 'wordcloud'
  | 'graphdictation'
  | 'lifebalance'
  | 'qrcode'
  | 'bibliography'
  | 'visualschedule';

type CategoryId = 'planning' | 'activities' | 'generators' | 'tools' | 'selfcare';

interface Section {
  id: SectionId;
  title: string;
  description: string;
  hint: string;
  icon: LucideIcon;
  category: CategoryId;
  isTest?: boolean;
}

interface ModernHomeScreenProps {
  onNavigate: (route: SectionId) => void;
  onSwitchToClassic: () => void;
}

const FAVORITES_KEY = 'home-favorites';
const RECENT_KEY = 'home-recent';

// ===== Категории =====

const CATEGORIES: { id: CategoryId; title: string; icon: LucideIcon; gradient: string }[] = [
  { id: 'planning', title: 'Планирование и время', icon: Clock, gradient: 'from-blue-500 to-cyan-500' },
  { id: 'activities', title: 'Активности на уроке', icon: Users, gradient: 'from-purple-500 to-pink-500' },
  { id: 'generators', title: 'Генераторы и печать', icon: Sparkles, gradient: 'from-amber-500 to-orange-500' },
  { id: 'tools', title: 'Инструменты педагога', icon: Calculator, gradient: 'from-green-500 to-emerald-500' },
  { id: 'selfcare', title: 'Для себя', icon: TrendingUp, gradient: 'from-indigo-500 to-violet-500' },
];

// ===== Данные =====

const SECTIONS: Section[] = [
  {
    id: 'timer',
    title: 'Таймер урока',
    description: 'Шаблоны и этапы',
    hint: 'Шаблоны урока с этапами: разминка, объяснение, практика, закрепление. Готовые сценарии + свой.',
    icon: Clock,
    category: 'planning',
  },
  {
    id: 'pomodoro',
    title: 'Помодоро',
    description: 'Фокус и перерывы',
    hint: 'Техника Помодоро: работайте 25 минут, отдыхайте 5. Список задач, статистика, настройка интервалов.',
    icon: Timer,
    category: 'planning',
  },
  {
    id: 'visualschedule',
    title: 'Визуальное расписание',
    description: 'Пиктограммы',
    hint: 'Создание визуальных расписаний с пиктограммами для детей с РАС и ОВЗ. 150+ билингвальных пиктограмм (RU/EN) в 9 категориях. 4 шаблона. Экспорт в PNG и PDF.',
    icon: CalendarDays,
    category: 'planning',
  },
  {
    id: 'generator',
    title: 'Жеребьёвка',
    description: 'Случайный выбор',
    hint: 'Выбор ученика рулеткой, деление класса на группы и случайная рассадка по партам. Импорт/экспорт списков.',
    icon: Dices,
    category: 'activities',
  },
  {
    id: 'noise',
    title: 'Контроль шума',
    description: 'Шумометр',
    hint: 'Измеритель уровня шума в классе с визуализацией: шарики, смайлики или пузыри. Звуковое оповещение.',
    icon: Volume2,
    category: 'activities',
  },
  {
    id: 'activity',
    title: 'Счётчик активности',
    description: 'Опрос учеников',
    hint: 'Отслеживайте, кого опросили и кто был активен. Счётчик ответов. Сводка в конце урока.',
    icon: Users,
    category: 'activities',
  },
  {
    id: 'flashcards',
    title: 'Флэш-карточки',
    description: 'Изучение и запоминание',
    hint: 'Интервальное повторение: создавайте колоды, изучайте карточки, проходите тесты.',
    icon: Layers,
    category: 'activities',
  },
  {
    id: 'bingo',
    title: 'Бинго',
    description: 'Закрывай карточку',
    hint: 'Конструктор карточек для игры в бинго. Готовые наборы, режим проектора, PDF для печати.',
    icon: LayoutGrid,
    category: 'activities',
  },
  {
    id: 'edugame',
    title: 'Своя игра',
    description: 'Викторина',
    hint: 'Интеллектуальная викторина: раунды, баллы, рейтинг, печать карточек, обмен играми.',
    icon: Trophy,
    category: 'activities',
  },
  {
    id: 'wordsearch',
    title: 'Филворды',
    description: 'Поиск слов',
    hint: 'Генератор филвордов с ответами. Пакетная генерация до 30 вариантов, скачивание PNG и PDF.',
    icon: Grid3x3,
    category: 'generators',
  },
  {
    id: 'wordcloud',
    title: 'Облако слов',
    description: 'Генератор облаков',
    hint: 'Генератор облаков слов с 5 формами, 6 палитрами, 9 шрифтами + Google Fonts. Экспорт PNG (до 4K), SVG, JSON.',
    icon: Cloud,
    category: 'generators',
  },
  {
    id: 'graphdictation',
    title: 'Графический диктант',
    description: 'Рисование по клеткам',
    hint: 'Развивающее упражнение для детей 5-9 лет. Рисование линий по клеткам по устным инструкциям.',
    icon: PenTool,
    category: 'generators',
  },
  {
    id: 'dice',
    title: 'Кубики',
    description: 'Конструктор кубиков',
    hint: 'Создавайте и печатайте игральные кубики: текст, картинки или два кубика на листе. PDF для печати.',
    icon: Box,
    category: 'generators',
  },
  {
    id: 'qrcode',
    title: 'QR-коды',
    description: 'Генератор кодов',
    hint: 'Создание QR-кодов: текст, ссылки, WiFi для класса, email, телефон, визитки vCard. Скачивание PNG и SVG.',
    icon: QrCode,
    category: 'generators',
  },
  {
    id: 'bibliography',
    title: 'Источники по ГОСТу',
    description: 'Библиография',
    hint: 'Оформление списка литературы по действующим ГОСТам. 12 типов источников. Экспорт в Word (.doc) и текст (.txt).',
    icon: BookText,
    category: 'tools',
  },
  {
    id: 'calculators',
    title: 'Калькуляторы',
    description: 'Баллы, СОУ, тесты',
    hint: 'Подсчёт баллов, СОУ и качества знаний по классу. Генератор тестов с экспортом в PDF.',
    icon: Calculator,
    category: 'tools',
  },
  {
    id: 'teleprompter',
    title: 'Телесуфлер',
    description: 'Чтение и запись с экрана',
    hint: 'Профессиональный телесуфлер: плавная прокрутка текста, скорость 0.5–3×, темы, зеркалирование, таймер выступления, веб-камера и запись видео.',
    icon: MonitorPlay,
    category: 'tools',
  },
  {
    id: 'equipment',
    title: 'Оборудование',
    description: 'Учёт выдачи',
    hint: 'Учёт выдачи и возврата учебных принадлежностей. Статистика в реальном времени, список «на руках», история выдач.',
    icon: Package,
    category: 'tools',
  },
  {
    id: 'manual',
    title: 'Руководство',
    description: 'Инструкции и помощь',
    hint: 'Подробное руководство по использованию всех инструментов приложения.',
    icon: BookOpen,
    category: 'tools',
  },
  {
    id: 'lifebalance',
    title: 'Колесо баланса',
    description: 'Саморефлексия педагога',
    hint: 'Оцените 8 сфер жизни от 1 до 10. Интерактивное колесо покажет перекосы, даст персональные рекомендации и позволит скачать результат.',
    icon: Sparkles,
    category: 'selfcare',
  },
];

// ===== Компонент =====

export default function ModernHomeScreen({ onNavigate, onSwitchToClassic }: ModernHomeScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [activeHelpModal, setActiveHelpModal] = useState<SectionId | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const [favorites, setFavorites] = useState<Set<SectionId>>(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as SectionId[];
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch {}
    return new Set();
  });

  const [recent, setRecent] = useState<SectionId[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as SectionId[];
        if (Array.isArray(arr)) return arr.slice(0, 5);
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
    } catch {}
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    } catch {}
  }, [recent]);

  const toggleFavorite = (id: SectionId) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleNavigate = (id: SectionId) => {
    setRecent(prev => {
      const filtered = prev.filter(r => r !== id);
      return [id, ...filtered].slice(0, 5);
    });
    onNavigate(id);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return 'Доброй ночи';
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    return 'Добрый вечер';
  };

  const filteredSections = useMemo(() => {
    let sections = SECTIONS;

    if (selectedCategory !== 'all') {
      sections = sections.filter(s => s.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      sections = sections.filter(
        s =>
          s.title.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          s.hint.toLowerCase().includes(query)
      );
    }

    return sections;
  }, [selectedCategory, searchQuery]);

  const favoriteSections = useMemo(() => {
    return SECTIONS.filter(s => favorites.has(s.id));
  }, [favorites]);

  const recentSections = useMemo(() => {
    return recent
      .map(id => SECTIONS.find(s => s.id === id))
      .filter((s): s is Section => !!s);
  }, [recent]);

  const activeSection = SECTIONS.find((s) => s.id === activeHelpModal);

  const getHelpTitle = (): string => {
    if (!activeHelpModal) return '';
    const helpText = helpTexts[activeHelpModal as keyof typeof helpTexts];
    if (helpText?.title) return helpText.title;
    return activeSection?.title || 'Помощь';
  };

  const getHelpContent = (): string => {
    if (!activeHelpModal) return '';
    return activeSection?.hint || 'Описание скоро появится';
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex flex-col">
      {/* Шапка */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-purple-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
                {getGreeting()}! 👋
              </h1>
              <p className="text-sm text-gray-600 mt-1">Чем займёмся сегодня?</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowSettings(true)}
                className="p-2.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
                aria-label="Настройки"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={onSwitchToClassic}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                Классический вид
              </button>
            </div>
          </div>

          {/* Поиск */}
          <div className="mt-4 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск инструментов..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border-2 border-purple-200 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all"
            />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Избранное */}
        {favoriteSections.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-6 h-6 text-amber-500" />
              <h2 className="text-xl font-bold text-gray-900">Избранное</h2>
              <span className="text-sm text-gray-500">({favoriteSections.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favoriteSections.map(section => {
                const Icon = section.icon;
                return (
                  <div
                    key={section.id}
                    className="group relative bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg border-2 border-amber-200 hover:border-amber-400 transition-all"
                  >
                    <button
                      onClick={() => handleNavigate(section.id)}
                      className="w-full text-left focus:outline-none"
                    >
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 truncate">{section.title}</h3>
                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{section.description}</p>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => toggleFavorite(section.id)}
                      className="absolute top-3 right-3 p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 transition-colors"
                      aria-label="Убрать из избранного"
                    >
                      <Star className="w-4 h-4 text-amber-600 fill-amber-600" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Недавно использованные */}
        {recentSections.length > 0 && !searchQuery && selectedCategory === 'all' && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <History className="w-6 h-6 text-blue-500" />
              <h2 className="text-xl font-bold text-gray-900">Недавно использованные</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {recentSections.map(section => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => handleNavigate(section.id)}
                    className="bg-white rounded-xl p-3 shadow-sm hover:shadow-md border border-blue-200 hover:border-blue-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <div className="flex items-center gap-2">
                      <div className="shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{section.title}</h3>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Все инструменты */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <LayoutGrid className="w-6 h-6 text-purple-500" />
            <h2 className="text-xl font-bold text-gray-900">Все инструменты</h2>
            <span className="text-sm text-gray-500">({filteredSections.length})</span>
          </div>

          {/* Фильтр категорий */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`shrink-0 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                selectedCategory === 'all'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-purple-50 border border-gray-200'
              }`}
            >
              Все
            </button>
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`shrink-0 px-4 py-2 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
                    selectedCategory === cat.id
                      ? `bg-gradient-to-r ${cat.gradient} text-white shadow-md`
                      : 'bg-white text-gray-700 hover:bg-purple-50 border border-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {cat.title}
                </button>
              );
            })}
          </div>

          {/* Карточки инструментов */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSections.map(section => {
              const Icon = section.icon;
              const isFavorite = favorites.has(section.id);
              const category = CATEGORIES.find(c => c.id === section.category);

              return (
                <div
                  key={section.id}
                  className="group relative bg-white rounded-2xl p-5 shadow-sm hover:shadow-xl border border-gray-200 hover:border-purple-300 transition-all"
                >
                  <button
                    onClick={() => handleNavigate(section.id)}
                    className="w-full text-left focus:outline-none"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${category?.gradient || 'from-purple-500 to-pink-500'} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-lg text-gray-900 group-hover:text-purple-700 transition-colors">
                            {section.title}
                          </h3>
                          {section.isTest && (
                            <span className="shrink-0 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-md flex items-center gap-1">
                              <FlaskConical className="w-3 h-3" />
                              тест
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => setActiveHelpModal(section.id)}
                      className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-purple-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 rounded-lg px-2 py-1"
                      aria-label={`Подсказка: ${section.title}`}
                    >
                      <HelpCircle className="w-4 h-4" />
                      <span className="font-medium">Подробнее</span>
                    </button>
                    <button
                      onClick={() => toggleFavorite(section.id)}
                      className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                        isFavorite
                          ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                          : 'bg-gray-100 text-gray-400 hover:bg-amber-50 hover:text-amber-600'
                      }`}
                      aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
                    >
                      <Star className={`w-5 h-5 ${isFavorite ? 'fill-amber-600' : ''}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredSections.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Ничего не найдено</p>
              <p className="text-gray-400 text-sm mt-2">Попробуйте изменить поисковый запрос или выбрать другую категорию</p>
            </div>
          )}
        </section>
      </main>

      {/* Подвал */}
      <footer className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 text-center">
        <p className="text-sm text-gray-500">
          Проект{' '}
          <a
            href="https://vk.ru/aaatapin"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 hover:text-purple-800 font-semibold underline underline-offset-2 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 rounded"
          >
            Алексея Атапина
          </a>
        </p>
      </footer>

      {/* Модальное окно настроек */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Настройки</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-purple-50 rounded-xl p-4">
                <h3 className="font-semibold text-purple-900 mb-2">Внешний вид</h3>
                <p className="text-sm text-purple-700 mb-3">
                  Вы используете современный стиль с категоризацией и поиском
                </p>
                <button
                  onClick={() => {
                    setShowSettings(false);
                    onSwitchToClassic();
                  }}
                  className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors"
                >
                  Переключиться на классический вид
                </button>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Сообщество</h3>
                <a
                  href="https://vk.ru/topteach"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-700 hover:text-blue-900 font-medium"
                >
                  <BookOpen className="w-4 h-4" />
                  Перейти в сообщество ВКонтакте
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <HelpModal
        isOpen={activeHelpModal !== null}
        onClose={() => setActiveHelpModal(null)}
        title={getHelpTitle()}
        content={getHelpContent()}
      />
    </div>
  );
}
