import { useState, useMemo } from 'react';
import {
  Ruler,
  Copy,
  Check,
  Download,
  RefreshCw,
  FileText,
  HelpCircle,
  Trophy,
  BookOpen,
  Lightbulb,
  Scale,
  Beaker,
  Layout,
  Thermometer,
  Gauge,
  Gauge as SpeedIcon,
  Clock,
  Zap,
  Compass,
  HardDrive,
  UtensilsCrossed,
} from 'lucide-react';
import BackButton from './BackButton';
import { triggerHaptic } from '@/lib/haptic';

// ===== Типы =====

type CategoryId =
  | 'length' | 'mass' | 'volume' | 'area'
  | 'temperature' | 'pressure' | 'speed' | 'time'
  | 'energy' | 'angle' | 'data' | 'cooking';

interface Unit {
  id: string;
  name: string;
  symbol: string;
  toBase: (v: number) => number;   // в базовую единицу
  fromBase: (v: number) => number; // из базовой
  era?: string;
  note?: string;
}

interface Category {
  id: CategoryId;
  name: string;
  icon: typeof Ruler;
  baseName: string;
  baseSymbol: string;
  units: Unit[];
  description: string;
  history: string;
}

// ===== Вспомогательные функции =====

const lin = (k: number) => ({
  toBase: (v: number) => v * k,
  fromBase: (v: number) => v / k,
});

// ===== Категории и единицы =====

