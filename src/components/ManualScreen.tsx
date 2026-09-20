import { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Check,
  Lightbulb,
  ArrowRight,
  Clock,
  Timer,
  Dices,
  Volume2,
  Layers,
  Grid3x3,
  Contact,
  Binary,
  Ruler,
  Radio,
  Calculator,
  LayoutGrid,
  Trophy,
  Network,
  Users,
  Box,
  Package,
  MonitorPlay,
  Cloud,
  PenTool,
  Sparkles,
  QrCode,
  BookText,
  CalendarDays,
  type LucideIcon,
} from 'lucide-react';
import BackButton from './BackButton';

// ===== Типы =====

type Cat = 'planning' | 'activities' | 'generators' | 'tools' | 'selfcare';

interface ManualEntry {
  id: string;
  title: string;
  icon: LucideIcon;
  cat: Cat;
  isNew?: boolean;
  about: string;
  features: string[];
  steps: string[];
  tip: string;
}

interface ManualScreenProps {
  onBack: () => void;
  onNavigate?: (route: string) => void;
}

const CATS: { id: Cat; title: string; gradient: string }[] = [
  { id: 'planning', title: 'Планирование', gradient: 'from-blue-500 to-cyan-500' },
  { id: 'activities', title: 'Активности', gradient: 'from-purple-500 to-pink-500' },
  { id: 'generators', title: 'Генераторы', gradient: 'from-amber-500 to-orange-500' },
  { id: 'tools', title: 'Инструменты', gradient: 'from-green-500 to-emerald-500' },
  { id: 'selfcare', title: 'Для себя', gradient: 'from-indigo-500 to-violet-500' },
];

// ===== Содержимое руководства =====

