import { useState, useMemo } from 'react';
import {
  Binary,
  ArrowLeftRight,
  HelpCircle,
  Trophy,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Calculator,
  History as HistoryIcon,
  BookOpen,
  Hash,
} from 'lucide-react';
import BackButton from './BackButton';
import { triggerHaptic } from '@/lib/haptic';

// ===== Типы систем =====

type SystemId =
  | 'binary'
  | 'octal'
  | 'decimal'
  | 'hex'
  | 'roman'
  | 'greek'
  | 'slavic'
  | 'egyptian'
  | 'babylonian'
  | 'mayan'
  | 'base36'
  | 'custom';

interface NumeralSystem {
  id: SystemId;
  name: string;
  shortName: string;
  base: number | null; // null для непозиционных
  era: string;
  type: 'positional' | 'non-positional' | 'mixed';
  description: string;
  digits?: string;
}

// ===== Описание систем =====

const SYSTEMS: NumeralSystem[] = [
  {
    id: 'binary',
    name: 'Двоичная',
    shortName: 'BIN',
    base: 2,
    era: 'Лейбниц, 1703',
    type: 'positional',
    description: 'Основана на степенях двойки. Используется во всех цифровых компьютерах. Каждая цифра — бит (0 или 1).',
    digits: '01',
  },
  {
    id: 'octal',
    name: 'Восьмеричная',
    shortName: 'OCT',
    base: 8,
    era: 'Современность',
    type: 'positional',
    description: 'Основание 8. Удобна для представления байтов и прав доступа в Unix (например, chmod 755).',
    digits: '01234567',
  },
  {
    id: 'decimal',
    name: 'Десятичная',
    shortName: 'DEC',
    base: 10,
    era: 'Индия, V в. н.э.',
    type: 'positional',
    description: 'Привычная нам система. Основание 10 — по числу пальцев на руках. Пришла в Европу через арабов.',
    digits: '0123456789',
  },
  {
    id: 'hex',
    name: 'Шестнадцатеричная',
    shortName: 'HEX',
    base: 16,
    era: 'Современность',
    type: 'positional',
    description: 'Основание 16. Удобна для программистов: один байт = два hex-символа. Используется в цветах (#FF5733) и адресах памяти.',
    digits: '0123456789ABCDEF',
  },
  {
    id: 'base36',
    name: '36-ричная',
    shortName: 'B36',
    base: 36,
    era: 'Современность',
    type: 'positional',
    description: 'Максимальное основание с использованием всех цифр и латинских букв. Удобна для компактной записи больших чисел (короткие ссылки).',
    digits: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  },
  {
    id: 'roman',
    name: 'Римская',
    shortName: 'ROM',
    base: null,
    era: 'Древний Рим',
    type: 'non-positional',
    description: 'I=1, V=5, X=10, L=50, C=100, D=500, M=1000. Меньшая цифра слева от большей — вычитается (IV=4). Без нуля. Надчёркивание умножает на 1000.',
  },
  {
    id: 'greek',
    name: 'Древнегреческая (ионическая)',
    shortName: 'GR',
    base: null,
    era: 'V в. до н.э.',
    type: 'mixed',
    description: 'Алфавитная система: буквы греческого алфавита + 3 архаические буквы (ϛ, ϟ, ϡ) обозначают числа. Тысячи обозначаются штрихом слева (͵α = 1000).',
  },
  {
    id: 'slavic',
    name: 'Славянская (кириллическая)',
    shortName: 'СЛ',
    base: null,
    era: 'IX-XVII вв.',
    type: 'mixed',
    description: 'Буквы кириллицы с числовыми значениями. Титло (~) над числом. Тысячный знак (҂) перед буквой умножает значение на 1000. Использовалась на Руси до XVIII века.',
  },
  {
    id: 'egyptian',
    name: 'Египетская',
    shortName: 'EG',
    base: null,
    era: 'ок. 3000 до н.э.',
    type: 'non-positional',
    description: 'Иероглифическая: палочка=1, подкова=10, верёвка=100, лотос=1000, палец=10000, рыба=100000, человек=1000000. Нет нуля.',
  },
  {
    id: 'babylonian',
    name: 'Вавилонская',
    shortName: 'BAB',
    base: 60,
    era: 'II тыс. до н.э.',
    type: 'positional',
    description: 'Шестидесятеричная. Отсюда 60 минут в часе, 60 секунд в минуте, 360° в круге. Клинопись. Без явного нуля (позже — пробел).',
  },
  {
    id: 'mayan',
    name: 'Майя',
    shortName: 'MAY',
    base: 20,
    era: 'III в. н.э.',
    type: 'positional',
    description: 'Двадцатеричная. Три символа: точка (1), черта (5), ракушка (0) — майя изобрели ноль независимо! Запись вертикально.',
  },
];

