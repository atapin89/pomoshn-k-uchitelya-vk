import { useState, useEffect } from 'react';
import { 
  Clock, 
  Dices, 
  Volume2, 
  Layers, 
  HelpCircle, 
  Grid3x3, 
  BookOpen, 
  Calculator, 
  Trophy,
  LayoutGrid,
  Users,
  Timer,
  Triangle,
  Settings,
  Eye,
  EyeOff,
  FlaskConical,
  X,
  Check,
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
  | 'tarsia';

interface Section {
  id: SectionId;
  title: string;
  description: string;
  hint: string;
  icon: LucideIcon;
  isTest?: boolean;
}

interface HomeScreenProps {
  onNavigate: (route: SectionId) => void;
}

const VISIBILITY_KEY = 'home-visible-sections';

// ===== Данные =====

const SECTIONS: Section[] = [
  {
    id: 'timer',
    title: 'Таймер урока',
    description: 'Шаблоны и этапы',
    hint: 'Шаблоны урока с этапами: разминка, объяснение, практика, закрепление. Готовые сценарии + свой.',
    icon: Clock,
  },
  {
    id: 'pomodoro',
    title: 'Помодоро',
    description: 'Фокус и перерывы',
    hint: 'Техника Помодоро: работайте 25 минут, отдыхайте 5. Список задач, статистика, настройка интервалов.',
    icon: Timer,
  },
  {
    id: 'generator',
    title: 'Жеребьёвка',
    description: 'Случайный выбор',
    hint: 'Выбор ученика рулеткой, деление класса на группы и случайная рассадка по партам. Импорт/экспорт списков.',
    icon: Dices,
  },
  {
    id: 'noise',
    title: 'Контроль шума',
    description: 'Шумометр',
    hint: 'Измеритель уровня шума в классе с визуализацией: шарики, смайлики или пузыри. Звуковое оповещение.',
    icon: Volume2,
  },
  {
    id: 'flashcards',
    title: 'Флэш-карточки',
    description: 'Изучение и запоминание',
    hint: 'Интервальное повторение: создавайте колоды, изучайте карточки, проходите тесты.',
    icon: Layers,
  },
  {
    id: 'tarsia',
    title: 'Тарсия пазлы',
    description: 'Головоломки',
    hint: 'Создавайте головоломки-тарсия: треугольники, шестиугольники, домино. Вопрос-ответ на гранях. PDF и PNG для печати.',
    icon: Triangle,
    isTest: true,
  },
  {
    id: 'wordsearch',
    title: 'Филворды',
    description: 'Поиск слов',
    hint: 'Генератор филвордов с ответами. Пакетная генерация до 30 вариантов, скачивание PNG и PDF.',
    icon: Grid3x3,
  },
  {
    id: 'calculators',
    title: 'Калькуляторы',
    description: 'Баллы, СОУ, тесты',
    hint: 'Подсчёт баллов, СОУ и качества знаний по классу. Генератор тестов с экспортом в PDF.',
    icon: Calculator,
  },
  {
    id: 'bingo',
    title: 'Бинго',
    description: 'Закрывай карточку',
    hint: 'Конструктор карточек для игры в бинго. Готовые наборы, режим проектора, PDF для печати.',
    icon: LayoutGrid,
  },
  {
    id: 'edugame',
    title: 'Своя игра',
    description: 'Викторина',
    hint: 'Интеллектуальная викторина: раунды, баллы, рейтинг, печать карточек, обмен играми.',
    icon: Trophy,
  },
  {
    id: 'activity',
    title: 'Счётчик активности',
    description: 'Опрос учеников',
    hint: 'Отслеживайте, кого опросили и кто был активен. Счётчик ответов. Сводка в конце урока.',
    icon: Users,
  },
];

// ===== Компонент =====

export default function HomeScreen({ onNavigate }: HomeScreenProps) {
  const [activeHelpModal, setActiveHelpModal] = useState<SectionId | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  const [visibleSections, setVisibleSections] = useState<Set<SectionId>>(() => {
    try {
      const raw = localStorage.getItem(VISIBILITY_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as SectionId[];
        if (Array.isArray(arr) && arr.length > 0) {
          return new Set(arr);
        }
      }
    } catch {
      // ignore
    }
    return new Set(SECTIONS.map(s => s.id));
  });

  useEffect(() => {
    try {
      localStorage.setItem(VISIBILITY_KEY, JSON.stringify([...visibleSections]));
    } catch {
      // ignore
    }
  }, [visibleSections]);

  const toggleSectionVisibility = (id: SectionId) => {
    setVisibleSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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

  const visibleSectionsList = SECTIONS.filter(s => visibleSections.has(s.id));

  return (
    <div className="min-h-[100dvh] notebook-bg flex flex-col">
      <header className="max-w-md mx-auto w-full px-5 pt-12 sm:pt-10 pb-6">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => onNavigate('manual')}
            className="text-gray-400 hover:text-purple-600 transition-colors p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
            aria-label="Руководство по использованию"
            title="Руководство"
          >
            <BookOpen className="w-5 h-5" />
          </button>

          <p className="text-sm text-gray-500">
            Проект{' '}
            <a
              href="https://vk.ru/aaatapin"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-800 font-semibold underline transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 rounded"
            >
              Алексея Атапина
            </a>
          </p>

          <button
            onClick={() => setShowSettings(true)}
            className="text-gray-400 hover:text-purple-600 transition-colors p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
            aria-label="Настроить отображение разделов"
            title="Настроить разделы"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-purple-700 text-center whitespace-nowrap mt-6">
          Помощник учителя
        </h1>

        <p className="text-sm sm:text-base text-gray-500 text-center whitespace-nowrap my-1">
          Простые инструменты для сложных задач
        </p>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-5 pb-5">
        <div className="grid grid-cols-3 gap-3 mt-2">
          {visibleSectionsList.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.id} className="relative">
                <button
                  onClick={() => onNavigate(section.id)}
                  className="w-full bg-gradient-to-br from-purple-500 to-violet-600 text-white rounded-2xl p-3 min-h-[140px] flex flex-col items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform touch-manipulation focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
                  aria-label={`${section.title} — ${section.description}`}
                >
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-center">
                    <h2 className="text-base sm:text-[17px] font-bold leading-tight">
                      {section.title}
                    </h2>
                    <p className="text-white/85 text-xs sm:text-[13px] mt-1 leading-tight">
                      {section.description}
                    </p>
                  </div>
                </button>

                {section.isTest && (
                  <span className="absolute top-1 left-1 bg-amber-400 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm flex items-center gap-0.5 z-10">
                    <FlaskConical className="w-3 h-3" />
                    тест
                  </span>
                )}

                <button
                  onClick={() => setActiveHelpModal(section.id)}
                  className="absolute top-1.5 right-1.5 p-2 rounded-full bg-white/30 hover:bg-white/50 flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white z-10"
                  aria-label={`Подсказка: ${section.title}`}
                  title="Подсказка"
                >
                  <HelpCircle className="w-4 h-4 text-white" />
                </button>
              </div>
            );
          })}
        </div>

        {visibleSectionsList.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm mb-3">Все разделы скрыты.</p>
            <button
              onClick={() => setShowSettings(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl px-4 py-2.5 text-sm"
            >
              Настроить отображение
            </button>
          </div>
        )}

        <div className="mt-4 mb-1 text-center">
          <a
            href="https://max.ru/channel_topteach"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-600 hover:text-purple-600 font-medium transition-colors underline decoration-dotted underline-offset-4 focus:outline-none focus:ring-2 focus:ring-purple-400 rounded"
          >
            Наше сообщество: вопросы и новости здесь
          </a>
        </div>
      </main>

      {/* Модальное окно настроек видимости */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md max-h-[85vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-xl font-bold text-purple-700">Настройка разделов</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-2">
              <p className="text-sm text-gray-500 mb-3">
                Отметьте разделы, которые хотите видеть на главном экране. Остальные будут скрыты.
              </p>
              {SECTIONS.map(section => {
                const Icon = section.icon;
                const isVisible = visibleSections.has(section.id);
                return (
                  <div
                    key={section.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${
                      isVisible ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-gray-50 opacity-70'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isVisible ? 'text-purple-600' : 'text-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${isVisible ? 'text-gray-800' : 'text-gray-500'}`}>
                        {section.title}
                      </p>
                      {section.isTest && (
                        <span className="text-[10px] text-amber-600 font-semibold">тестовый режим</span>
                      )}
                    </div>
                    <button
                      onClick={() => toggleSectionVisibility(section.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isVisible
                          ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                          : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                      }`}
                      aria-label={isVisible ? 'Скрыть раздел' : 'Показать раздел'}
                      title={isVisible ? 'Скрыть' : 'Показать'}
                    >
                      {isVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="p-5 border-t border-gray-200">
              <button
                onClick={() => setShowSettings(false)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" /> Готово
              </button>
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