const ENTRIES: ManualEntry[] = [
  {
    id: 'timer', title: 'Таймер урока', icon: Clock, cat: 'planning',
    about: 'Таймер с этапами урока: разминка, объяснение, практика, закрепление. Готовые шаблоны и полностью свои сценарии.',
    features: ['Готовые шаблоны типовых уроков', 'Свои этапы: название, длительность, цвет', 'Звуковые сигналы и прогресс-бар', 'Полноэкранный режим для класса'],
    steps: ['Выберите шаблон или создайте свой', 'Настройте этапы и длительность', 'Нажмите «Старт» и следите за прогрессом'],
    tip: 'Создайте один шаблон под свой формат урока один раз — дальше он запускается в два касания.',
  },
  {
    id: 'pomodoro', title: 'Помодоро', icon: Timer, cat: 'planning',
    about: 'Техника Pomodoro для работы учителя: 25 минут фокуса, 5 минут отдыха, список задач и статистика.',
    features: ['Настраиваемые интервалы фокуса и перерывов', 'Список задач на сессию', 'Статистика завершённых помидоров', 'Сигналы о смене режима'],
    steps: ['Добавьте задачи (проверка тетрадей, план урока…)', 'Задайте длительность интервалов', 'Запустите сессию и работайте до сигнала'],
    tip: 'Планируйте не более 4 помидоров на одну большую задачу — так проще оценивать время.',
  },
  {
    id: 'generator', title: 'Жеребьёвка', icon: Dices, cat: 'activities',
    about: 'Случайный выбор ученика, деление класса на группы и случайная рассадка по партам.',
    features: ['Рулетка одного ученика', 'Деление на 2-8 групп', 'Случайная рассадка по партам', 'Импорт и экспорт списков класса'],
    steps: ['Введите или импортируйте список класса', 'Выберите режим: один / группы / парты', 'Запустите жеребьёвку — результат анимируется'],
    tip: 'Сохраните список класса один раз и экспортируйте его — другие разделы (активность, турниры) используют те же имена.',
  },
  {
    id: 'noise', title: 'Контроль шума', icon: Volume2, cat: 'activities',
    about: 'Шумометр класса: микрофон измеряет уровень шума, а класс видит наглядную визуализацию.',
    features: ['Три визуализации: шарики, смайлики, пузыри', 'Порог шума и звуковое оповещение', 'Светофорная индикация для детей', 'Таймер тихой работы'],
    steps: ['Разрешите доступ к микрофону', 'Выставьте порог под свой класс', 'Включите экран на проектор во время самостоятельной'],
    tip: 'Договоритесь с классом: три «красных» смайлика подряд = минута тишины всем классом.',
  },
  {
    id: 'flashcards', title: 'Флэш-карточки', icon: Layers, cat: 'activities',
    about: 'Колоды карточек с интервальным повторением: изучение, самопроверка и тесты.',
    features: ['Свои колоды: термин — определение', 'Режим изучения с переворотом', 'Режим теста с оценкой', 'Прогресс по каждой колоде'],
    steps: ['Создайте колоду и добавьте карточки', 'Пройдите колоду в режиме изучения', 'Закрепите материалом тестом'],
    tip: 'Давайте колоду ученикам на телефоны: прогресс сохраняется локально у каждого.',
  },
  {
    id: 'wordsearch', title: 'Филворды', icon: Grid3x3, cat: 'generators',
    about: 'Генератор головоломок «поиск слов» с ответами и пакетной печатью вариантов.',
    features: ['Сетка любого размера', 'До 30 вариантов одним пакетом', 'Лист ответов автоматически', 'Скачивание PNG и PDF'],
    steps: ['Введите список слов темы', 'Выберите размер сетки', 'Сгенерируйте и скачайте нужный вариант'],
    tip: 'Печатайте разные варианты для соседних парт — списывание становится бессмысленным.',
  },
  {
    id: 'cardmaker', title: 'Карточки', icon: Contact, cat: 'generators', isNew: true,
    about: 'Конструктор печатных карточек: темы оформления, фоны, рамки, эмодзи и фото, двусторонняя печать.',
    features: ['8 тем оформления и любые цвета фона', 'Узоры, рамки, 9 шрифтов', 'Эмодзи или своё фото на карточке', 'Лист A4/A5, метки реза, рубашка для двусторонней печати', 'Пакетный ввод и сохранение колод'],
    steps: ['Выберите тему и формат листа', 'Добавьте карточки вручную или пакетом', 'Нажмите «Печать» и разрежьте по меткам'],
    tip: 'Для двусторонних карточек включите рубашку и печатайте с переворотом стопки.',
  },
  {
    id: 'postermaker', title: 'Постер', icon: Grid3x3, cat: 'generators', isNew: true,
    about: 'Разрезает любое изображение на листы A4/A3, чтобы склеить большой постер для класса.',
    features: ['Сетка до 6×6 листов', 'Форматы A4/A3/Letter/Legal', 'Перекрытие 0-20 мм для аккуратной склейки', 'Метки реза и нумерация листов', 'PDF с точными размерами'],
    steps: ['Загрузите изображение', 'Выберите сетку и формат бумаги', 'Скачайте PDF, распечатайте и склейте по меткам'],
    tip: 'Перекрытие 5-10 мм и клей-карандаш по краю дают почти невидимый стык.',
  },
  {
    id: 'numbersystems', title: 'Системы счисления', icon: Binary, cat: 'tools', isNew: true,
    about: 'Конвертер чисел между 12 системами: от двоичной до римской, греческой, славянской, египетской и майя.',
    features: ['12 систем + произвольное основание', '4 представления: карточки, таблица, разложение, история', 'Скачивание таблицы перевода картинкой', 'Генератор заданий с печатным вариантом'],
    steps: ['Введите число в любой системе', 'Посмотрите его во всех системах сразу', 'Скачайте таблицу или сгенерируйте задания'],
    tip: 'Вид «Разложение» показывает число как сумму разрядов — идеально для объяснения темы на уроке.',
  },
  {
    id: 'unitconverter', title: 'Конвертер величин', icon: Ruler, cat: 'tools', isNew: true,
    about: 'Мгновенный перевод величин в 12 категориях: длина, масса, объём, температура, давление, данные и даже кухня.',
    features: ['~80 единиц в 12 категориях', 'Компактный список всех переводов сразу', 'Кнопка «значение как ввод» для цепочек переводов', 'Таблица перевода PNG и генератор заданий'],
    steps: ['Выберите категорию и введите значение', 'Скопируйте нужный перевод одной кнопкой', 'При необходимости распечатайте рабочий лист'],
    tip: 'Категория «Кухня» выручает на технологии: стаканы и ложки переводятся в граммы.',
  },
  {
    id: 'morse', title: 'Азбука Морзе', icon: Radio, cat: 'tools', isNew: true,
    about: 'Кодирование текста в морзе и обратно со звуковым воспроизведением и сигнальной лампой.',
    features: ['Текст ↔ морзе (русский и латиница)', 'Звук тона + мигающая лампа', 'Скорость 5-30 WPM и тон 400-1000 Гц', 'Таблица кодов и правила тайминга'],
    steps: ['Введите текст или морзе-код', 'Нажмите «Воспроизвести»', 'Меняйте скорость для тренировки на слух'],
    tip: 'Начните тренировку с 10 WPM и метода Коха: буквы учатся сразу на слух, а не по таблице.',
  },
  {
    id: 'tournament', title: 'Турнирная сетка', icon: Network, cat: 'activities', isNew: true,
    about: 'Турниры класса: сетка плей-офф с автопроходами или круговой турнир с автоматической таблицей.',
    features: ['Плей-офф с bye-автопроходами и матчем за 3 место', 'Круговой турнир: таблица очков и разницы', 'Счёт матчей и копирование результатов', 'Сохранение турниров и печать'],
    steps: ['Введите участников (списком или пакетом)', 'Выберите режим: сетка или круговой', 'Отмечайте победителей — сетка заполняется сама'],
    tip: 'Для викторин удобно: победитель пары определяется по итогам раунда вопросов «Своей игры».',
  },
  {
    id: 'calculators', title: 'Калькуляторы', icon: Calculator, cat: 'tools',
    about: 'Педагогические расчёты: баллы в оценку, СОУ и качество знаний, генератор тестов.',
    features: ['Баллы → оценка по шкале', 'СОУ и качество знаний по классу', 'Генератор тестов с экспортом в PDF'],
    steps: ['Введите баллы или результаты класса', 'Получите расчёт и статистику', 'Экспортируйте отчёт'],
    tip: 'Сохраняйте шкалу перевода баллов, которой пользуетесь весь год, — расчёты станут мгновенными.',
  },
  {
    id: 'bingo', title: 'Бинго', icon: LayoutGrid, cat: 'activities',
    about: 'Карточки бинго для уроков: готовые наборы и свои поля, режим проектора и печать.',
    features: ['Готовые тематические наборы', 'Свои поля карточек', 'Режим проектора для ведущего', 'PDF для печати класса'],
    steps: ['Выберите набор или введите свои слова', 'Сгенерируйте карточки', 'Распечатайте или включите проектор'],
    tip: 'Бинго на повторение лексики: ученики зачёркивают слово, услышав его перевод.',
  },
  {
    id: 'edugame', title: 'Своя игра', icon: Trophy, cat: 'activities',
    about: 'Интеллектуальная викторина в стиле «Своей игры»: раунды, ставки, рейтинг команд.',
    features: ['Раунды и категории с вопросами', 'Счёт и ставки команд', 'Рейтинг на экране', 'Печать карточек вопросов и обмен играми'],
    steps: ['Создайте игру: категории и вопросы', 'Добавьте команды', 'Играйте с экраном-табло'],
    tip: 'Обменивайтесь играми с коллегами: файл игры переносит все вопросы и настройки.',
  },
  {
    id: 'activity', title: 'Счётчик активности', icon: Users, cat: 'activities',
    about: 'Учёт опроса и активности учеников на уроке: кого спросили, кто отвечал.',
    features: ['Счётчики ответов по каждому ученику', 'Быстрые кнопки +/−', 'Сводка в конце урока'],
    steps: ['Загрузите список класса', 'Отмечайте ответы по ходу урока', 'Откройте сводку для объективности оценок'],
    tip: 'Сводка помогает заметить «невидимок», которых не спрашивали неделю.',
  },
  {
    id: 'dice', title: 'Кубики', icon: Box, cat: 'generators',
    about: 'Конструктор печатных кубиков: текст или картинки на гранях, развёртка для склейки.',
    features: ['Свои надписи и картинки на гранях', 'Два кубика на одном листе', 'Точки на фоне как у игральных', 'PDF для печати'],
    steps: ['Задайте содержимое граней', 'Выберите оформление', 'Распечатайте и склейте'],
    tip: 'Кубик с глаголами-действиями оживляет разминку на любом предмете.',
  },
  {
    id: 'equipment', title: 'Оборудование', icon: Package, cat: 'tools',
    about: 'Учёт выдачи и возврата учебного имущества: калькуляторы, линейки,Anything своё.',
    features: ['Карточка каждого предмета', 'Кто взял и когда', 'Список «на руках» и история', 'Статистика выдач'],
    steps: ['Добавьте предметы', 'Отмечайте выдачу ученику', 'Закрывайте возврат одним касанием'],
    tip: 'Сфотографируйте предмет в карточке — споры «это не мой калькулятор» исчезают.',
  },
  {
    id: 'teleprompter', title: 'Телесуфлер', icon: MonitorPlay, cat: 'tools',
    about: 'Плавная прокрутка текста для записи видео и выступлений: темы, зеркалирование, камера и запись.',
    features: ['Скорость 0-2× и размер текста', 'Светлая/тёмная/контрастная темы', 'Зеркалирование текста и камеры', 'Таймер выступления и запись видео с камеры'],
    steps: ['Вставьте текст сценария', 'Настройте скорость и тему', 'Включите полноэкранный режим и запись'],
    tip: 'Горячие клавиши: пробел — старт/пауза, стрелки — скорость, M — зеркало, Esc — выход.',
  },
  {
    id: 'wordcloud', title: 'Облако слов', icon: Cloud, cat: 'generators',
    about: 'Облака слов любой формы: круг, сердце, звезда; палитры, шрифты и экспорт в высоком качестве.',
    features: ['5 форм и 6 палитр', '9 шрифтов + Google Fonts', 'Стоп-слова и нормализация', 'PNG до 4K, SVG, JSON'],
    steps: ['Вставьте текст или загрузите файл', 'Настройте форму и палитру', 'Скачайте в нужном формате'],
    tip: 'Облако по параграфу учебника — готовый постер-шпаргалка по теме.',
  },
  {
    id: 'graphdictation', title: 'Графический диктант', icon: PenTool, cat: 'generators',
    about: 'Рисование по клеткам под диктовку: развитие моторики и пространственного мышления у детей 5-9 лет.',
    features: ['Готовые картинки-образцы', 'Режим диктовки со стрелками', 'Печать blank-листов и ответов'],
    steps: ['Выберите картинку', 'Продиктуйте или включите авторежим', 'Распечатайте листы для класса'],
    tip: 'Пусть ребёнок сначала продиктует сам себе вслух — это двойная тренировка.',
  },
  {
    id: 'lifebalance', title: 'Колесо баланса', icon: Sparkles, cat: 'selfcare',
    about: 'Саморефлексия педагога: 8 сфер жизни, оценки 1-10 и персональные рекомендации.',
    features: ['8 сфер: работа, здоровье, семья…', 'Наглядное колесо с перекосами', 'Рекомендации по слабым сферам', 'Скачивание результата картинкой'],
    steps: ['Оцените каждую сферу от 1 до 10', 'Посмотрите колесо и перекосы', 'Прочитайте рекомендации и сохраните результат'],
    tip: 'Возвращайтесь к колесу раз в четверть — динамика мотивирует сильнее резолюций.',
  },
  {
    id: 'qrcode', title: 'QR-коды', icon: QrCode, cat: 'generators',
    about: 'Генератор QR-кодов: ссылки, текст, WiFi класса, контакты и визитки.',
    features: ['Текст, ссылка, WiFi, email, телефон, vCard', 'Цвета и размер под дизайн', 'PNG и SVG'],
    steps: ['Выберите тип данных', 'Заполните поля', 'Скачайте код и распечатайте'],
    tip: 'QR с WiFi класса на двери экономит минуту каждого урока технологии.',
  },
  {
    id: 'bibliography', title: 'Источники по ГОСТу', icon: BookText, cat: 'tools',
    about: 'Оформление списка литературы по действующим ГОСТам: 12 типов источников и живой предпросмотр.',
    features: ['Книги, статьи, сайты, НПА, диссертации…', 'Подсказки с пунктами ГОСТа у каждого поля', 'Автоалфавитная сортировка', 'Экспорт в Word и txt'],
    steps: ['Выберите тип источника', 'Заполните поля по подсказкам', 'Скопируйте или экспортируйте список'],
    tip: 'Собирайте источники по мере работы над методичкой — финальный список соберётся сам.',
  },
  {
    id: 'visualschedule', title: 'Визуальное расписание', icon: CalendarDays, cat: 'planning',
    about: 'Расписания с пиктограммами для детей с РАС и ОВЗ: 150+ билингвальных картинок и 4 шаблона.',
    features: ['150+ пиктограмм RU/EN в 9 категориях', 'Шаблоны: лента, колонка, сетки 3×3 и 4×4', 'Свои фото и подписи', 'PNG для доски, PDF для печати, сохранение проектов'],
    steps: ['Выберите шаблон', 'Перетащите пиктограммы из библиотеки', 'Экспортируйте и повесьте на видное место'],
    tip: 'Одинаковое расписание на доске и в мини-копии на парте снижает тревожность ребёнка.',
  },
];

