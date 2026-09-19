import { useState, useEffect, useMemo } from 'react';
import {
  Binary,
  ArrowLeftRight,
  HelpCircle,
  Trophy,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Hash,
  BookOpen,
  Lightbulb,
  Zap,
  Clock,
  Star,
} from 'lucide-react';
import BackButton from './BackButton';
import { triggerHaptic } from '@/lib/haptic';

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
  base: number | null;
  era: string;
  type: 'positional' | 'non-positional' | 'mixed';
  description: string;
  example: string;
  allowedChars?: string;
  color: string;
  icon: string;
}

const SYSTEMS: NumeralSystem[] = [
  {
    id: 'decimal',
    name: 'Десятичная',
    shortName: 'DEC',
    base: 10,
    era: 'Индия, V в. н.э.',
    type: 'positional',
    description: 'Привычная нам система с основанием 10',
    example: '2024',
    allowedChars: '0-9',
    color: 'from-blue-500 to-cyan-500',
    icon: '🔢',
  },
  {
    id: 'binary',
    name: 'Двоичная',
    shortName: 'BIN',
    base: 2,
    era: 'Лейбниц, 1703',
    type: 'positional',
    description: 'Основа всех компьютеров',
    example: '11111101000',
    allowedChars: '0-1',
    color: 'from-purple-500 to-pink-500',
    icon: '💻',
  },
  {
    id: 'octal',
    name: 'Восьмеричная',
    shortName: 'OCT',
    base: 8,
    era: 'Современность',
    type: 'positional',
    description: 'Удобна для Unix прав доступа',
    example: '3750',
    allowedChars: '0-7',
    color: 'from-green-500 to-emerald-500',
    icon: '8️⃣',
  },
  {
    id: 'hex',
    name: 'Шестнадцатеричная',
    shortName: 'HEX',
    base: 16,
    era: 'Современность',
    type: 'positional',
    description: 'Цвета и адреса памяти',
    example: '7E8',
    allowedChars: '0-9, A-F',
    color: 'from-orange-500 to-red-500',
    icon: '🎨',
  },
  {
    id: 'roman',
    name: 'Римская',
    shortName: 'ROM',
    base: null,
    era: 'Древний Рим',
    type: 'non-positional',
    description: 'I=1, V=5, X=10, L=50, C=100, D=500, M=1000',
    example: 'MMXXIV',
    allowedChars: 'I, V, X, L, C, D, M',
    color: 'from-amber-500 to-yellow-500',
    icon: '🏛️',
  },
  {
    id: 'greek',
    name: 'Греческая',
    shortName: 'GR',
    base: null,
    era: 'V в. до н.э.',
    type: 'mixed',
    description: 'Алфавитная система древних греков',
    example: 'α´',
    allowedChars: 'α-ω, ϛ, ϟ, ϡ',
    color: 'from-indigo-500 to-blue-500',
    icon: '🏺',
  },
  {
    id: 'slavic',
    name: 'Славянская',
    shortName: 'СЛ',
    base: null,
    era: 'IX-XVII вв.',
    type: 'mixed',
    description: 'Кириллическая система с титлом',
    example: 'а҃',
    allowedChars: 'а-ѡ, ҃, ҂',
    color: 'from-red-500 to-pink-500',
    icon: '📜',
  },
  {
    id: 'egyptian',
    name: 'Египетская',
    shortName: 'EG',
    base: null,
    era: 'ок. 3000 до н.э.',
    type: 'non-positional',
    description: 'Иероглифическая система',
    example: '𓏺𓏺𓏺',
    allowedChars: '𓏺-𓁨',
    color: 'from-yellow-600 to-amber-600',
    icon: '🔺',
  },
  {
    id: 'babylonian',
    name: 'Вавилонская',
    shortName: 'BAB',
    base: 60,
    era: 'II тыс. до н.э.',
    type: 'positional',
    description: '60 минут в часе — отсюда',
    example: '𒐊𒏹',
    allowedChars: '𒐊, 𒏹',
    color: 'from-stone-500 to-stone-700',
    icon: '🏺',
  },
  {
    id: 'mayan',
    name: 'Майя',
    shortName: 'MAY',
    base: 20,
    era: 'III в. н.э.',
    type: 'positional',
    description: 'Изобрели ноль независимо',
    example: '●●●',
    allowedChars: '●, ▬, 𝋠',
    color: 'from-emerald-500 to-teal-500',
    icon: '🗿',
  },
  {
    id: 'base36',
    name: '36-ричная',
    shortName: 'B36',
    base: 36,
    era: 'Современность',
    type: 'positional',
    description: 'Все цифры + латиница',
    example: '1K8',
    allowedChars: '0-9, A-Z',
    color: 'from-violet-500 to-purple-500',
    icon: '🔤',
  },
];

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
  1: '𓏺', 10: '𓎆', 100: '𓍢', 1000: '𓆼',
  10000: '𓂭', 100000: '𓆨', 1000000: '𓁨',
};