// ===== Конвертеры =====

const GREEK_UNITS: Record<number, string> = {
  1: 'α', 2: 'β', 3: 'γ', 4: 'δ', 5: 'ε', 6: 'ϛ', 7: 'ζ', 8: 'η', 9: 'θ',
};
const GREEK_TENS: Record<number, string> = {
  10: 'ι', 20: 'κ', 30: 'λ', 40: 'μ', 50: 'ν', 60: 'ξ', 70: 'ο', 80: 'π', 90: 'ϟ',
};
const GREEK_HUNDREDS: Record<number, string> = {
  100: 'ρ', 200: 'σ', 300: 'τ', 400: 'υ', 500: 'φ', 600: 'χ', 700: 'ψ', 800: 'ω', 900: 'ϡ',
};

const SLAVIC_UNITS: Record<number, string> = {
  1: 'а', 2: 'в', 3: 'г', 4: 'д', 5: 'е', 6: 'ѕ', 7: 'з', 8: 'и', 9: 'ѳ',
};
const SLAVIC_TENS: Record<number, string> = {
  10: 'і', 20: 'к', 30: 'л', 40: 'м', 50: 'н', 60: 'ѯ', 70: 'о', 80: 'п', 90: 'ч',
};
const SLAVIC_HUNDREDS: Record<number, string> = {
  100: 'р', 200: 'с', 300: 'т', 400: 'ѵ', 500: 'ф', 600: 'х', 700: 'ѱ', 800: 'ѡ', 900: 'ц',
};

function toGreek(n: number): string {
  if (n <= 0 || n >= 10000) return '—';
  const thousands = Math.floor(n / 1000);
  const remainder = n % 1000;
  const hundreds = Math.floor(remainder / 100) * 100;
  const tens = Math.floor((remainder % 100) / 10) * 10;
  const units = remainder % 10;
  const prefix = thousands > 0 ? `͵${GREEK_UNITS[thousands] || ''}` : '';
  const h = GREEK_HUNDREDS[hundreds] || '';
  const t = GREEK_TENS[tens] || '';
  const u = GREEK_UNITS[units] || '';
  return `${prefix}${h}${t}${u}´`;
}

function toSlavic(n: number): string {
  if (n <= 0) return '—';
  const thousands = Math.floor(n / 1000);
  const remainder = n % 1000;
  const hundreds = Math.floor(remainder / 100) * 100;
  const tens = Math.floor((remainder % 100) / 10) * 10;
  const units = remainder % 10;
  const thousandPrefix = thousands > 0 ? `҂${SLAVIC_UNITS[Math.min(thousands, 9)] || ''}` : '';
  const h = SLAVIC_HUNDREDS[hundreds] || '';
  const t = SLAVIC_TENS[tens] || '';
  const u = SLAVIC_UNITS[units] || '';
  return `${thousandPrefix}${h}${t}${u}҃`;
}

function toRoman(n: number): string {
  if (n <= 0 || n >= 4000) return '—';
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let out = '';
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) {
      out += syms[i];
      n -= vals[i];
    }
  }
  return out;
}

const EGYPT_GLYPHS: Record<number, string> = {
  1: '𓏺',
  10: '𓎆',
  100: '𓍢',
  1000: '𓆼',
  10000: '𓂭',
  100000: '𓆨',
  1000000: '𓁨',
};

function toEgyptian(n: number): string {
  if (n <= 0 || n > 9999999) return '—';
  const parts: string[] = [];
  let r = n;
  for (const v of [1000000, 100000, 10000, 1000, 100, 10, 1]) {
    const count = Math.floor(r / v);
    if (count > 0) {
      // Ограничим повторения, чтобы не переполнять
      const display = Math.min(count, 9);
      parts.push(EGYPT_GLYPHS[v].repeat(display));
      r -= count * v;
    }
  }
  return parts.join(' ');
}