const CATEGORIES: Category[] = [
  {
    id: 'length', name: 'Длина', icon: Ruler, baseName: 'метр', baseSymbol: 'м',
    description: 'Метрическая, британская и морская системы измерения расстояний',
    history: 'Метр был определён в 1791 году как 1/10 000 000 часть четверти земного меридиана. С 1983 года — расстояние, которое свет проходит за 1/299 792 458 секунды.',
    units: [
      { id: 'mm', name: 'миллиметр', symbol: 'мм', ...lin(0.001), era: '1795' },
      { id: 'cm', name: 'сантиметр', symbol: 'см', ...lin(0.01), era: '1795' },
      { id: 'dm', name: 'дециметр', symbol: 'дм', ...lin(0.1) },
      { id: 'm', name: 'метр', symbol: 'м', ...lin(1), era: '1791', note: 'Базовая единица СИ' },
      { id: 'km', name: 'километр', symbol: 'км', ...lin(1000) },
      { id: 'in', name: 'дюйм', symbol: '″', ...lin(0.0254), era: 'VII в.', note: '≈ ширина большого пальца' },
      { id: 'ft', name: 'фут', symbol: '′', ...lin(0.3048), era: 'XII в.', note: '12 дюймов, ≈ ступня' },
      { id: 'yd', name: 'ярд', symbol: 'yd', ...lin(0.9144), era: 'XII в.', note: '3 фута' },
      { id: 'mi', name: 'миля', symbol: 'mi', ...lin(1609.344), era: 'Др. Рим', note: '1000 двойных шагов' },
      { id: 'nmi', name: 'морская миля', symbol: 'nmi', ...lin(1852), era: 'XVI в.', note: '1 минута дуги меридиана' },
    ],
  },
  {
    id: 'mass', name: 'Масса', icon: Scale, baseName: 'килограмм', baseSymbol: 'кг',
    description: 'Метрическая и британская системы измерения массы',
    history: 'Килограмм до 2019 года определялся платино-иридиевым эталоном в Севре. Сейчас — через постоянную Планка.',
    units: [
      { id: 'mg', name: 'миллиграмм', symbol: 'мг', ...lin(1e-6) },
      { id: 'g', name: 'грамм', symbol: 'г', ...lin(0.001) },
      { id: 'kg', name: 'килограмм', symbol: 'кг', ...lin(1), note: 'Базовая единица СИ' },
      { id: 't', name: 'тонна', symbol: 'т', ...lin(1000) },
      { id: 'oz', name: 'унция', symbol: 'oz', ...lin(0.0283495), era: 'Др. Рим' },
      { id: 'lb', name: 'фунт', symbol: 'lb', ...lin(0.453592), note: '16 унций' },
      { id: 'st', name: 'стоун', symbol: 'st', ...lin(6.35029), note: '14 фунтов' },
      { id: 'pud', name: 'пуд', symbol: 'пуд', ...lin(16.3805), era: 'XII в.', note: 'Русская мера = 40 фунтов' },
    ],
  },
  {
    id: 'volume', name: 'Объём', icon: Beaker, baseName: 'литр', baseSymbol: 'л',
    description: 'Метрические и кулинарные единицы объёма',
    history: 'Литр (1795) — объём куба со стороной 1 дм. С 1964 года точно = 1 куб.дециметру.',
    units: [
      { id: 'ml', name: 'миллилитр', symbol: 'мл', ...lin(0.001) },
      { id: 'l', name: 'литр', symbol: 'л', ...lin(1) },
      { id: 'm3', name: 'куб. метр', symbol: 'м³', ...lin(1000) },
      { id: 'tsp', name: 'чайная ложка', symbol: 'ч.л.', ...lin(0.005), note: '5 мл' },
      { id: 'tbsp', name: 'столовая ложка', symbol: 'ст.л.', ...lin(0.015), note: '15 мл' },
      { id: 'cup', name: 'стакан', symbol: 'ст.', ...lin(0.2), note: '200 мл (ГОСТ)' },
      { id: 'pt', name: 'пинта (US)', symbol: 'pt', ...lin(0.473176) },
      { id: 'gal', name: 'галлон (US)', symbol: 'gal', ...lin(3.78541), note: '8 пинт' },
    ],
  },
  {
    id: 'area', name: 'Площадь', icon: Layout, baseName: 'кв. метр', baseSymbol: 'м²',
    description: 'Метрическая и земельная системы',
    history: 'Гектар (1795) = 100 ар (100×100 м). Акр исторически — площадь, которую пара волов вспахивала за день.',
    units: [
      { id: 'mm2', name: 'кв. миллиметр', symbol: 'мм²', ...lin(1e-6) },
      { id: 'cm2', name: 'кв. сантиметр', symbol: 'см²', ...lin(1e-4) },
      { id: 'm2', name: 'кв. метр', symbol: 'м²', ...lin(1) },
      { id: 'are', name: 'сотка (ар)', symbol: 'а', ...lin(100), note: '10×10 м' },
      { id: 'ha', name: 'гектар', symbol: 'га', ...lin(10000), note: '100×100 м' },
      { id: 'km2', name: 'кв. километр', symbol: 'км²', ...lin(1e6) },
      { id: 'acre', name: 'акр', symbol: 'ac', ...lin(4046.856), era: 'Средние века' },
    ],
  },
  {
    id: 'temperature', name: 'Температура', icon: Thermometer, baseName: 'градус Цельсия', baseSymbol: '°C',
    description: 'Три основные температурные шкалы',
    history: 'Цельсий (1742) — 0° = замерзание воды, 100° = кипение. Фаренгейт (1724) — вода кипит при 212°. Кельвин (1848) — абсолютная шкала, 0 K = −273.15 °C.',
    units: [
      {
        id: 'c', name: 'Цельсий', symbol: '°C',
        toBase: (v) => v,
        fromBase: (v) => v,
        note: '0° — лёд, 100° — пар',
      },
      {
        id: 'f', name: 'Фаренгейт', symbol: '°F', era: '1724',
        toBase: (v) => (v - 32) * 5 / 9,
        fromBase: (v) => v * 9 / 5 + 32,
        note: '32° — лёд, 212° — пар',
      },
      {
        id: 'k', name: 'Кельвин', symbol: 'K', era: '1848',
        toBase: (v) => v - 273.15,
        fromBase: (v) => v + 273.15,
        note: 'Абсолютный ноль = 0 K',
      },
    ],
  },
  {
    id: 'pressure', name: 'Давление', icon: Gauge, baseName: 'паскаль', baseSymbol: 'Па',
    description: 'Метеорология, техника, медицина',
    history: 'Паскаль (1 Па = 1 Н/м²) назван в честь Блеза Паскаля (1623-1662). Бар = 100 000 Па ≈ атмосферному давлению.',
    units: [
      { id: 'pa', name: 'паскаль', symbol: 'Па', ...lin(1) },
      { id: 'kpa', name: 'килопаскаль', symbol: 'кПа', ...lin(1000) },
      { id: 'mpa', name: 'мегапаскаль', symbol: 'МПа', ...lin(1e6) },
      { id: 'bar', name: 'бар', symbol: 'бар', ...lin(100000) },
      { id: 'atm', name: 'атмосфера', symbol: 'атм', ...lin(101325), note: 'Давление на уровне моря' },
      { id: 'mmhg', name: 'мм рт. ст.', symbol: 'мм рт.ст.', ...lin(133.322), note: 'Торричелли, 1643' },
      { id: 'psi', name: 'фунт/кв.дюйм', symbol: 'psi', ...lin(6894.76), note: 'Используется в шинах' },
    ],
  },
  {
    id: 'speed', name: 'Скорость', icon: SpeedIcon, baseName: 'метр/сек', baseSymbol: 'м/с',
    description: 'Транспорт, физика, навигация',
    history: 'Узел = 1 морская миля в час. Название — от лага: верёвка с узлами разматывалась с корабля, узлы считали песочными часами.',
    units: [
      { id: 'ms', name: 'метр/сек', symbol: 'м/с', ...lin(1) },
      { id: 'kmh', name: 'км/час', symbol: 'км/ч', ...lin(1 / 3.6) },
      { id: 'mph', name: 'миль/час', symbol: 'mph', ...lin(0.44704) },
      { id: 'knot', name: 'узел', symbol: 'уз', ...lin(0.514444), era: 'XVI в.', note: '1 морская миля/час' },
      { id: 'fts', name: 'фут/сек', symbol: 'ft/s', ...lin(0.3048) },
      { id: 'mach', name: 'Мах', symbol: 'M', ...lin(340.29), note: 'Скорость звука ≈ 340 м/с' },
    ],
  },
  {
    id: 'time', name: 'Время', icon: Clock, baseName: 'секунда', baseSymbol: 'с',
    description: 'От миллисекунд до столетий',
    history: 'Секунда (с 1967) = 9 192 631 770 периодов излучения цезия-133. Час = 60 минут от вавилонской 60-ричной системы.',
    units: [
      { id: 'ms', name: 'миллисекунда', symbol: 'мс', ...lin(0.001) },
      { id: 's', name: 'секунда', symbol: 'с', ...lin(1), note: 'Базовая единица СИ' },
      { id: 'min', name: 'минута', symbol: 'мин', ...lin(60) },
      { id: 'h', name: 'час', symbol: 'ч', ...lin(3600) },
      { id: 'day', name: 'сутки', symbol: 'дн', ...lin(86400) },
      { id: 'week', name: 'неделя', symbol: 'нед', ...lin(604800) },
      { id: 'month', name: 'месяц (30.44 дн)', symbol: 'мес', ...lin(2629746) },
      { id: 'year', name: 'год (365.25 дн)', symbol: 'г', ...lin(31557600) },
    ],
  },
  {
    id: 'energy', name: 'Энергия', icon: Zap, baseName: 'джоуль', baseSymbol: 'Дж',
    description: 'Физика, диетология, электротехника',
    history: 'Джоуль = работа силы 1 Н на пути 1 м. Калория (от лат. calor — тепло) — энергия нагрева 1 г воды на 1 °C. 1 кал = 4.184 Дж.',
    units: [
      { id: 'j', name: 'джоуль', symbol: 'Дж', ...lin(1) },
      { id: 'kj', name: 'килоджоуль', symbol: 'кДж', ...lin(1000) },
      { id: 'cal', name: 'калория', symbol: 'кал', ...lin(4.184) },
      { id: 'kcal', name: 'килокалория', symbol: 'ккал', ...lin(4184), note: '«Калория» в диетологии' },
      { id: 'wh', name: 'ватт·час', symbol: 'Вт·ч', ...lin(3600) },
      { id: 'kwh', name: 'киловатт·час', symbol: 'кВт·ч', ...lin(3.6e6), note: 'Счётчик электричества' },
      { id: 'btu', name: 'БТЕ', symbol: 'BTU', ...lin(1055.06), note: 'British Thermal Unit' },
    ],
  },
  {
    id: 'angle', name: 'Углы', icon: Compass, baseName: 'градус', baseSymbol: '°',
    description: 'Геометрия, навигация, астрономия',
    history: 'Градус (360° в круге) — от вавилонян. Радиан = угол, при котором дуга равна радиусу. Град (гон) = 1/400 круга, используется в геодезии.',
    units: [
      { id: 'deg', name: 'градус', symbol: '°', ...lin(1) },
      { id: 'rad', name: 'радиан', symbol: 'рад', toBase: (v) => v * 180 / Math.PI, fromBase: (v) => v * Math.PI / 180 },
      { id: 'gon', name: 'град (гон)', symbol: 'ᵍ', ...lin(0.9) },
      { id: 'rev', name: 'оборот', symbol: 'об', ...lin(360), note: 'Полный круг' },
      { id: 'arcmin', name: 'угловая минута', symbol: '′', ...lin(1 / 60) },
      { id: 'arcsec', name: 'угловая секунда', symbol: '″', ...lin(1 / 3600) },
    ],
  },
  {
    id: 'data', name: 'Данные', icon: HardDrive, baseName: 'байт', baseSymbol: 'Б',
    description: 'Информатика и хранение данных',
    history: 'Байт = 8 бит (с 1956). Приставки Киби/Меби (2¹⁰, 2²⁰) введены в 1998, чтобы отличать от СИ-кило (1000).',
    units: [
      { id: 'bit', name: 'бит', symbol: 'б', ...lin(1 / 8) },
      { id: 'B', name: 'байт', symbol: 'Б', ...lin(1), note: '8 бит' },
      { id: 'KB', name: 'килобайт', symbol: 'КБ', ...lin(1024), note: '2¹⁰ байт' },
      { id: 'MB', name: 'мегабайт', symbol: 'МБ', ...lin(1048576), note: '2²⁰ байт' },
      { id: 'GB', name: 'гигабайт', symbol: 'ГБ', ...lin(1073741824), note: '2³⁰ байт' },
      { id: 'TB', name: 'терабайт', symbol: 'ТБ', ...lin(1099511627776), note: '2⁴⁰ байт' },
    ],
  },
  {
    id: 'cooking', name: 'Кухня', icon: UtensilsCrossed, baseName: 'грамм (мука)', baseSymbol: 'г',
    description: 'Кулинарные меры с переводом для разных продуктов',
    history: 'Точный вес «стакана» или «ложки» зависит от продукта: стакан муки ≈ 130 г, стакан сахара ≈ 200 г. Здесь — ориентировочные значения для муки.',
    units: [
      { id: 'g', name: 'грамм', symbol: 'г', ...lin(1) },
      { id: 'kg', name: 'килограмм', symbol: 'кг', ...lin(1000) },
      { id: 'tsp', name: 'ч. ложка муки', symbol: 'ч.л.', ...lin(10), note: '≈ 10 г муки' },
      { id: 'tbsp', name: 'ст. ложка муки', symbol: 'ст.л.', ...lin(25), note: '≈ 25 г муки' },
      { id: 'cup', name: 'стакан муки', symbol: 'ст.', ...lin(130), note: '200 мл ≈ 130 г муки' },
      { id: 'pinch', name: 'щепотка', symbol: 'щеп.', ...lin(0.5), note: '≈ 0.5 г соли' },
    ],
  },
];