function toEgyptian(n: number): string {
  if (n <= 0 || n > 9999999) return '—';
  const parts: string[] = [];
  let r = n;
  for (const v of [1000000, 100000, 10000, 1000, 100, 10, 1]) {
    const count = Math.floor(r / v);
    if (count > 0) {
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
    return '▬'.repeat(bars) + '●'.repeat(dots);
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
          if (curr < next) total -= curr;
          else total += curr;
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

export default function NumberSystemsScreen({ onBack }: { onBack: () => void }) {
  const [inputValue, setInputValue] = useState('2024');
  const [fromSystem, setFromSystem] = useState<SystemId>('decimal');
  const [customBase, setCustomBase] = useState(7);
  const [copied, setCopied] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeSystem = SYSTEMS.find(s => s.id === fromSystem)!;

  const decimalValue = useMemo(() => {
    return parseNumber(inputValue, fromSystem, customBase);
  }, [inputValue, fromSystem, customBase]);

  const conversions = useMemo(() => {
    const n = decimalValue;
    if (n === null || isNaN(n)) return [];
    
    return SYSTEMS.filter(s => s.id !== fromSystem).map((s) => {
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
  }, [decimalValue, fromSystem, customBase]);

  const handleCopy = async (text: string, id: string) => {
    if (text === '—') return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
      triggerHaptic('light');
    } catch {}
  };

  const handleSystemChange = (sys: SystemId) => {
    setFromSystem(sys);
    if (decimalValue !== null) {
      const conv = conversions.find((c) => c.id === sys);
      if (conv && conv.value !== '—') {
        setInputValue(conv.value);
      }
    }
  };

  const positionalConversions = conversions.filter(c => c.type === 'positional');
  const nonPositionalConversions = conversions.filter(c => c.type !== 'positional');

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
        {/* Быстрый старт */}
        <section className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-6 h-6" />
            <h2 className="text-xl font-bold">Конвертер чисел</h2>
          </div>

          {/* Выбор системы */}
          <div className="mb-4">
            <label className="text-sm font-semibold mb-2 block opacity-90">Исходная система:</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {SYSTEMS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSystemChange(s.id)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    fromSystem === s.id
                      ? 'bg-white text-purple-700 shadow-lg scale-105'
                      : 'bg-white/20 hover:bg-white/30 backdrop-blur'
                  }`}
                >
                  <div className="text-lg mb-0.5">{s.icon}</div>
                  <div className="text-xs">{s.shortName}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Поле ввода */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold opacity-90">
                Введите число в {activeSystem.name}:
              </label>
              {activeSystem.allowedChars && (
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                  Допустимо: {activeSystem.allowedChars}
                </span>
              )}
            </div>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Например: ${activeSystem.example}`}
              className="w-full bg-white text-gray-900 rounded-lg p-3 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-white/50"
              autoComplete="off"
              spellCheck={false}
            />
            {decimalValue === null && inputValue.trim() && (
              <p className="text-xs text-red-200 mt-2">⚠️ Неверный формат числа</p>
            )}
            {decimalValue !== null && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <div className="text-sm opacity-90">
                  В десятичной: <span className="font-bold text-lg">{decimalValue.toLocaleString('ru-RU')}</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Результаты */}
        {decimalValue !== null && (
          <>
            {/* Позиционные системы */}
            {positionalConversions.length > 0 && (
              <section className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Hash className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-bold text-gray-900">Позиционные системы</h3>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                    значение зависит от позиции
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {positionalConversions.map((conv) => (
                    <div
                      key={conv.id}
                      className={`border-2 rounded-xl p-4 transition-all hover:shadow-md ${
                        !conv.valid ? 'opacity-40' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{conv.icon}</span>
                          <div>
                            <div className="font-bold text-gray-900">{conv.name}</div>
                            <div className="text-xs text-gray-500">{conv.era}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCopy(conv.value, conv.id)}
                          disabled={!conv.valid || conv.value === '—'}
                          className="p-2 rounded-lg hover:bg-purple-50 disabled:opacity-30 transition-colors"
                          aria-label="Копировать"
                        >
                          {copied === conv.id ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm break-all text-gray-800 min-h-[2.5rem] flex items-center">
                        {conv.value}
                      </div>
                      {conv.base && (
                        <div className="mt-2 text-xs text-gray-500">
                          Основание: <span className="font-semibold">{conv.base}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Непозиционные системы */}
            {nonPositionalConversions.length > 0 && (
              <section className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 text-amber-600" />
                  <h3 className="text-lg font-bold text-gray-900">Исторические системы</h3>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                    древние цивилизации
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {nonPositionalConversions.map((conv) => (
                    <div
                      key={conv.id}
                      className={`border-2 rounded-xl p-4 transition-all hover:shadow-md ${
                        !conv.valid ? 'opacity-40' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{conv.icon}</span>
                          <div>
                            <div className="font-bold text-gray-900">{conv.name}</div>
                            <div className="text-xs text-gray-500">{conv.era}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCopy(conv.value, conv.id)}
                          disabled={!conv.valid || conv.value === '—'}
                          className="p-2 rounded-lg hover:bg-amber-50 disabled:opacity-30 transition-colors"
                          aria-label="Копировать"
                        >
                          {copied === conv.id ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 font-mono text-lg break-all text-gray-800 min-h-[3rem] flex items-center justify-center" style={{ fontFamily: 'serif' }}>
                        {conv.value}
                      </div>
                      <div className="mt-2 text-xs text-gray-600 italic">
                        {conv.description}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Подсказки */}
        <section className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <b>Совет:</b> Нажмите на любую систему в результатах, чтобы переключиться на неё. 
              Число автоматически конвертируется, и вы сможете редактировать его в новой системе.
            </div>
          </div>
        </section>

        {/* Расширенные настройки */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-5 py-4 flex items-center justify-between gap-2 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-700 text-base">Справочник и примеры</h3>
            </div>
            {showAdvanced ? <ChevronUp className="w-5 h-5 text-purple-600" /> : <ChevronDown className="w-5 h-5 text-purple-600" />}
          </button>
          {showAdvanced && (
            <div className="px-5 pb-5 space-y-4 border-t border-gray-200">
              {/* Таблица */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Числа 1-10 в разных системах</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-purple-50 text-purple-800">
                        <th className="border border-purple-100 px-2 py-2 text-center">DEC</th>
                        <th className="border border-purple-100 px-2 py-2 text-center">BIN</th>
                        <th className="border border-purple-100 px-2 py-2 text-center">OCT</th>
                        <th className="border border-purple-100 px-2 py-2 text-center">HEX</th>
                        <th className="border border-purple-100 px-2 py-2 text-center">ROM</th>
                        <th className="border border-purple-100 px-2 py-2 text-center">GR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <tr key={n} className="hover:bg-purple-50/50">
                          <td className="border border-gray-100 px-2 py-1.5 text-center font-bold">{n}</td>
                          <td className="border border-gray-100 px-2 py-1.5 text-center font-mono">{toPositional(n, 2, '01')}</td>
                          <td className="border border-gray-100 px-2 py-1.5 text-center font-mono">{toPositional(n, 8, '01234567')}</td>
                          <td className="border border-gray-100 px-2 py-1.5 text-center font-mono">{toPositional(n, 16, '0123456789ABCDEF')}</td>
                          <td className="border border-gray-100 px-2 py-1.5 text-center font-mono">{toRoman(n)}</td>
                          <td className="border border-gray-100 px-2 py-1.5 text-center" style={{ fontFamily: 'serif' }}>{toGreek(n)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* FAQ */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Частые вопросы</h4>
                <div className="space-y-2">
                  {[
                    {
                      q: 'Чем позиционные системы отличаются от непозиционных?',
                      a: 'В позиционных системах значение цифры зависит от её позиции (разряда): в числе 222 первая двойка — 200, вторая — 20, третья — 2. В непозиционных (римская, египетская) символ всегда имеет одно значение: X всегда = 10, regardless от позиции.',
                    },
                    {
                      q: 'Откуда взялось число 60 в вавилонской системе?',
                      a: '60 — число с большим количеством делителей (1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60), что удобно для деления. От вавилонян нам достались 60 минут в часе, 60 секунд в минуте, 360° в круге.',
                    },
                    {
                      q: 'Кто изобрёл ноль?',
                      a: 'Концепцию нуля как числа впервые разработали в Индии в V веке н.э. (Брахмагупта). Независимо ноль изобрели майя в Центральной Америке (III век н.э.).',
                    },
                  ].map((item, idx) => (
                    <details key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                      <summary className="px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors font-medium text-sm">
                        {item.q}
                      </summary>
                      <div className="px-4 pb-3 pt-1 text-sm text-gray-600 bg-gray-50 border-t border-gray-200">
                        {item.a}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