function toBabylonian(n: number): string {
  if (n <= 0) return '—';
  const digits: number[] = [];
  let r = n;
  while (r > 0) {
    digits.unshift(r % 60);
    r = Math.floor(r / 60);
  }
  return digits.map((d) => {
    const tens = Math.floor(d / 10);
    const units = d % 10;
    const t = '𒐊'.repeat(tens);
    const u = '𒏹'.repeat(units);
    return t + u || '·';
  }).join(' ');
}

function toMayan(n: number): string {
  if (n < 0) return '—';
  if (n === 0) return '𝋠';
  const digits: number[] = [];
  let r = n;
  while (r > 0) {
    digits.unshift(r % 20);
    r = Math.floor(r / 20);
  }
  return digits.map((d) => {
    if (d === 0) return '𝋠';
    const bars = Math.floor(d / 5);
    const dots = d % 5;
    return '𝋠'.replace('𝋠', '') + '▬'.repeat(bars) + '●'.repeat(dots);
  }).join('⋮');
}

function toPositional(n: number, base: number, digits: string): string {
  if (n === 0) return '0';
  if (n < 0) return '-' + toPositional(-n, base, digits);
  let out = '';
  let r = n;
  while (r > 0) {
    out = digits[r % base] + out;
    r = Math.floor(r / base);
  }
  return out;
}