const QUICK_VALUES: Record<CategoryId, number[]> = {
  length: [1, 10, 100, 1000, 5280],
  mass: [1, 100, 1000, 453.592, 1000000],
  volume: [1, 100, 1000, 3785.41, 5],
  area: [1, 100, 10000, 4046.856],
  temperature: [0, 20, 36.6, 100, 212],
  pressure: [101325, 1, 760, 14.696],
  speed: [1, 3.6, 36, 100, 120],
  time: [1, 60, 3600, 86400, 604800],
  energy: [1, 4184, 3600000, 1055.06],
  angle: [1, 45, 90, 180, 360],
  data: [1, 8, 1024, 1048576, 1073741824],
  cooking: [10, 25, 130, 200, 1000],
};

const FAQ_ITEMS = [
  { q: 'Почему в килобайте 1024 байта, а не 1000?', a: 'Компьютеры работают в двоичной системе: 2¹⁰ = 1024. Для ясности в 1998 году ввели приставки Киби (KiB = 1024 Б), Меби (MiB = 1024² Б), но в обиходе «килобайт» по-прежнему = 1024 байта.' },
  { q: 'Почему в миле 5280 футов, а не круглое число?', a: 'Английская миля (1593) = 8 фарлонгов, фарлонг = 10 чейнов, чейн = 66 футов (длина геодезической цепи Гунтера). 8×10×66 = 5280.' },
  { q: 'Как перевести Цельсий в Фаренгейт без калькулятора?', a: 'Грубая формула: °F ≈ °C × 2 + 30 (точное: ×1.8+32). 20 °C → 20×2+30 = 70 °F (точное 68 °F). Обратно: °C ≈ (°F − 30) / 2.' },
  { q: 'Чем отличаются масса и вес?', a: 'Масса — количество вещества (кг, не меняется в космосе). Вес — сила тяжести (Ньютоны, на Луне в 6 раз меньше). В быту их часто путают, но в физике это разные величины.' },
  { q: 'Что такое «атмосфера» как единица давления?', a: '1 атм = 101 325 Па = давление воздуха на уровне моря при 0 °C. Ртутный столб в 760 мм создаёт такое же давление — отсюда «мм ртутного столба» в медицине.' },
  { q: 'Почему в часе 60 минут, а не 100?', a: 'Наследие вавилонской шестидесятеричной системы. 60 делится на 2, 3, 4, 5, 6, 10, 12, 15, 20, 30 — удобно делить час пополам, на трети, четверти без дробей.' },
  { q: 'Что такое калория и почему её нет в СИ?', a: 'Калория — энергия нагрева 1 г воды на 1 °C. Устаревшая внесистемная единица, в науке заменена джоулем (1 кал = 4.184 Дж). Но в диетологии «калории» (фактически килокалории) остались.' },
  { q: 'Сколько граммов в стакане?', a: 'Зависит от продукта: стакан воды = 200 г, муки ≈ 130 г, сахара ≈ 200 г, растительного масла ≈ 190 г. В разделе «Кухня» — ориентировочные значения для муки.' },
];