const APP_TIPS = [
  { icon: '⭐', text: 'В современном виде добавляйте инструменты в «Избранное» — они всегда под рукой в верхней панели.' },
  { icon: '⚙️', text: 'В классическом виде шестерёнка скрывает ненужные плитки и меняет их порядок перетаскиванием.' },
  { icon: '🖨️', text: 'Почти у каждого генератора есть кнопки PNG/PDF: для сеток и постеров выбирайте альбомную ориентацию.' },
  { icon: '💾', text: 'Колоды, турниры и проекты хранятся локально на устройстве; для переноса используйте экспорт файлов.' },
  { icon: '📱', text: 'Приложение работает и в мини-аппе ВКонтакте, и в обычном браузере — добавьте его в закладки телефона.' },
  { icon: '💬', text: 'Идеи и вопросы пишите в сообщество «Помощник учителя» — новые разделы рождаются из ваших запросов.' },
];

// ===== Компонент =====

export default function ManualScreen({ onBack, onNavigate }: ManualScreenProps) {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<Cat | 'all'>('all');

  const filtered = useMemo(() => {
    let list = ENTRIES;
    if (cat !== 'all') list = list.filter((e) => e.cat === cat);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.about.toLowerCase().includes(q) ||
          e.features.some((f) => f.toLowerCase().includes(q))
      );
    }
    return list;
  }, [cat, query]);

  const newEntries = ENTRIES.filter((e) => e.isNew);

  return (
    <div className="min-h-[100dvh] notebook-bg flex flex-col">
      {/* ЕДИНАЯ ШАПКА */}
      <header className="bg-purple-700 shadow-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Руководство</h1>
          </div>
          <BookOpen className="w-6 h-6 text-white/70 shrink-0" />
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-4 space-y-4 pb-8">
        {/* ===== Герой + поиск ===== */}
        <section className="bg-gradient-to-br from-purple-600 to-violet-700 rounded-2xl p-5 text-white shadow-lg space-y-3">
          <h2 className="text-xl font-bold">Справочный центр приложения</h2>
          <p className="text-sm text-purple-100">
            {ENTRIES.length} инструментов в 5 категориях: что умеет каждый раздел, как начать за 3 шага и советы из практики.
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск: морзе, печать, ГОСТ…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/15 backdrop-blur text-white placeholder-purple-200 border border-white/25 focus:outline-none focus:border-white/60 text-sm"
            />
          </div>
        </section>

        {/* ===== Новое в приложении ===== */}
        {!query && cat === 'all' && (
          <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-purple-700 text-base">Новое в приложении</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {newEntries.map((e) => {
                const Icon = e.icon;
                return (
                  <button
                    key={e.id}
                    onClick={() => onNavigate?.(e.id)}
                    disabled={!onNavigate}
                    className="flex items-center gap-2 p-2.5 rounded-xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors text-left disabled:opacity-60"
                  >
                    <Icon className="w-5 h-5 text-amber-600 shrink-0" />
                    <span className="text-xs font-semibold text-amber-900 flex-1 min-w-0 truncate">{e.title}</span>
                    {onNavigate && <ArrowRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ===== Фильтр категорий ===== */}
        <section className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setCat('all')}
            className={`shrink-0 px-3 py-1.5 rounded-lg font-medium text-xs transition-all ${
              cat === 'all' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-purple-50 border border-slate-200'
            }`}
          >
            Все ({ENTRIES.length})
          </button>
          {CATS.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`shrink-0 px-3 py-1.5 rounded-lg font-medium text-xs transition-all ${
                cat === c.id ? `bg-gradient-to-r ${c.gradient} text-white shadow-sm` : 'bg-white text-slate-600 hover:bg-purple-50 border border-slate-200'
              }`}
            >
              {c.title} ({ENTRIES.filter((e) => e.cat === c.id).length})
            </button>
          ))}
        </section>

        {/* ===== Список разделов ===== */}
        <section className="space-y-2">
          {filtered.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center text-sm text-gray-400">
              Ничего не найдено. Попробуйте другой запрос или категорию.
            </div>
          )}
          {filtered.map((e) => {
            const Icon = e.icon;
            const catMeta = CATS.find((c) => c.id === e.cat)!;
            return (
              <details key={e.id} className="bg-white rounded-2xl shadow-sm overflow-hidden group">
                <summary className="px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-center gap-3 list-none">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${catMeta.gradient} flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-gray-900 truncate">{e.title}</h3>
                      {e.isNew && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-bold">NEW</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{e.about}</p>
                  </div>
                  <ChevronIndicator />
                </summary>

                <div className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-100">
                  <p className="text-sm text-gray-700 leading-relaxed pt-2">{e.about}</p>

                  <div>
                    <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-1.5">Возможности</h4>
                    <ul className="space-y-1">
                      {e.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-1.5">Как начать</h4>
                    <ol className="space-y-1">
                      {e.steps.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center mt-0.5">
                            {i + 1}
                          </span>
                          {s}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-900 leading-relaxed">{e.tip}</p>
                  </div>

                  {onNavigate && (
                    <button
                      onClick={() => onNavigate(e.id)}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      Открыть раздел
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </details>
            );
          })}
        </section>

        {/* ===== Советы по приложению ===== */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-purple-700 text-base">Советы по работе с приложением</h3>
          </div>
          <div className="space-y-2">
            {APP_TIPS.map((t, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl bg-purple-50/60">
                <span className="text-xl shrink-0">{t.icon}</span>
                <p className="text-sm text-gray-700 leading-relaxed">{t.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

// Индикатор раскрытия
function ChevronIndicator() {
  return (
    <svg
      className="w-4 h-4 text-gray-400 shrink-0 transition-transform group-open:rotate-180"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
