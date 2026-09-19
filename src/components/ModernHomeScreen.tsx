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
  Network,
  Contact,
  Binary,
  type LucideIcon,
} from 'lucide-react';
import { HelpModal } from './HelpModal';
import { helpTexts } from '@/data/helpTexts';
import { UserAvatar } from './UserAvatar';

// ===== Типы =====

type SectionId =
  | 'timer'
  | 'generator'
  | 'noise'
  | 'flashcards'
  | 'wordsearch'
  | 'cardmaker'
  | 'postermaker'
  | 'numbersystems'
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
  | 'visualschedule'
  | 'tournament';

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
  { id: 'planning', title: 'Планирование', icon: Clock, gradient: 'from-blue-500 to-cyan-500' },
  { id: 'activities', title: 'Активности', icon: Users, gradient: 'from-purple-500 to-pink-500' },
  { id: 'generators', title: 'Генераторы', icon: Sparkles, gradient: 'from-amber-500 to-orange-500' },
  { id: 'tools', title: 'Инструменты', icon: Calculator, gradient: 'from-green-500 to-emerald-500' },
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
    title: 'Расписание',
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
    title: 'Активность',
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
    id: 'tournament',
    title: 'Турнирная сетка',
    description: 'Плей-офф и круговой',
    hint: 'Турнирная сетка на выбывание с автопроходами и матчем за 3 место, круговой турнир с автоматической таблицей. Счёт матчей, печать, копирование результатов, сохранение турниров.',
    icon: Network,
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
    id: 'cardmaker',
    title: 'Карточки',
    description: 'Конструктор и печать',
    hint: 'Конструктор карточек: 8 тем оформления, фоны (цвет/градиент/узоры), рамки, шрифты, эмодзи и фото, 5 пропорций, лист A4/A5, метки реза, двусторонняя печать с рубашкой, пакетный ввод, PNG и PDF, сохранение колод.',
    icon: Contact,
    category: 'generators',
  },
  {
    id: 'postermaker',
    title: 'Постер',
    description: 'Разделение изображения',
    hint: 'Разделите изображение на несколько страниц для печати большого постера. Настройка сетки (до 6×6), форматы бумаги (A4/A3/Letter/Legal), перекрытие для склейки, метки реза, нумерация страниц. Экспорт в PDF.',
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
    title: 'Граф. диктант',
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
    title: 'Библиография',
    description: 'Источники по ГОСТу',
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
    id: 'numbersystems',
    title: 'Системы счисления',
    description: 'Конвертер и справочник',
    hint: 'Конвертер чисел между 12 системами счисления: двоичная, восьмеричная, десятичная, шестнадцатеричная, римская, древнегреческая (ионическая), славянская кириллическая, египетская, вавилонская, майя, 36-ричная и произвольное основание. Справочник, таблица соответствий, FAQ.',
    icon: Binary,
    category: 'tools',
  },
  {
    id: 'teleprompter',
    title: 'Телесуфлер',
    description: 'Чтение и запись',
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
    description: 'Инструкции',
    hint: 'Подробное руководство по использованию всех инструментов приложения.',
    icon: BookOpen,
    category: 'tools',
  },
  {
    id: 'lifebalance',
    title: 'Баланс жизни',
    description: 'Саморефлексия',
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
        if (Array.isArray(arr)) return arr.slice(0, 6);
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
      return [id, ...filtered].slice(0, 6);
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

  // Группировка инструментов по категориям
  const groupedSections = useMemo(() => {
    const groups: Record<CategoryId, Section[]> = {
      planning: [],
      activities: [],
      generators: [],
      tools: [],
      selfcare: [],
    };
    filteredSections.forEach(s => {
      groups[s.category].push(s);
    });
    return groups;
  }, [filteredSections]);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 flex flex-col">
      {/* Шапка */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
                {getGreeting()}
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
                aria-label="Настройки"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={onSwitchToClassic}
                className="hidden sm:flex px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                Классический вид
              </button>
              <UserAvatar size="sm" />
            </div>
          </div>

          {/* Поиск */}
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:border-purple-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all text-sm"
            />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        {/* Быстрый доступ: Избранное + Недавние */}
        {(favoriteSections.length > 0 || recentSections.length > 0) && !searchQuery && selectedCategory === 'all' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Избранное */}
            {favoriteSections.length > 0 && (
              <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/60">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-semibold text-slate-700">Избранное</h2>
                  <span className="text-xs text-slate-400">({favoriteSections.length})</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {favoriteSections.slice(0, 8).map(section => {
                    const Icon = section.icon;
                    const category = CATEGORIES.find(c => c.id === section.category);
                    return (
                      <button
                        key={section.id}
                        onClick={() => handleNavigate(section.id)}
                        className="group relative flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
                        title={section.title}
                      >
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${category?.gradient} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[11px] font-medium text-slate-700 text-center line-clamp-1 w-full">
                          {section.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Недавние */}
            {recentSections.length > 0 && (
              <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/60">
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-blue-500" />
                  <h2 className="text-sm font-semibold text-slate-700">Недавние</h2>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {recentSections.map(section => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => handleNavigate(section.id)}
                        className="group flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                        title={section.title}
                      >
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                          <Icon className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-[11px] font-medium text-slate-700 text-center line-clamp-1 w-full">
                          {section.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Все инструменты по категориям */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-700">Все инструменты</h2>
            <span className="text-xs text-slate-400">({filteredSections.length})</span>
          </div>

          {/* Фильтр категорий */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`shrink-0 px-3 py-1.5 rounded-lg font-medium text-xs transition-all ${
                selectedCategory === 'all'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
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
                  className={`shrink-0 px-3 py-1.5 rounded-lg font-medium text-xs transition-all flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? `bg-gradient-to-r ${cat.gradient} text-white shadow-sm`
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cat.title}
                </button>
              );
            })}
          </div>

          {/* Группы по категориям */}
          {selectedCategory === 'all' ? (
            <>
              {CATEGORIES.map(cat => {
                const sections = groupedSections[cat.id];
                if (sections.length === 0) return null;
                return (
                  <div key={cat.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-1 h-4 rounded-full bg-gradient-to-b ${cat.gradient}`} />
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {cat.title}
                      </h3>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                      {sections.map(section => {
                        const Icon = section.icon;
                        const isFavorite = favorites.has(section.id);
                        return (
                          <div key={section.id} className="group relative">
                            <button
                              onClick={() => handleNavigate(section.id)}
                              className="w-full flex flex-col items-center gap-2 p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/60 hover:border-purple-300 shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-purple-400"
                            >
                              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${cat.gradient} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                                <Icon className="w-6 h-6 text-white" />
                              </div>
                              <span className="text-xs font-medium text-slate-700 text-center line-clamp-2 leading-tight">
                                {section.title}
                              </span>
                            </button>
                            {section.isTest && (
                              <span className="absolute top-1 left-1 bg-amber-400 text-amber-900 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                тест
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveHelpModal(section.id);
                              }}
                              className="absolute top-1 right-1 p-1 rounded bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                              aria-label={`Подсказка: ${section.title}`}
                            >
                              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                            {isFavorite && (
                              <div className="absolute bottom-1 right-1">
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {filteredSections.map(section => {
                const Icon = section.icon;
                const category = CATEGORIES.find(c => c.id === section.category);
                const isFavorite = favorites.has(section.id);
                return (
                  <div key={section.id} className="group relative">
                    <button
                      onClick={() => handleNavigate(section.id)}
                      className="w-full flex flex-col items-center gap-2 p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/60 hover:border-purple-300 shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-purple-400"
                    >
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${category?.gradient} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-xs font-medium text-slate-700 text-center line-clamp-2 leading-tight">
                        {section.title}
                      </span>
                    </button>
                    {section.isTest && (
                      <span className="absolute top-1 left-1 bg-amber-400 text-amber-900 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                        тест
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveHelpModal(section.id);
                      }}
                      className="absolute top-1 right-1 p-1 rounded bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                      aria-label={`Подсказка: ${section.title}`}
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    {isFavorite && (
                      <div className="absolute bottom-1 right-1">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {filteredSections.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200/60">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm font-medium">Ничего не найдено</p>
              <p className="text-slate-400 text-xs mt-1">Попробуйте изменить запрос или категорию</p>
            </div>
          )}
        </section>
      </main>

      {/* Подвал */}
      <footer className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 text-center">
        <p className="text-xs text-slate-500">
          Проект{' '}
          <a
            href="https://vk.ru/aaatapin"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 hover:text-purple-700 font-semibold underline underline-offset-2 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 rounded"
          >
            Алексея Атапина
          </a>
        </p>
      </footer>

      {/* Модальное окно настроек */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Настройки</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-purple-50 rounded-lg p-3">
                <h3 className="font-semibold text-purple-900 text-sm mb-1.5">Внешний вид</h3>
                <p className="text-xs text-purple-700 mb-2.5">
                  Современный стиль с категориями
                </p>
                <button
                  onClick={() => {
                    setShowSettings(false);
                    onSwitchToClassic();
                  }}
                  className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Классический вид
                </button>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <h3 className="font-semibold text-blue-900 text-sm mb-1.5">Сообщество</h3>
                <a
                  href="https://vk.ru/topteach"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-800 font-medium"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  ВКонтакте
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