const SCENARIO_ITEMS = [
  { icon: '📏', title: 'Урок геометрии', description: 'Переведите 1 гектар в квадратные метры и акры: ученики увидят, что 1 га = 10 000 м² ≈ 2.47 акра. Сравните с размерами школьного стадиона.' },
  { icon: '🔬', title: 'Урок химии', description: 'Переведите 250 мл раствора в литры и кубические сантиметры: покажите связь объёма и вместимости лабораторной посуды.' },
  { icon: '⚡', title: 'Урок физики', description: 'Сколько джоулей в 1 кВт·ч? Конвертер покажет 3 600 000 Дж — и ученики поймут, почему счётчик электричества считает в кВт·ч.' },
  { icon: '🍳', title: 'Урок технологии', description: 'В рецепте 2 cups муки, а дома только стаканы 250 мл. Переведите cups → мл → граммы → стаканы по ГОСТ.' },
  { icon: '🌍', title: 'Урок географии', description: 'Расстояние между городами на карте: переведите 125 км в морские мили и мили — для сравнения с английскими и морскими картами.' },
  { icon: '🧮', title: 'Подготовка к экзамену', description: 'Генератор заданий: 10 переводов между единицами СИ и британской системы. Распечатайте вариант для самостоятельной работы.' },
];

// ===== Форматирование =====

