import { useState } from 'react';
import { Clock, Dices, Volume2, Layers, HelpCircle, Grid3x3, BookOpen, Calculator, Trophy } from 'lucide-react';
import { HelpModal } from './HelpModal';
import { helpTexts } from '@/data/helpTexts';

interface HomeScreenProps {
  onNavigate: (route: 'timer' | 'generator' | 'noise' | 'flashcards' | 'wordsearch' | 'manual' | 'calculators' | 'bingo' | 'edugame') => void;
}

export default function HomeScreen({ onNavigate }: HomeScreenProps) {
  const [activeHelpModal, setActiveHelpModal] = useState<string | null>(null);

  const sections = [
    {
      id: 'timer',
      title: 'Таймер урока',
      description: 'Шаблоны и этапы',
      hint: 'Шаблоны урока с этапами: разминка, объяснение, практика, закрепление. Готовые сценарии + свой.',
      icon: Clock,
    },
    {
      id: 'generator',
      title: 'Жеребьёвка',
      description: 'Случайный выбор',
      hint: 'Выбор ученика рулеткой, деление класса на группы и случайная рассадка по партам. Импорт/экспорт списков, чередование по полу.',
      icon: Dices,
    },
    {
      id: 'noise',
      title: 'Контроль шума',
      description: 'Шумометр',
      hint: 'Измеритель уровня шума в классе с визуализацией: шарики, смайлики или пузыри. Звуковое оповещение при превышении порога.',
      icon: Volume2,
    },
    {
      id: 'flashcards',
      title: 'Флэш-карточки',
      description: 'Колоды и изучение',
      hint: 'Интервальное повторение: создавайте колоды, изучайте карточки, проходите тесты с выбором ответа, вводом текста и соответствием. Готовые колоды и режим проектора.',
      icon: Layers,
    },
    {
      id: 'wordsearch',
      title: 'Филворды',
      description: 'Поиск слов',
      hint: 'Генератор филвордов с ответами. Пакетная генерация до 30 вариантов, скачивание PNG и PDF, отправка в мессенджер.',
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
      description: 'Закрывай карточку и выигрывай',
      hint: 'Бинго — конструктор карточек с настраиваемыми параметрами: размер сетки, количество карточек, свободная клетка. Готовые наборы (1 сентября, история, Новый год), режим проектора для ведущего, скачивание PDF для печати, методичка со сценариями использования.',
      icon: Grid3x3,
    },
    {
      id: 'edugame',
      title: 'Своя игра',
      description: 'Интеллектуальная викторина',
      hint: 'Своя игра — интеллектуальная викторина по принципу телевизионной игры: режим разработчика для создания игр, проектор с табло и начислением баллов, индивидуальный рейтинг участников, двусторонняя печать карточек для игры без компьютера, обмен играми между учителями через JSON.',
      icon: Trophy,
    },
  ];

  return (
    <div className="min-h-[100dvh] notebook-bg flex flex-col">
      <header className="max-w-md mx-auto w-full px-5 pt-3 pb-4">
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={() => onNavigate('manual')}
            className="text-gray-400 hover:text-purple-600 transition-colors p-1"
            aria-label="Руководство по использованию"
          >
            <BookOpen className="w-5 h-5" />
          </button>

          <p className="text-sm text-gray-500">
            Проект{' '}
            <a
              href="https://vk.ru/aaatapin"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-800 font-semibold underline transition-colors"
            >
              Алексея Атапина
            </a>
          </p>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-purple-700 text-center whitespace-nowrap">
          Помощник учителя
        </h1>

        <p className="text-sm sm:text-base text-gray-500 text-center whitespace-nowrap my-1">
          Простые инструменты для сложных задач
        </p>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-5 pb-5">
        {/* СЕТКА 3×3 с увеличенными шрифтами и подсказками */}
        <div className="grid grid-cols-3 gap-3">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.id} className="relative">
                <button
                  onClick={() => onNavigate(section.id as any)}
                  className="w-full bg-gradient-to-br from-purple-500 to-violet-600 text-white rounded-2xl p-3 min-h-[140px] flex flex-col items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform touch-manipulation"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-center">
                    <h2 className="text-base sm:text-[17px] font-bold leading-tight">{section.title}</h2>
                    <p className="text-white/85 text-xs sm:text-[13px] mt-1 leading-tight">{section.description}</p>
                  </div>
                </button>
                <button
                  onClick={() => setActiveHelpModal(section.id)}
                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/30 hover:bg-white/50 flex items-center justify-center transition-all duration-200"
                  aria-label="Подсказка"
                >
                  <HelpCircle className="w-4 h-4 text-white" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Ссылка на сообщество — по центру */}
        <div className="mt-4 mb-1 text-center">
          <a
            href="https://max.ru/channel_topteach"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-600 hover:text-purple-600 font-medium transition-colors underline decoration-dotted underline-offset-4"
          >
            Наше сообщество: вопросы и новости здесь
          </a>
        </div>
      </main>

      <HelpModal
        isOpen={activeHelpModal !== null}
        onClose={() => setActiveHelpModal(null)}
        title={activeHelpModal ? helpTexts[activeHelpModal as keyof typeof helpTexts]?.title || '' : ''}
        content={
          activeHelpModal
            ? (sections.find((s) => s.id === activeHelpModal)?.hint ||
                helpTexts[activeHelpModal as keyof typeof helpTexts]?.content ||
                'Описание скоро появится')
            : ''
        }
      />
    </div>
  );
}
