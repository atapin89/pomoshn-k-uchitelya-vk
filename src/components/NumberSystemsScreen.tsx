import { useState, useMemo } from 'react';
import {
  Binary,
  Copy,
  Check,
  LayoutGrid,
  Table2,
  Sigma,
  Landmark,
  Lightbulb,
  ArrowDownToLine,
} from 'lucide-react';
import BackButton from './BackButton';
import { triggerHaptic } from '@/lib/haptic';

// ===== Типы =====

type SystemId =
  | 'binary'
  | 'octal'
  | 'decimal'
  | 'hex'
  | 'base36'
  | 'roman'
  | 'greek'
  | 'slavic'
  | 'egyptian'
  | 'babylonian'
  | 'mayan';

type ViewId = 'cards' | 'table' | 'breakdown' | 'history';

interface NumeralSystem {
  id: SystemId;
  name: string;
  shortName: string;
  base: number | null;
  era: string;
  type: 'positional' | 'non-positional' | 'mixed';
  typeName: string;
  howToRead: string;
  example: string;
  allowedChars: string;
  icon: string;
}

// ===== Системы =====

const SYSTEMS: NumeralSystem[] = [
  { id: 'decimal', name: 'Десятичная', shortName: 'DEC', base: 10, era: 'Индия, V в.', type: 'positional', typeName: 'Позиционная', howToRead: 'Каждая цифра умножается на степень десятки: 2024 = 2×1000 + 0×100 + 2×10 + 4.', example: '2024', allowedChars: '0-9', icon: '🔢' },
  { id: 'binary', name: 'Двоичная', shortName: 'BIN', base: 2, era: 'Лейбниц, 1703', type: 'positional', typeName: 'Позиционная', howToRead: 'Только 0 и 1. Каждый разряд — степень двойки: 1010 = 8+2 = 10.', example: '11111101000', allowedChars: '0, 1', icon: '💻' },
  { id: 'octal', name: 'Восьмеричная', shortName: 'OCT', base: 8, era: 'Современность', type: 'positional', typeName: 'Позиционная', howToRead: 'Цифры 0-7, разряды — степени восьмёрки. Удобна в программировании.', example: '3750', allowedChars: '0-7', icon: '8️⃣' },
  { id: 'hex', name: 'Шестнадцатеричная', shortName: 'HEX', base: 16, era: 'Современность', type: 'positional', typeName: 'Позиционная', howToRead: 'Цифры 0-9 и буквы A-F. Один байт = два символа: FF = 255.', example: '7E8', allowedChars: '0-9, A-F', icon: '🎨' },
  { id: 'base36', name: '36-ричная', shortName: 'B36', base: 36, era: 'Современность', type: 'positional', typeName: 'Позиционная', howToRead: 'Все цифры и латинские буквы. Самая компактная запись больших чисел.', example: '1K8', allowedChars: '0-9, A-Z', icon: '🔤' },
  { id: 'roman', name: 'Римская', shortName: 'ROM', base: null, era: 'Древний Рим', type: 'non-positional', typeName: 'Непозиционная', howToRead: 'Символы складываются: MMXXIV = 1000+1000+10+10+1+5. Меньший слева — вычитается: IV = 4.', example: 'MMXXIV', allowedChars: 'I V X L C D M', icon: '🏛️' },
  { id: 'greek', name: 'Греческая', shortName: 'GR', base: null, era: 'V в. до н.э.', type: 'mixed', typeName: 'Смешанная', howToRead: 'Буквы алфавита = числа: α=1, ι=10, ρ=100. Штрих слева (͵) означает тысячи.', example: '͵βσδ´', allowedChars: 'α-ω, ϛ, ϟ, ϡ', icon: '🏺' },
  { id: 'slavic', name: 'Славянская', shortName: 'СЛ', base: null, era: 'IX-XVII вв.', type: 'mixed', typeName: 'Смешанная', howToRead: 'Буквы кириллицы = числа: а=1, і=10, р=100. Титло (҃) сверху, знак ҂ = тысячи.', example: '҂всд҃', allowedChars: 'а-ѡ, ҃, ҂', icon: '📜' },
  { id: 'egyptian', name: 'Египетская', shortName: 'EG', base: null, era: '3000 до н.э.', type: 'non-positional', typeName: 'Непозиционная', howToRead: 'Иероглифы повторяются: палочка=1, дуга=10, спираль=100, лотос=1000.', example: '𓆼𓆼𓍢𓍢𓏺𓏺𓏺𓏺', allowedChars: 'иероглифы', icon: '🔺' },
  { id: 'babylonian', name: 'Вавилонская', shortName: 'BAB', base: 60, era: 'II тыс. до н.э.', type: 'positional', typeName: 'Позиционная', howToRead: 'Разряды по 60. Клинья: вертикальный=1, угол=10. Отсюда 60 минут в часе.', example: '𒐊𒏹𒏹', allowedChars: '𒐊, 𒏹', icon: '🧱' },
  { id: 'mayan', name: 'Майя', shortName: 'MAY', base: 20, era: 'III в. н.э.', type: 'positional', typeName: 'Позиционная', howToRead: 'Разряды по 20, запись снизу вверх. Точка=1, черта=5, ракушка=0.', example: '●▬▬  ●●●●', allowedChars: '●, ▬, 𝋠', icon: '🗿' },
];