function formatNumber(v: number): string {
  if (!isFinite(v)) return '—';
  const abs = Math.abs(v);
  if (abs === 0) return '0';
  if (abs >= 1e15 || abs < 1e-6) return v.toExponential(4);
  if (abs >= 1000) return v.toLocaleString('ru-RU', { maximumFractionDigits: 4 });
  if (abs >= 1) return v.toLocaleString('ru-RU', { maximumFractionDigits: 6 });
  return v.toLocaleString('ru-RU', { maximumFractionDigits: 10 });
}

function pickDefaultUnit(cat: Category): string {
  // Самая «употребительная» единица категории
  const defaults: Record<CategoryId, string> = {
    length: 'm', mass: 'kg', volume: 'l', area: 'm2',
    temperature: 'c', pressure: 'atm', speed: 'kmh', time: 'h',
    energy: 'kcal', angle: 'deg', data: 'MB', cooking: 'g',
  };
  return defaults[cat.id];
}

// ===== Генератор заданий =====

type LevelId = 'easy' | 'medium' | 'hard';
const LEVELS: { id: LevelId; label: string; min: number; max: number }[] = [
  { id: 'easy', label: 'Лёгкий', min: 1, max: 100 },
  { id: 'medium', label: 'Средний', min: 1, max: 1000 },
  { id: 'hard', label: 'Сложный', min: 1, max: 10000 },
];

// ===== Canvas-помощник =====

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

// ===== Компонент =====