function parseNumber(value: string, fromSystem: SystemId, customBase: number): number | null {
  const s = value.trim();
  if (!s) return null;
  try {
    switch (fromSystem) {
      case 'binary':
        if (!/^[01]+$/.test(s)) return null;
        return parseInt(s, 2);
      case 'octal':
        if (!/^[0-7]+$/.test(s)) return null;
        return parseInt(s, 8);
      case 'decimal':
        if (!/^\d+$/.test(s)) return null;
        return parseInt(s, 10);
      case 'hex':
        if (!/^[0-9a-fA-F]+$/.test(s)) return null;
        return parseInt(s, 16);
      case 'base36':
        if (!/^[0-9a-zA-Z]+$/.test(s)) return null;
        return parseInt(s, 36);
      case 'custom':
        if (customBase < 2 || customBase > 36) return null;
        return parseInt(s, customBase);
      case 'roman': {
        const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
        const up = s.toUpperCase();
        if (!/^[IVXLCDM]+$/.test(up)) return null;
        let total = 0;
        for (let i = 0; i < up.length; i++) {
          const curr = map[up[i]];
          const next = map[up[i + 1]] || 0;
          if (curr < next) {
            total -= curr;
          } else {
            total += curr;
          }
        }
        return total > 0 ? total : null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// ===== FAQ =====

const FAQ_ITEMS = [
  {
    q: 'Чем позиционные системы отличаются от непозиционных?',
    a: 'В позиционных системах значение цифры зависит от её позиции (разряда): в числе 222 первая двойка — 200, вторая — 20, третья — 2. В непозиционных (римская, египетская) символ всегда имеет одно значение: X всегда = 10, regardless от позиции. Позиционные системы позволяют легко выполнять арифметику и записывать сколь угодно большие числа.',
  },
  {
    q: 'Откуда взялось число 60 в вавилонской системе?',
    a: '60 — число с большим количеством делителей (1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60), что удобно для деления. От вавилонян нам достались 60 минут в часе, 60 секунд в минуте, 360° в круге, деление на дюжины и футы (12 дюймов).',
  },
  {
    q: 'Кто изобрёл ноль?',
    a: 'Концепцию нуля как числа впервые разработали в Индии в V веке н.э. (Брахмагупта). Независимо ноль изобрели майя в Центральной Америке (III век н.э.). В римской, греческой и египетской системах нуля не было — это сильно затрудняло арифметику.',
  },
  {
    q: 'Что такое титло в славянской системе?',
    a: 'Титло (҃) — волнистая линия над буквами, показывающая, что это число, а не слово. Например, «а» — буква, а «а҃» — число 1. Тысячный знак (҂) ставится перед буквой и умножает её значение на 1000: ҂а = 1000, ҂в = 2000.',
  },
  {
    q: 'Почему в программировании используют шестнадцатеричную систему?',
    a: 'Один байт = 8 бит = два hex-символа. Это удобно: цвет #FF5733 читается как три байта (красный, зелёный, синий), адрес памяти 0xDEADBEEF — 4 байта. Двоичная запись того же числа заняла бы в 4 раза больше места.',
  },
  {
    q: 'Что такое ионическая система у греков?',
    a: 'Это алфавитная система: буквы греческого алфавита обозначают числа (α=1, β=2, ..., ι=10, κ=20, ...). Чтобы получить нужные 27 символов (9 единиц + 9 десятков + 9 сотен), греки добавили 3 архаические буквы: ϛ (стигма = 6), ϟ (коппа = 90), ϡ (сампи = 900).',
  },
];

const SCENARIO_ITEMS = [
  {
    icon: '🏛️',
    title: 'Урок истории математики',
    description: 'Покажите ученикам, как считали древние: введите 2024 и переведите в римскую, греческую, славянскую системы. Ученики увидят, как выглядели числа до изобретения арабских цифр.',
  },
  {
    icon: '💻',
    title: 'Информатика: системы счисления',
    description: 'Быстрый конвертер между двоичной, восьмеричной, десятичной и шестнадцатеричной. Идеально для проверки домашних заданий и упражнений на перевод чисел.',
  },
  {
    icon: '📜',
    title: 'Древнерусская письменность',
    description: 'Переведите год основания Москвы (1147) в славянскую кириллическую систему — получится ҂а҃рм҃з. Сравните с летописным написанием!',
  },
  {
    icon: '🔢',
    title: 'Римские цифры в жизни',
    description: 'Век (XXI), главы книг, номера монархов (Пётр I), циферблаты часов — всё это римская система. Конвертер поможет проверить правильность написания.',
  },
  {
    icon: '🌍',
    title: 'Межпредметный урок',
    description: 'История + математика: покажите, как математическая мысль развивалась в разных цивилизациях — от Вавилона до майя.',
  },
];

// ===== Компонент =====

export default function NumberSystemsScreen({ onBack }: { onBack: () => void }) {
  const [inputValue, setInputValue] = useState('2024');
  const [fromSystem, setFromSystem] = useState<SystemId>('decimal');
  const [customBase, setCustomBase] = useState(7);
  const [showFaq, setShowFaq] = useState(false);
  const [showScen, setShowScen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'convert' | 'reference'>('convert');

  const decimalValue = useMemo(() => {
    return parseNumber(inputValue, fromSystem, customBase);
  }, [inputValue, fromSystem, customBase]);

  const allConversions = useMemo(() => {
    const n = decimalValue;
    if (n === null || isNaN(n)) {
      return SYSTEMS.map((s) => ({ ...s, value: '—', valid: false }));
    }
    return SYSTEMS.map((s) => {
      let value = '—';
      let valid = true;
      try {
        switch (s.id) {
          case 'binary': value = toPositional(n, 2, '01'); break;
          case 'octal': value = toPositional(n, 8, '01234567'); break;
          case 'decimal': value = String(n); break;
          case 'hex': value = toPositional(n, 16, '0123456789ABCDEF'); break;
          case 'base36': value = toPositional(n, 36, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'); break;
          case 'roman': value = toRoman(n); break;
          case 'greek': value = toGreek(n); break;
          case 'slavic': value = toSlavic(n); break;
          case 'egyptian': value = toEgyptian(n); break;
          case 'babylonian': value = toBabylonian(n); break;
          case 'mayan': value = toMayan(n); break;
          case 'custom':
            if (customBase >= 2 && customBase <= 36) {
              value = toPositional(n, customBase, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, customBase));
            }
            break;
        }
      } catch {
        valid = false;
      }
      if (value === '—') valid = false;
      return { ...s, value, valid };
    });
  }, [decimalValue, customBase]);

  const handleCopy = async (text: string, id: string) => {
    if (text === '—') return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
      triggerHaptic('light');
    } catch {
      // ignore
    }
  };

  const handleSystemClick = (sys: SystemId) => {
    setFromSystem(sys);
    if (decimalValue !== null) {
      const conv = allConversions.find((c) => c.id === sys);
      if (conv && conv.value !== '—') {
        setInputValue(conv.value);
      }
    }
  };

  return (
    <div className="min-h-[100dvh] notebook-bg flex flex-col">
      <header className="bg-purple-700 shadow-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Системы счисления</h1>
          </div>
          <Binary className="w-6 h-6 text-white/70 shrink-0" />
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-4 space-y-4 pb-8">
        {/* Вкладки */}
        <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('convert')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'convert' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-purple-50'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" /> Конвертер
          </button>
          <button
            onClick={() => setActiveTab('reference')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'reference' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-purple-50'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Справочник
          </button>
        </div>

        {activeTab === 'convert' && (
          <>
            {/* Ввод */}
            <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Calculator className="w-5 h-5 text-purple-600" />
                <h2 className="text-sm font-bold text-purple-700">Введите число</h2>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1.5">Исходная система</label>
                <div className="flex flex-wrap gap-1.5">
                  {SYSTEMS.filter((s) => s.id !== 'custom').map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setFromSystem(s.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        fromSystem === s.id
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-purple-50'
                      }`}
                    >
                      {s.shortName}
                    </button>
                  ))}
                  <button
                    onClick={() => setFromSystem('custom')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      fromSystem === 'custom'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-purple-50'
                    }`}
                  >
                    Своя база
                  </button>
                </div>
              </div>

              {fromSystem === 'custom' && (
                <div>
                  <label className="text-xs text-gray-500 flex justify-between mb-1">
                    <span>Основание</span>
                    <span className="font-mono text-purple-700">{customBase}</span>
                  </label>
                  <input
                    type="range"
                    min={2}
                    max={36}
                    value={customBase}
                    onChange={(e) => setCustomBase(Number(e.target.value))}
                    className="w-full accent-purple-600"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-gray-500 block mb-1.5">Число в {SYSTEMS.find((s) => s.id === fromSystem)?.name}</label>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Например: 2024 или MMXXIV"
                  className="w-full rounded-xl border-2 border-purple-200 p-3 text-lg font-mono focus:outline-none focus:border-purple-500"
                  autoComplete="off"
                  spellCheck={false}
                />
                {decimalValue === null && inputValue.trim() && (
                  <p className="text-xs text-red-500 mt-1">Неверный формат числа для выбранной системы</p>
                )}
                {decimalValue !== null && (
                  <p className="text-xs text-gray-500 mt-1.5">
                    В десятичной системе: <b className="text-purple-700 font-mono">{decimalValue.toLocaleString('ru-RU')}</b>
                  </p>
                )}
              </div>
            </section>

            {/* Результаты */}
            <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Hash className="w-5 h-5 text-purple-600" />
                <h2 className="text-sm font-bold text-purple-700">
                  Результат в {allConversions.filter((c) => c.valid).length} системах
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {allConversions.map((conv) => {
                  const isFrom = conv.id === fromSystem;
                  return (
                    <div
                      key={conv.id}
                      className={`border-2 rounded-xl p-3 transition-all ${
                        isFrom ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-purple-200'
                      } ${!conv.valid ? 'opacity-40' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <button
                          onClick={() => handleSystemClick(conv.id)}
                          className="flex items-center gap-1.5 text-left"
                          title="Использовать как исходную"
                        >
                          <span className="text-xs font-bold text-purple-700">{conv.shortName}</span>
                          <span className="text-[10px] text-gray-500">{conv.name}</span>
                        </button>
                        <button
                          onClick={() => handleCopy(conv.value, conv.id)}
                          disabled={!conv.valid || conv.value === '—'}
                          className="p-1 rounded hover:bg-purple-100 disabled:opacity-30 transition-colors"
                          aria-label="Копировать"
                        >
                          {copied === conv.id ? (
                            <Check className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </button>
                      </div>
                      <div className="font-mono text-sm break-all text-gray-800 min-h-[1.5rem]">
                        {conv.value}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">{conv.era}</div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Подсказка */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 flex items-start gap-2">
              <HistoryIcon className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <b>Как пользоваться:</b> введите число и выберите исходную систему. Результат появится во всех остальных системах автоматически.
                Нажмите на результат, чтобы скопировать. Кликните по названию системы, чтобы переключиться на неё как на исходную.
              </div>
            </div>
          </>
        )}

        {activeTab === 'reference' && (
          <>
            {/* Справочник по системам */}
            <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-5 h-5 text-purple-600" />
                <h2 className="text-sm font-bold text-purple-700">Справочник по системам счисления</h2>
              </div>

              <div className="space-y-2">
                {SYSTEMS.map((s) => (
                  <details key={s.id} className="border border-purple-100 rounded-xl overflow-hidden">
                    <summary className="px-4 py-3 cursor-pointer hover:bg-purple-50 transition-colors flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded">{s.shortName}</span>
                        <span className="font-semibold text-sm text-gray-800">{s.name}</span>
                      </div>
                      <span className="text-[10px] text-gray-400">{s.era}</span>
                    </summary>
                    <div className="px-4 pb-3 pt-1 text-sm text-gray-700 bg-purple-50/50 border-t border-purple-100 space-y-2">
                      <p>{s.description}</p>
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        <span className="px-2 py-0.5 bg-white rounded border border-gray-200">
                          Тип: <b>{s.type === 'positional' ? 'позиционная' : s.type === 'non-positional' ? 'непозиционная' : 'смешанная'}</b>
                        </span>
                        {s.base && (
                          <span className="px-2 py-0.5 bg-white rounded border border-gray-200">
                            Основание: <b>{s.base}</b>
                          </span>
                        )}
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </section>

            {/* Таблица соответствий */}
            <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-purple-700">Таблица: числа 1-20 в разных системах</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-purple-50 text-purple-800">
                      <th className="border border-purple-100 px-2 py-1.5 text-center">DEC</th>
                      <th className="border border-purple-100 px-2 py-1.5 text-center">BIN</th>
                      <th className="border border-purple-100 px-2 py-1.5 text-center">OCT</th>
                      <th className="border border-purple-100 px-2 py-1.5 text-center">HEX</th>
                      <th className="border border-purple-100 px-2 py-1.5 text-center">ROM</th>
                      <th className="border border-purple-100 px-2 py-1.5 text-center">GR</th>
                      <th className="border border-purple-100 px-2 py-1.5 text-center">СЛ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                      <tr key={n} className="hover:bg-purple-50/50">
                        <td className="border border-gray-100 px-2 py-1 text-center font-bold">{n}</td>
                        <td className="border border-gray-100 px-2 py-1 text-center font-mono">{toPositional(n, 2, '01')}</td>
                        <td className="border border-gray-100 px-2 py-1 text-center font-mono">{toPositional(n, 8, '01234567')}</td>
                        <td className="border border-gray-100 px-2 py-1 text-center font-mono">{toPositional(n, 16, '0123456789ABCDEF')}</td>
                        <td className="border border-gray-100 px-2 py-1 text-center font-mono">{toRoman(n)}</td>
                        <td className="border border-gray-100 px-2 py-1 text-center" style={{ fontFamily: 'serif' }}>{toGreek(n)}</td>
                        <td className="border border-gray-100 px-2 py-1 text-center" style={{ fontFamily: 'serif' }}>{toSlavic(n)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* FAQ */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button onClick={() => setShowFaq(!showFaq)} className="w-full px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-700 text-sm">Частые вопросы</h3>
              <span className="text-xs font-bold text-purple-400">{FAQ_ITEMS.length}</span>
            </div>
            {showFaq ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />}
          </button>
          {showFaq && (
            <div className="px-4 pb-4 space-y-2">
              {FAQ_ITEMS.map((item, idx) => (
                <div key={idx} className="border border-purple-100 rounded-xl overflow-hidden">
                  <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-purple-50 transition-colors">
                    <span className="font-semibold text-sm text-gray-800">{item.q}</span>
                    {openFaq === idx ? <ChevronUp className="w-4 h-4 text-purple-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-purple-600 shrink-0" />}
                  </button>
                  {openFaq === idx && <div className="px-4 pb-3 pt-1 text-sm text-gray-600 bg-purple-50/50 border-t border-purple-100">{item.a}</div>}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Сценарии */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button onClick={() => setShowScen(!showScen)} className="w-full px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-purple-700 text-sm">Сценарии использования</h3>
              <span className="text-xs font-bold text-purple-400">{SCENARIO_ITEMS.length}</span>
            </div>
            {showScen ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />}
          </button>
          {showScen && (
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
          )}
        </section>
      </main>
    </div>
  );
}