const QUICK_EXAMPLES = [2024, 255, 365, 1000, 42, 7];

// ===== Алфавиты =====

const GREEK_UNITS: Record<number, string> = { 1: 'α', 2: 'β', 3: 'γ', 4: 'δ', 5: 'ε', 6: 'ϛ', 7: 'ζ', 8: 'η', 9: 'θ' };
const GREEK_TENS: Record<number, string> = { 10: 'ι', 20: 'κ', 30: 'λ', 40: 'μ', 50: 'ν', 60: 'ξ', 70: 'ο', 80: 'π', 90: 'ϟ' };
const GREEK_HUNDREDS: Record<number, string> = { 100: 'ρ', 200: 'σ', 300: 'τ', 400: 'υ', 500: 'φ', 600: 'χ', 700: 'ψ', 800: 'ω', 900: 'ϡ' };
const SLAVIC_UNITS: Record<number, string> = { 1: 'а', 2: 'в', 3: 'г', 4: 'д', 5: 'е', 6: 'ѕ', 7: 'з', 8: 'и', 9: 'ѳ' };
const SLAVIC_TENS: Record<number, string> = { 10: 'і', 20: 'к', 30: 'л', 40: 'м', 50: 'н', 60: 'ѯ', 70: 'о', 80: 'п', 90: 'ч' };
const SLAVIC_HUNDREDS: Record<number, string> = { 100: 'р', 200: 'с', 300: 'т', 400: 'ѵ', 500: 'ф', 600: 'х', 700: 'ѱ', 800: 'ѡ', 900: 'ц' };
const EGYPT_GLYPHS: Record<number, string> = { 1: '𓏺', 10: '𓎆', 100: '𓍢', 1000: '', 10000: '𓂭', 100000: '𓆨', 1000000: '𓁨' };

// ===== Конвертация =====

function toPositional(n: number, base: number, digits: string): string {
  if (n === 0) return '0';
  let out = '';
  let r = n;
  while (r > 0) {
    out = digits[r % base] + out;
    r = Math.floor(r / base);
  }
  return out;
}

function toRoman(n: number): string {
  if (n <= 0 || n >= 4000) return '—';
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let out = '';
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { out += syms[i]; n -= vals[i]; }
  }
  return out;
}

function toGreek(n: number): string {
  if (n <= 0 || n >= 10000) return '—';
  const th = Math.floor(n / 1000);
  const r = n % 1000;
  const h = Math.floor(r / 100) * 100;
  const t = Math.floor((r % 100) / 10) * 10;
  const u = r % 10;
  return `${th ? `͵${GREEK_UNITS[th]}` : ''}${GREEK_HUNDREDS[h] || ''}${GREEK_TENS[t] || ''}${GREEK_UNITS[u] || ''}´`;
}

function toSlavic(n: number): string {
  if (n <= 0 || n >= 10000) return '—';
  const th = Math.floor(n / 1000);
  const r = n % 1000;
  const h = Math.floor(r / 100) * 100;
  const t = Math.floor((r % 100) / 10) * 10;
  const u = r % 10;
  return `${th ? `҂${SLAVIC_UNITS[th]}` : ''}${SLAVIC_HUNDREDS[h] || ''}${SLAVIC_TENS[t] || ''}${SLAVIC_UNITS[u] || ''}҃`;
}