export default function UnitConverterScreen({ onBack }: { onBack: () => void }) {
  const [catId, setCatId] = useState<CategoryId>('length');
  const [inputValue, setInputValue] = useState('1');
  const [fromUnit, setFromUnit] = useState<string>('m');
  const [copied, setCopied] = useState<string | null>(null);

  // Генератор заданий
  const [genCat, setGenCat] = useState<CategoryId>('length');
  const [genFrom, setGenFrom] = useState<string>('m');
  const [genTo, setGenTo] = useState<string>('cm');
  const [genLevel, setGenLevel] = useState<LevelId>('easy');
  const [genCount, setGenCount] = useState(10);
  const [genAnswers, setGenAnswers] = useState(true);
  const [tasks, setTasks] = useState<{ n: number; ans: string }[] | null>(null);

  const category = CATEGORIES.find((c) => c.id === catId)!;

  // При смене категории — сбрасываем единицу на дефолтную
  const handleCatChange = (id: CategoryId) => {
    const cat = CATEGORIES.find((c) => c.id === id)!;
    setCatId(id);
    setFromUnit(pickDefaultUnit(cat));
    setInputValue(String(QUICK_VALUES[id][0]));
  };

  const numericValue = useMemo(() => {
    const n = parseFloat(inputValue);
    return isNaN(n) ? null : n;
  }, [inputValue]);

  const conversions = useMemo(() => {
    if (numericValue === null) return [];
    const from = category.units.find((u) => u.id === fromUnit);
    if (!from) return [];
    const baseValue = from.toBase(numericValue);
    return category.units.map((u) => ({
      unit: u,
      value: u.fromBase(baseValue),
      isFrom: u.id === fromUnit,
    }));
  }, [numericValue, fromUnit, category]);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
      triggerHaptic('light');
    } catch {}
  };

  const useAsInput = (unitId: string, value: number) => {
    setFromUnit(unitId);
    setInputValue(formatNumber(value));
    triggerHaptic('light');
  };

  // ===== Скачивание таблицы =====
  const downloadTable = () => {
    if (numericValue === null) return;
    const W = 1200;
    const rowH = 96;
    const headerH = 180;
    const descH = 100;
    const footerH = 60;
    const H = headerH + descH + category.units.length * rowH + footerH;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, '#2563eb');
    g.addColorStop(1, '#9333ea');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, headerH);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px Arial';
    ctx.fillText(`${category.name} · Таблица перевода`, W / 2, 80);
    ctx.font = '26px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(`Значение: ${formatNumber(numericValue)} ${category.units.find((u) => u.id === fromUnit)?.symbol}`, W / 2, 130);
    ctx.font = '18px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('Помощник учителя · конвертер величин', W / 2, 165);

    ctx.fillStyle = '#eff6ff';
    ctx.fillRect(0, headerH, W, descH);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1e40af';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('О категории:', 40, headerH + 32);
    ctx.fillStyle = '#1e3a8a';
    ctx.font = '18px Arial';
    wrapCanvasText(ctx, category.description, W - 80).slice(0, 2).forEach((line, i) => {
      ctx.fillText(line, 40, headerH + 58 + i * 22);
    });

    let y = headerH + descH;
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, y, W, 40);
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('Единица', 40, y + 26);
    ctx.fillText('Обозначение', 380, y + 26);
    ctx.fillText('Значение', 580, y + 26);
    ctx.fillText('Примечание', 820, y + 26);
    y += 40;

    conversions.forEach((c, i) => {
      if (i % 2 === 1) { ctx.fillStyle = '#faf5ff'; ctx.fillRect(0, y, W, rowH); }
      ctx.textAlign = 'left';
      ctx.fillStyle = c.isFrom ? '#7c3aed' : '#111827';
      ctx.font = `${c.isFrom ? 'bold ' : ''}22px Arial`;
      ctx.fillText(c.unit.name, 40, y + 34);
      if (c.unit.era) {
        ctx.fillStyle = '#9ca3af';
        ctx.font = '14px Arial';
        ctx.fillText(c.unit.era, 40, y + 58);
      }
      ctx.fillStyle = '#6b7280';
      ctx.font = 'bold 26px monospace';
      ctx.fillText(c.unit.symbol, 380, y + 42);
      ctx.fillStyle = c.isFrom ? '#7c3aed' : '#111827';
      ctx.font = `bold 28px monospace`;
      const val = formatNumber(c.value);
      ctx.fillText(val.length > 22 ? val.slice(0, 22) + '…' : val, 580, y + 42);
      if (c.unit.note) {
        ctx.fillStyle = '#6b7280';
        ctx.font = 'italic 16px Arial';
        ctx.fillText(c.unit.note, 820, y + 42);
      }
      y += rowH;
    });

    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, H - footerH, W, footerH);
    ctx.fillStyle = '#6b7280';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Создано в мини-приложении «Помощник учителя» · vk.ru/topteach', W / 2, H - 22);

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `tablica-${category.name.toLowerCase()}.png`;
    a.click();
    triggerHaptic('heavy');
  };

  // ===== Генератор заданий =====
  const genCategory = CATEGORIES.find((c) => c.id === genCat)!;

  const generateTasks = () => {
    const level = LEVELS.find((l) => l.id === genLevel)!;
    const from = genCategory.units.find((u) => u.id === genFrom)!;
    const to = genCategory.units.find((u) => u.id === genTo)!;
    const result: { n: number; ans: string }[] = [];
    const seen = new Set<number>();
    let guard = 0;
    while (result.length < genCount && guard < 500) {
      let n = level.min + Math.floor(Math.random() * (level.max - level.min + 1));
      if (genCat === 'temperature') n = level.min + Math.floor(Math.random() * (level.max - level.min + 1)) * (Math.random() < 0.3 ? -1 : 1);
      if (!seen.has(n)) {
        seen.add(n);
        const base = from.toBase(n);
        const ans = formatNumber(to.fromBase(base));
        result.push({ n, ans });
      }
      guard++;
    }
    setTasks(result);
    triggerHaptic('medium');
  };

  const downloadTasks = () => {
    if (!tasks || !tasks.length) return;
    const from = genCategory.units.find((u) => u.id === genFrom)!;
    const to = genCategory.units.find((u) => u.id === genTo)!;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Задания: ${genCategory.name}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 30px; color: #1f2937; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        .meta { font-size: 13px; color: #6b7280; margin-bottom: 16px; }
        .head { font-size: 15px; margin-bottom: 14px; }
        ol { padding-left: 22px; }
        li { margin-bottom: 12px; font-size: 15px; }
        .num { font-family: "Courier New", monospace; font-weight: bold; font-size: 16px; }
        .blank { display: inline-block; min-width: 140px; border-bottom: 1px solid #9ca3af; }
        .answers { page-break-before: always; }
        .answers h2 { font-size: 18px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 14px; }
        @media print { .no-print { display: none; } }
      </style></head><body>
      <div class="no-print" style="text-align:center;margin-bottom:18px;">
        <button onclick="window.print()" style="padding:10px 24px;font-size:16px;cursor:pointer;">🖨️ Печать / сохранить в PDF</button>
      </div>
      <h1>Рабочий лист · ${genCategory.name}</h1>
      <div class="meta">Перевод: ${from.name} (${from.symbol}) → ${to.name} (${to.symbol}) · Заданий: ${tasks.length} · Дата: ${new Date().toLocaleDateString('ru-RU')}</div>
      <div class="head">Имя: <span class="blank"></span> &nbsp;&nbsp; Класс: <span class="blank" style="min-width:60px;"></span></div>
      <p style="font-size:14px;">Переведите величины из «${from.name}» в «${to.name}»:</p>
      <ol>
        ${tasks.map((t) => `<li><span class="num">${formatNumber(t.n)} ${from.symbol}</span> → <span class="blank"></span> ${to.symbol}</li>`).join('')}
      </ol>
      ${genAnswers ? `
      <div class="answers">
        <h2>Ответы</h2>
        <div class="grid">
          ${tasks.map((t, i) => `<div>${i + 1}. ${formatNumber(t.n)} ${from.symbol} = <b>${t.ans} ${to.symbol}</b></div>`).join('')}
        </div>
      </div>` : ''}
      </body></html>`);
    w.document.close();
    triggerHaptic('heavy');
  };

  return (
    <div className="min-h-[100dvh] notebook-bg flex flex-col">
      <header className="bg-blue-700 shadow-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Конвертер величин</h1>
          </div>
          <Ruler className="w-6 h-6 text-white/70 shrink-0" />
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-4 space-y-4 pb-8">
        {/* ===== Выбор категории ===== */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="text-sm font-bold text-blue-700 mb-2 block">Категория</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCatChange(cat.id)}
                  className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-xs font-semibold transition-all ${
                    catId === cat.id
                      ? 'bg-blue-600 text-white shadow-md scale-105'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-center leading-tight">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ===== Ввод ===== */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-sm font-bold text-blue-700">Значение</label>
              <span className="text-xs text-gray-500">{category.description}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {QUICK_VALUES[catId].map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    setFromUnit(pickDefaultUnit(category));
                    setInputValue(String(v));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Введите число"
              className="flex-1 rounded-xl border-2 border-blue-200 p-3 text-2xl font-mono text-center text-gray-900 focus:outline-none focus:border-blue-500 tracking-wide"
            />
            <select
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value)}
              className="rounded-xl border-2 border-blue-200 px-3 py-3 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-[140px]"
            >
              {category.units.map((u) => (
                <option key={u.id} value={u.id}>{u.symbol} — {u.name}</option>
              ))}
            </select>
          </div>

          {numericValue === null && inputValue.trim() && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 text-center">
              ⚠️ Введите число
            </div>
          )}

          {numericValue !== null && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-sm text-blue-800">
                <b className="text-lg font-mono">{formatNumber(numericValue)}</b> {category.units.find((u) => u.id === fromUnit)?.symbol}
              </span>
              <button
                onClick={downloadTable}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Скачать таблицу
              </button>
            </div>
          )}
        </section>

        {/* ===== Результаты ===== */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-blue-700 text-base">Во всех единицах</h3>
            <span className="text-xs text-gray-400">({category.units.length})</span>
          </div>

          {numericValue === null ? (
            <p className="text-sm text-gray-400 text-center py-6">Введите число сверху, чтобы увидеть перевод</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {conversions.map((c) => (
                <div
                  key={c.unit.id}
                  className={`border-2 rounded-xl p-3 transition-all ${
                    c.isFrom ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg font-mono font-bold text-blue-700">{c.unit.symbol}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-gray-900 truncate">{c.unit.name}</div>
                        {c.unit.note && <div className="text-[10px] text-gray-500 truncate">{c.unit.note}</div>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleCopy(formatNumber(c.value), c.unit.id)}
                        className="p-1.5 rounded-lg hover:bg-white transition-colors"
                        aria-label="Копировать"
                      >
                        {copied === c.unit.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                      </button>
                      {!c.isFrom && (
                        <button
                          onClick={() => useAsInput(c.unit.id, c.value)}
                          className="p-1.5 rounded-lg hover:bg-white transition-colors"
                          aria-label="Использовать как ввод"
                          title="Использовать это значение как ввод"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 font-mono text-lg break-all text-gray-800 border border-gray-100">
                    {formatNumber(c.value)}
                  </div>
                  {c.unit.era && <div className="text-[10px] text-gray-400 mt-1">С {c.unit.era}</div>}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ===== Пояснения ===== */}
        <section className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-blue-900 text-sm">О категории</h3>
          </div>
          <p className="text-sm text-blue-900 leading-relaxed">{category.history}</p>
          <div className="bg-white/70 rounded-lg p-2.5 text-xs text-blue-800">
            <b>Базовая единица:</b> {category.baseName} ({category.baseSymbol}). Все переводы идут через неё как через общий знаменатель.
          </div>
        </section>

        {/* ===== Генератор заданий ===== */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-blue-700 text-base">Генератор заданий</h3>
          </div>

          <div>
            <label className="text-xs text-gray-600 block mb-1 font-semibold">Категория</label>
            <select
              value={genCat}
              onChange={(e) => {
                const id = e.target.value as CategoryId;
                const cat = CATEGORIES.find((c) => c.id === id)!;
                setGenCat(id);
                setGenFrom(pickDefaultUnit(cat));
                setGenTo(cat.units[1]?.id || pickDefaultUnit(cat));
              }}
              className="w-full rounded-lg border border-gray-200 p-2 text-sm bg-white"
            >
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-gray-600">
              <span className="block mb-1 font-semibold">Из:</span>
              <select value={genFrom} onChange={(e) => setGenFrom(e.target.value)} className="w-full rounded-lg border border-gray-200 p-2 text-sm bg-white">
                {genCategory.units.map((u) => <option key={u.id} value={u.id}>{u.symbol} {u.name}</option>)}
              </select>
            </label>
            <label className="text-xs text-gray-600">
              <span className="block mb-1 font-semibold">В:</span>
              <select value={genTo} onChange={(e) => setGenTo(e.target.value)} className="w-full rounded-lg border border-gray-200 p-2 text-sm bg-white">
                {genCategory.units.map((u) => <option key={u.id} value={u.id}>{u.symbol} {u.name}</option>)}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                onClick={() => setGenLevel(l.id)}
                className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                  genLevel === l.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-blue-50'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Количество заданий</span>
              <span className="font-mono font-bold text-blue-700">{genCount}</span>
            </div>
            <input type="range" min={5} max={30} value={genCount} onChange={(e) => setGenCount(Number(e.target.value))} className="w-full accent-blue-600" />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={genAnswers} onChange={(e) => setGenAnswers(e.target.checked)} className="w-4 h-4 accent-blue-600" />
            Добавить страницу с ответами
          </label>

          <div className="flex gap-2">
            <button
              onClick={generateTasks}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Сгенерировать
            </button>
            <button
              onClick={downloadTasks}
              disabled={!tasks || !tasks.length}
              className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Скачать вариант
            </button>
          </div>

          {tasks && tasks.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-3 max-h-64 overflow-y-auto">
              <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-800">
                {tasks.map((t, i) => (
                  <li key={i}>
                    <span className="font-mono font-bold">{formatNumber(t.n)}</span>
                    <span className="text-gray-500"> {genCategory.units.find((u) => u.id === genFrom)?.symbol} = </span>
                    {genAnswers && <span className="text-green-700 font-semibold">{t.ans} {genCategory.units.find((u) => u.id === genTo)?.symbol}</span>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>

        {/* ===== FAQ ===== */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <details>
            <summary className="px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-blue-700 text-sm">Частые вопросы</h3>
              <span className="text-xs font-bold text-blue-400">{FAQ_ITEMS.length}</span>
            </summary>
            <div className="px-4 pb-4 space-y-2">
              {FAQ_ITEMS.map((item, idx) => (
                <details key={idx} className="border border-blue-100 rounded-xl overflow-hidden">
                  <summary className="px-4 py-2.5 cursor-pointer hover:bg-blue-50 font-semibold text-sm text-gray-800">{item.q}</summary>
                  <div className="px-4 pb-3 pt-1 text-sm text-gray-600 bg-blue-50/50 border-t border-blue-100">{item.a}</div>
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
              <h3 className="font-bold text-blue-700 text-sm">Сценарии использования</h3>
              <span className="text-xs font-bold text-blue-400">{SCENARIO_ITEMS.length}</span>
            </summary>
            <div className="px-4 pb-4 space-y-2">
              {SCENARIO_ITEMS.map((s, idx) => (
                <div key={idx} className="border border-blue-100 rounded-xl p-3 flex gap-3">
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

        {/* ===== Справочник ===== */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <details>
            <summary className="px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-green-600" />
              <h3 className="font-bold text-blue-700 text-sm">Справочник по всем категориям</h3>
              <span className="text-xs font-bold text-blue-400">{CATEGORIES.length}</span>
            </summary>
            <div className="px-4 pb-4 space-y-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <details key={cat.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    <summary className="px-4 py-2.5 cursor-pointer hover:bg-gray-50 flex items-center gap-2">
                      <Icon className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-sm text-gray-800">{cat.name}</span>
                      <span className="text-[10px] text-gray-400 ml-auto">{cat.units.length} ед.</span>
                    </summary>
                    <div className="px-4 pb-3 pt-1 text-sm text-gray-600 bg-gray-50 border-t border-gray-200 space-y-2">
                      <p>{cat.description}</p>
                      <p className="text-xs"><b>Базовая единица:</b> {cat.baseName} ({cat.baseSymbol})</p>
                      <p className="text-xs"><b>История:</b> {cat.history}</p>
                      <div className="bg-white rounded-lg p-2 text-xs">
                        <b>Единицы:</b> {cat.units.map((u) => `${u.symbol} ${u.name}`).join(', ')}
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          </details>
        </section>
      </main>
    </div>
  );
}