function toEgyptian(n: number): string {
  if (n <= 0 || n > 9999999) return '—';
  const parts: string[] = [];
  let r = n;
  for (const v of [1000000, 100000, 10000, 1000, 100, 10, 1]) {
    const c = Math.floor(r / v);
    if (c) { parts.push(EGYPT_GLYPHS[v].repeat(Math.min(c, 9))); r -= c * v; }
  }
  return parts.join('');
}

function toBabylonian(n: number): string {
  if (n <= 0) return '—';
  const digits: number[] = [];
  let r = n;
  while (r > 0) { digits.unshift(r % 60); r = Math.floor(r / 60); }
  return digits.map((d) => '𒐊'.repeat(Math.floor(d / 10)) + ''.repeat(d % 10)).join(' ');
}

function toMayan(n: number): string {
  if (n < 0) return '—';
  if (n === 0) return '𝋠';
  const digits: number[] = [];
  let r = n;
  while (r > 0) { digits.unshift(r % 20); r = Math.floor(r / 20); }
  return digits.map((d) => (d === 0 ? '𝋠' : '▬'.repeat(Math.floor(d / 5)) + '●'.repeat(d % 5))).join(' ');
}

function convert(n: number, id: SystemId): string {
  switch (id) {
    case 'binary': return toPositional(n, 2, '01');
    case 'octal': return toPositional(n, 8, '01234567');
    case 'decimal': return String(n);
    case 'hex': return toPositional(n, 16, '0123456789ABCDEF');
    case 'base36': return toPositional(n, 36, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    case 'roman': return toRoman(n);
    case 'greek': return toGreek(n);
    case 'slavic': return toSlavic(n);
    case 'egyptian': return toEgyptian(n);
    case 'babylonian': return toBabylonian(n);
    case 'mayan': return toMayan(n);
  }
}

function parseNumber(value: string, id: SystemId): number | null {
  const s = value.trim();
  if (!s) return null;
  switch (id) {
    case 'binary': return /^[01]+$/.test(s) ? parseInt(s, 2) : null;
    case 'octal': return /^[0-7]+$/.test(s) ? parseInt(s, 8) : null;
    case 'decimal': return /^\d+$/.test(s) ? parseInt(s, 10) : null;
    case 'hex': return /^[0-9a-fA-F]+$/.test(s) ? parseInt(s, 16) : null;
    case 'base36': return /^[0-9a-zA-Z]+$/.test(s) ? parseInt(s, 36) : null;
    case 'roman': {
      const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
      const up = s.toUpperCase();
      if (!/^[IVXLCDM]+$/.test(up)) return null;
      let total = 0;
      for (let i = 0; i < up.length; i++) {
        const curr = map[up[i]];
        const next = map[up[i + 1]] || 0;
        total += curr < next ? -curr : curr;
      }
      return total > 0 ? total : null;
    }
    default: return null;
  }
}

// ===== Разложение по разрядам =====

function positionalParts(n: number, base: number) {
  const parts: { digit: number; power: number; value: number }[] = [];
  let r = n;
  let p = 0;
  if (r === 0) parts.push({ digit: 0, power: 0, value: 0 });
  while (r > 0) {
    const d = r % base;
    parts.unshift({ digit: d, power: p, value: d * Math.pow(base, p) });
    r = Math.floor(r / base);
    p++;
  }
  return parts;
}

function romanParts(n: number) {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  const out: { sym: string; val: number }[] = [];
  let r = n;
  for (let i = 0; i < vals.length; i++) {
    while (r >= vals[i]) { out.push({ sym: syms[i], val: vals[i] }); r -= vals[i]; }
  }
  return out;
}

function alphaParts(n: number, units: Record<number, string>, tens: Record<number, string>, hundreds: Record<number, string>, thousandMark: string) {
  const out: { sym: string; val: number }[] = [];
  const th = Math.floor(n / 1000);
  if (th) out.push({ sym: `${thousandMark}${units[th]}`, val: th * 1000 });
  const r = n % 1000;
  const h = Math.floor(r / 100) * 100;
  if (h) out.push({ sym: hundreds[h], val: h });
  const t = Math.floor((r % 100) / 10) * 10;
  if (t) out.push({ sym: tens[t], val: t });
  const u = r % 10;
  if (u) out.push({ sym: units[u], val: u });
  return out;
}

function egyptParts(n: number) {
  const out: { glyph: string; count: number; val: number }[] = [];
  let r = n;
  for (const v of [1000000, 100000, 10000, 1000, 100, 10, 1]) {
    const c = Math.floor(r / v);
    if (c) { out.push({ glyph: EGYPT_GLYPHS[v], count: c, val: c * v }); r -= c * v; }
  }
  return out;
}

// ===== Компонент =====

export default function NumberSystemsScreen({ onBack }: { onBack: () => void }) {
  const [inputValue, setInputValue] = useState('2024');
  const [inputSystem, setInputSystem] = useState<SystemId>('decimal');
  const [view, setView] = useState<ViewId>('cards');
  const [breakdownSystem, setBreakdownSystem] = useState<SystemId>('decimal');
  const [copied, setCopied] = useState<string | null>(null);

  const decimal = useMemo(() => parseNumber(inputValue, inputSystem), [inputValue, inputSystem]);

  const handleCopy = async (text: string, id: string) => {
    if (!text || text === '—') return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
      triggerHaptic('light');
    } catch {}
  };

  const useAsInput = (sys: SystemId) => {
    if (decimal === null) return;
    setInputSystem(sys);
    setInputValue(convert(decimal, sys));
    triggerHaptic('light');
  };

  const activeInput = SYSTEMS.find((s) => s.id === inputSystem)!;

  const VIEWS: { id: ViewId; label: string; icon: typeof LayoutGrid }[] = [
    { id: 'cards', label: 'Карточки', icon: LayoutGrid },
    { id: 'table', label: 'Таблица', icon: Table2 },
    { id: 'breakdown', label: 'Разложение', icon: Sigma },
    { id: 'history', label: 'Как читать', icon: Landmark },
  ];

  return (
    <div className="min-h-[100dvh] notebook-bg flex flex-col">
      {/* Шапка */}
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
        {/* ===== ВВОД СВЕРХУ ===== */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-bold text-purple-700">Ваше число</label>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">в системе:</span>
              <select
                value={inputSystem}
                onChange={(e) => setInputSystem(e.target.value as SystemId)}
                className="rounded-lg border border-purple-200 px-2 py-1 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                {SYSTEMS.filter((s) => s.id !== 'greek' && s.id !== 'slavic' && s.id !== 'egyptian' && s.id !== 'babylonian' && s.id !== 'mayan').map((s) => (
                  <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Например: ${activeInput.example}`}
            className="w-full rounded-xl border-2 border-purple-200 p-3 text-xl font-mono text-gray-900 focus:outline-none focus:border-purple-500"
            autoComplete="off"
            spellCheck={false}
          />

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-500">Примеры:</span>
            {QUICK_EXAMPLES.map((n) => (
              <button
                key={n}
                onClick={() => { setInputSystem('decimal'); setInputValue(String(n)); }}
                className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-semibold hover:bg-purple-100 transition-colors"
              >
                {n}
              </button>
            ))}
          </div>

          {decimal === null ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
              ⚠️ Введите корректное число. Допустимые символы для {activeInput.name}: <b>{activeInput.allowedChars}</b>
            </div>
          ) : (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center justify-between gap-2">
              <span className="text-sm text-purple-800">
                Это число в десятичной системе: <b className="text-lg font-mono">{decimal.toLocaleString('ru-RU')}</b>
              </span>
            </div>
          )}
        </section>

        {/* ===== ПЕРЕКЛЮЧАТЕЛИ ПРЕДСТАВЛЕНИЯ ===== */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <div className="grid grid-cols-4 gap-1.5 bg-gray-100 rounded-xl p-1.5">
            {VIEWS.map((v) => {
              const Icon = v.icon;
              return (
                <button
                  key={v.id}
                  onClick={() => { setView(v.id); triggerHaptic('light'); }}
                  className={`flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                    view === v.id ? 'bg-purple-600 text-white shadow-md' : 'text-gray-600 hover:bg-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {v.label}
                </button>
              );
            })}
          </div>

          {/* --- ВИД: КАРТОЧКИ --- */}
          {view === 'cards' && (
            decimal === null ? (
              <p className="text-sm text-gray-400 text-center py-6">Введите число сверху, чтобы увидеть его во всех системах</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SYSTEMS.map((s) => {
                  const value = convert(decimal, s.id);
                  const isInput = s.id === inputSystem;
                  return (
                    <div key={s.id} className={`border-2 rounded-xl p-3 ${isInput ? 'border-purple-400 bg-purple-50' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xl shrink-0">{s.icon}</span>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-gray-900 truncate">{s.name}</div>
                            <div className="text-[10px] text-gray-500">{s.typeName}{s.base ? ` · основание ${s.base}` : ''}</div>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => handleCopy(value, s.id)}
                            className="p-1.5 rounded-lg hover:bg-white transition-colors"
                            aria-label="Копировать"
                          >
                            {copied === s.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                          </button>
                          <button
                            onClick={() => useAsInput(s.id)}
                            disabled={isInput || value === '—'}
                            className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 transition-colors"
                            aria-label="Ввести в этой системе"
                            title="Ввести в этой системе"
                          >
                            <ArrowDownToLine className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-2.5 font-mono text-base break-all text-gray-800 border border-gray-100" style={{ fontFamily: s.type === 'positional' ? 'monospace' : 'serif' }}>
                        {value}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* --- ВИД: ТАБЛИЦА --- */}
          {view === 'table' && (
            decimal === null ? (
              <p className="text-sm text-gray-400 text-center py-6">Введите число сверху, чтобы увидеть таблицу</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-purple-50 text-purple-800">
                      <th className="border border-purple-100 px-2 py-2 text-left">Система</th>
                      <th className="border border-purple-100 px-2 py-2 text-left">Запись числа</th>
                      <th className="border border-purple-100 px-2 py-2 text-center">Тип</th>
                      <th className="border border-purple-100 px-2 py-2 text-left">Эпоха</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SYSTEMS.map((s) => (
                      <tr key={s.id} className={s.id === inputSystem ? 'bg-purple-50' : 'hover:bg-gray-50'}>
                        <td className="border border-gray-100 px-2 py-2 font-semibold whitespace-nowrap">
                          {s.icon} {s.name}
                        </td>
                        <td className="border border-gray-100 px-2 py-2 font-mono break-all" style={{ fontFamily: s.type === 'positional' ? 'monospace' : 'serif' }}>
                          {convert(decimal, s.id)}
                        </td>
                        <td className="border border-gray-100 px-2 py-2 text-center text-xs whitespace-nowrap">{s.typeName}</td>
                        <td className="border border-gray-100 px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{s.era}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* --- ВИД: РАЗЛОЖЕНИЕ --- */}
          {view === 'breakdown' && (
            decimal === null || decimal <= 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Введите положительное число, чтобы увидеть разложение по разрядам</p>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-1.5 flex-wrap">
                  {SYSTEMS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setBreakdownSystem(s.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        breakdownSystem === s.id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-purple-50'
                      }`}
                    >
                      {s.icon} {s.shortName}
                    </button>
                  ))}
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  {(() => {
                    const sys = SYSTEMS.find((s) => s.id === breakdownSystem)!;
                    if (sys.type === 'positional' && sys.base) {
                      const parts = positionalParts(decimal, sys.base);
                      const digitChar = (d: number) => '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[d] ?? String(d);
                      return (
                        <>
                          <p className="text-sm text-gray-600">
                            Число <b className="font-mono">{convert(decimal, sys.id)}</b> в системе с основанием <b>{sys.base}</b>:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {parts.map((p, i) => (
                              <span key={i} className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm font-mono">
                                <b className="text-purple-700">{digitChar(p.digit)}</b>×{sys.base}
                                <sup>{p.power}</sup>
                                <span className="text-gray-400"> = {p.value}</span>
                              </span>
                            ))}
                          </div>
                          <p className="text-sm text-gray-700 pt-1">
                            Сумма: {parts.map((p) => p.value).join(' + ')} = <b className="text-purple-700">{decimal}</b>
                          </p>
                        </>
                      );
                    }
                    if (sys.id === 'roman') {
                      const parts = romanParts(decimal);
                      return (
                        <>
                          <p className="text-sm text-gray-600">Римская запись <b className="font-mono">{toRoman(decimal)}</b> читается слева направо:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {parts.map((p, i) => (
                              <span key={i} className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm font-mono">
                                <b className="text-amber-700">{p.sym}</b> = {p.val}
                              </span>
                            ))}
                          </div>
                          <p className="text-sm text-gray-700 pt-1">Сумма: <b className="text-purple-700">{decimal}</b></p>
                        </>
                      );
                    }
                    if (sys.id === 'greek' || sys.id === 'slavic') {
                      const parts = sys.id === 'greek'
                        ? alphaParts(decimal, GREEK_UNITS, GREEK_TENS, GREEK_HUNDREDS, '͵')
                        : alphaParts(decimal, SLAVIC_UNITS, SLAVIC_TENS, SLAVIC_HUNDREDS, '҂');
                      return (
                        <>
                          <p className="text-sm text-gray-600">Запись <b style={{ fontFamily: 'serif' }}>{sys.id === 'greek' ? toGreek(decimal) : toSlavic(decimal)}</b> состоит из букв-цифр:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {parts.map((p, i) => (
                              <span key={i} className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm" style={{ fontFamily: 'serif' }}>
                                <b className="text-red-700">{p.sym}</b> = {p.val}
                              </span>
                            ))}
                          </div>
                          <p className="text-sm text-gray-700 pt-1">Сумма: <b className="text-purple-700">{decimal}</b></p>
                        </>
                      );
                    }
                    if (sys.id === 'egyptian') {
                      const parts = egyptParts(decimal);
                      return (
                        <>
                          <p className="text-sm text-gray-600">Египетская запись состоит из групп одинаковых иероглифов:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {parts.map((p, i) => (
                              <span key={i} className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm">
                                <b className="text-yellow-700">{p.glyph}</b>×{p.count} = {p.val}
                              </span>
                            ))}
                          </div>
                          <p className="text-sm text-gray-700 pt-1">Сумма: <b className="text-purple-700">{decimal}</b></p>
                        </>
                      );
                    }
                    return <p className="text-sm text-gray-500">Для этой системы разложение показано в виде «Карточки».</p>;
                  })()}
                </div>
              </div>
            )
          )}

          {/* --- ВИД: КАК ЧИТАТЬ --- */}
          {view === 'history' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SYSTEMS.map((s) => (
                <div key={s.id} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{s.icon}</span>
                    <div>
                      <div className="text-sm font-bold text-gray-900">{s.name}</div>
                      <div className="text-[10px] text-gray-500">{s.era} · {s.typeName}</div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed mb-2">{s.howToRead}</p>
                  {decimal !== null && (
                    <div className="bg-gray-50 rounded-lg p-2 text-sm font-mono break-all border border-gray-100" style={{ fontFamily: s.type === 'positional' ? 'monospace' : 'serif' }}>
                      {convert(decimal, s.id)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ===== ПОСТОЯННЫЕ ПОЯСНЕНИЯ (никогда не пропадают) ===== */}
        <section className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-blue-900 text-sm">Пояснения</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-blue-900">
            <div className="bg-white/70 rounded-lg p-2.5">
              <b>Позиционные</b> — значение цифры зависит от её места: в числе 222 первая двойка = 200, вторая = 20, третья = 2. Сюда относятся двоичная, восьмеричная, десятичная, шестнадцатеричная, вавилонская и майя.
            </div>
            <div className="bg-white/70 rounded-lg p-2.5">
              <b>Непозиционные</b> — символ всегда означает одно и то же: римское X всегда = 10, египетская дуга всегда = 10. Число = сумма символов.
            </div>
            <div className="bg-white/70 rounded-lg p-2.5">
              <b>Смешанные (алфавитные)</b> — буквы играют роль цифр: греческая α = 1, славянская а = 1. Специальные знаки обозначают тысячи (͵ и ҂).
            </div>
          </div>
          <p className="text-xs text-blue-800">
            💡 <b>Интересный факт:</b> ноль независимо изобрели дважды — в Индии (V век) и у майя (III век). В римской и египетской системах нуля не было вовсе.
          </p>
        </section>
      </main>
    </div>
  );
}
