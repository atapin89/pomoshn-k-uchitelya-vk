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
  Download,
  RefreshCw,
  FileText,
  HelpCircle,
  Trophy,
  BookOpen,
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
type LevelId = 'easy' | 'medium' | 'hard';

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
  symbols: string;
  rules: string;
  full: string;
}

// ===== Системы =====

const SYSTEMS: NumeralSystem[] = [
  {
    id: 'decimal', name: 'Десятичная', shortName: 'DEC', base: 10, era: 'Индия, V в.', type: 'positional', typeName: 'Позиционная',
    howToRead: 'Каждая цифра умножается на степень десятки: 2024 = 2×1000 + 0×100 + 2×10 + 4.',
    example: '2024', allowedChars: '0-9', icon: '🔢',
    symbols: '0 1 2 3 4 5 6 7 8 9',
    rules: 'Значение цифры = цифра × 10 в степени позиции. Позиции считаются справа налево, начиная с нуля.',
    full: 'Самая распространённая система в мире. Основание 10 связано с числом пальцев на руках. Позиционный принцип с нулём разработан в Индии в V веке, через арабский мир попал в Европу благодаря Фибоначчи (книга «Liber Abaci», 1202 год).',
  },
  {
    id: 'binary', name: 'Двоичная', shortName: 'BIN', base: 2, era: 'Лейбниц, 1703', type: 'positional', typeName: 'Позиционная',
    howToRead: 'Только 0 и 1. Каждый разряд — степень двойки: 1010 = 8+2 = 10.',
    example: '11111101000', allowedChars: '0, 1', icon: '💻',
    symbols: '0 1',
    rules: 'Значение бита = бит × 2 в степени позиции. 4 бита = полубайт, 8 бит = байт = 2 шестнадцатеричных знака.',
    full: 'Язык всех современных компьютеров: два состояния (есть сигнал / нет сигнала). Описана Лейбницем в 1703 году, практическое применение нашла в электронных машинах XX века.',
  },
  {
    id: 'octal', name: 'Восьмеричная', shortName: 'OCT', base: 8, era: 'Современность', type: 'positional', typeName: 'Позиционная',
    howToRead: 'Цифры 0-7, разряды — степени восьмёрки.',
    example: '3750', allowedChars: '0-7', icon: '8️⃣',
    symbols: '0 1 2 3 4 5 6 7',
    rules: 'Значение цифры = цифра × 8 в степени позиции. Применяется в правах доступа Unix: 755, 644.',
    full: 'Удобна тем, что одна восьмеричная цифра = ровно 3 двоичных бита. Раньше широко использовалась в программировании, сейчас вытеснена шестнадцатеричной, но жива в Unix-правах файлов.',
  },
  {
    id: 'hex', name: 'Шестнадцатеричная', shortName: 'HEX', base: 16, era: 'Современность', type: 'positional', typeName: 'Позиционная',
    howToRead: 'Цифры 0-9 и буквы A-F. Один байт = два символа: FF = 255.',
    example: '7E8', allowedChars: '0-9, A-F', icon: '🎨',
    symbols: '0 1 2 3 4 5 6 7 8 9 A B C D E F',
    rules: 'Значение знака = знак × 16 в степени позиции. Цвета в вебе: #RRGGBB, где каждая пара — байт.',
    full: 'Стандарт представления памяти и цветов: 1 байт = 2 hex-символа. Позволяет компактно и читаемо записывать двоичные данные.',
  },
  {
    id: 'base36', name: '36-ричная', shortName: 'B36', base: 36, era: 'Современность', type: 'positional', typeName: 'Позиционная',
    howToRead: 'Все цифры и латинские буквы. Самая компактная буквенно-цифровая запись.',
    example: '1K8', allowedChars: '0-9, A-Z', icon: '🔤',
    symbols: '0-9 A B C D … X Y Z',
    rules: 'Значение знака = знак × 36 в степени позиции. Применяется для коротких идентификаторов и ссылок.',
    full: 'Максимальное основание, использующее привычные символы клавиатуры. Удобно для компактных ID: число 46655 записывается как ZZ.',
  },
  {
    id: 'roman', name: 'Римская', shortName: 'ROM', base: null, era: 'Древний Рим', type: 'non-positional', typeName: 'Непозиционная',
    howToRead: 'Символы складываются: MMXXIV = 1000+1000+10+10+1+5. Меньший слева — вычитается: IV = 4.',
    example: 'MMXXIV', allowedChars: 'I V X L C D M', icon: '🏛️',
    symbols: 'I=1 V=5 X=10 L=50 C=100 D=500 M=1000',
    rules: 'Символы пишутся слева направо по убыванию и складываются. Если меньший стоит перед большим — вычитается: IV=4, IX=9, XC=90, CM=900. Нуля нет.',
    full: 'Система Древнего Рима, использовавшаяся в Европе до внедрения арабских цифр. Сегодня: века, номера монархов и глав, циферблаты часов, олимпиады.',
  },
  {
    id: 'greek', name: 'Греческая', shortName: 'GR', base: null, era: 'V в. до н.э.', type: 'mixed', typeName: 'Смешанная',
    howToRead: 'Буквы алфавита = числа: α=1, ι=10, ρ=100. Штрих слева (͵) означает тысячи.',
    example: '͵βσδ´', allowedChars: 'α-ω, ϛ, ϟ, ϡ', icon: '🏺',
    symbols: 'α=1…θ=9, ι=10…ϟ=90, ρ=100…ϡ=900 (+ϛ, ϟ, ϡ)',
    rules: 'Цифры пишутся от старших к младшим, в конце знак керая (´). Тысячи обозначаются буквой единиц со штрихом внизу слева: ͵α = 1000.',
    full: 'Ионическая (алфавитная) система древних греков. Чтобы получить 27 знаков (9 единиц + 9 десятков + 9 сотен), добавили три архаические буквы: стигма (ϛ=6), коппа (ϟ=90), сампи (ϡ=900).',
  },
  {
    id: 'slavic', name: 'Славянская', shortName: 'СЛ', base: null, era: 'IX-XVII вв.', type: 'mixed', typeName: 'Смешанная',
    howToRead: 'Буквы кириллицы = числа: а=1, і=10, р=100. Титло (҃) сверху, знак ҂ = тысячи.',
    example: '҂всд҃', allowedChars: 'а-ѡ, ҃, ҂', icon: '📜',
    symbols: 'а=1…ѳ=9, і=10…ч=90, р=100…ц=900',
    rules: 'Титло (҃) над буквами показывает, что это число, а не слово. Тысячный знак (҂) ставится перед буквой: ҂а = 1000, ҂в = 2000.',
    full: 'Кириллическая нумерация, использовавшаяся на Руси до реформ Петра I (начало XVIII века). Ею датированы летописи, иконы и старопечатные книги.',
  },
  {
    id: 'egyptian', name: 'Египетская', shortName: 'EG', base: null, era: '3000 до н.э.', type: 'non-positional', typeName: 'Непозиционная',
    howToRead: 'Иероглифы повторяются: палочка=1, дуга=10, спираль=100, лотос=1000.',
    example: '𓆼𓆼𓍢𓏺𓏺', allowedChars: 'иероглифы', icon: '🔺',
    symbols: '𓏺=1 𓎆=10 𓍢=100 𓆼=1000 𓂭=10000 𓆨=100000 𓁨=1000000',
    rules: 'Каждый иероглиф повторяется до 9 раз, порядок произвольный (обычно от старших к младшим). Нуля и позиций нет.',
    full: 'Одна из древнейших письменных систем счёта. Использовалась в хозяйственных записях, на памятниках и в гробницах более трёх тысяч лет.',
  },
  {
    id: 'babylonian', name: 'Вавилонская', shortName: 'BAB', base: 60, era: 'II тыс. до н.э.', type: 'positional', typeName: 'Позиционная',
    howToRead: 'Разряды по 60. Клинья: вертикальный=1, угол=10.',
    example: '𒐊𒏹𒏹', allowedChars: ', ', icon: '',
    symbols: '=1 (до 9), 𒐊=10 (до 5), цифра = десятки+единицы',
    rules: 'Шестидесятеричная позиционная система. Цифры 1-59 составляются из клиньев. Явного нуля сначала не было — разряд угадывали по контексту.',
    full: 'Наследие Шумера и Вавилона. Отсюда 60 минут в часе, 60 секунд в минуте, 360 градусов в круге и деление на дюжины.',
  },
  {
    id: 'mayan', name: 'Майя', shortName: 'MAY', base: 20, era: 'III в. н.э.', type: 'positional', typeName: 'Позиционная',
    howToRead: 'Разряды по 20, запись снизу вверх. Точка=1, черта=5, ракушка=0.',
    example: '●▬▬ ⋮ ●●●●', allowedChars: '●, ▬, 𝋠', icon: '🗿',
    symbols: '●=1, ▬=5, 𝋠=0 (ракушка)',
    rules: 'Двадцатеричная позиционная система, запись столбиком снизу вверх. Третий разряд = ×360 (а не ×400) — из-за календарного счёта.',
    full: 'Цивилизация майя независимо изобрела ноль (III век н.э.) и использовала двадцатеричную систему для астрономии и календаря длинного счёта.',
  },
];

const QUICK_EXAMPLES = [2024, 255, 365, 1000, 42, 7];

const LEVELS: { id: LevelId; label: string; min: number; max: number }[] = [
  { id: 'easy', label: 'Лёгкий (1-50)', min: 1, max: 50 },
  { id: 'medium', label: 'Средний (1-255)', min: 1, max: 255 },
  { id: 'hard', label: 'Сложный (1-1024)', min: 1, max: 1024 },
];

const FAQ_ITEMS = [
  { q: 'Чем позиционные системы отличаются от непозиционных?', a: 'В позиционных значение цифры зависит от её места: в числе 222 первая двойка = 200, вторая = 20, третья = 2. В непозиционных символ всегда означает одно и то же: римское X всегда = 10, египетская дуга всегда = 10. Позиционные системы позволяют легко выполнять арифметику и записывать сколь угодно большие числа.' },
  { q: 'Зачем программистам двоичная и шестнадцатеричная системы?', a: 'Компьютер хранит всё в битах (0 и 1). Двоичная запись точна, но длинна, поэтому её группируют: 1 байт = 2 шестнадцатеричных знака (FF = 255) или 3-4 восьмеричных. Цвета в вебе (#FF5733), адреса памяти, права файлов в Unix — всё это шестнадцатеричная и восьмеричная системы.' },
  { q: 'Как быстро перевести двоичное число в десятичное?', a: 'Подпишите разряды справа налево степенями двойки (1, 2, 4, 8, 16, 32…) и сложите те, где стоит единица. Пример: 10110 = 16 + 4 + 2 = 22. Обратный перевод: последовательно вычитайте наибольшие степени двойки.' },
  { q: 'Почему в часе 60 минут и 360 градусов?', a: 'Это наследие вавилонской шестидесятеричной системы. Число 60 удобно: делится на 1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60 без остатка. Вавилонские астрономы разделили круг на 360 частей — так дошло до нас.' },
  { q: 'Кто и когда изобрёл ноль?', a: 'Как полноценное число ноль оформили в Индии в V веке н.э. (Брахмагупта описал правила действий с ним). Независимо ноль изобрели майя в III веке н.э. В римской, греческой и египетской системах нуля не было — это сильно затрудняло вычисления.' },
  { q: 'Можно ли ввести число в исторической системе (греческой, славянской)?', a: 'Нет, ввод поддерживается для позиционных систем и римской — их легко распознать по символам. Исторические системы показаны как результат перевода: переключитесь на вид «Карточки» или «Как читать», чтобы увидеть число в греческой, славянской, египетской, вавилонской записи и майя.' },
  { q: 'Как проверить, что перевод выполнен верно?', a: 'Сделайте обратный перевод: результат переведите обратно в исходную систему — должно получиться исходное число. Или разложите число по разрядам (вид «Разложение») и проверьте сумму слагаемых.' },
  { q: 'Где сегодня встречается славянская нумерация?', a: 'В старопечатных и богослужебных книгах, на иконах (датировки), в летописях и памятниках архитектуры. Нумерация глав в некоторых изданиях Библии до сих пор использует кириллические числа с титлом.' },
];

const SCENARIO_ITEMS = [
  { icon: '🎯', title: 'Разминка на уроке математики', description: 'Введите число и покажите классу вид «Карточки»: ученики угадывают, какая запись соответствует какому значению, и объясняют, как получили ответ.' },
  { icon: '💻', title: 'Отработка переводов на информатике', description: 'Генератор заданий: выберите «из двоичной в десятичную», 10 заданий, средний уровень. Распечатайте вариант с ответами для самопроверки.' },
  { icon: '🏛️', title: 'Урок истории древнего мира', description: 'Скачайте информационную карточку числа и распечатайте как плакат: ученики сравнят, как одно и то же число записывали в Риме, Египте, Вавилоне и на Руси.' },
  { icon: '🏆', title: 'Подготовка к олимпиаде', description: 'Сложный уровень генератора (1-1024) с переводами между двоичной, восьмеричной и шестнадцатеричной — типичные олимпиадные задачи на системы счисления.' },
  { icon: '📜', title: 'Исследовательский проект', description: 'Вид «Разложение» показывает число как сумму разрядов и символов: идеальный материал для ученических докладов о математике древних цивилизаций.' },
];

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
  while (r > 0) { out = digits[r % base] + out; r = Math.floor(r / base); }
  return out;
}

function toRoman(n: number): string {
  if (n <= 0 || n >= 4000) return '—';
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let out = '';
  for (let i = 0; i < vals.length; i++) { while (n >= vals[i]) { out += syms[i]; n -= vals[i]; } }
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
  return digits.map((d) => '𒐊'.repeat(Math.floor(d / 10)) + '𒏹'.repeat(d % 10)).join(' ');
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

// ===== Разложение =====

function positionalParts(n: number, base: number) {
  const parts: { digit: number; power: number; value: number }[] = [];
  let r = n; let p = 0;
  if (r === 0) parts.push({ digit: 0, power: 0, value: 0 });
  while (r > 0) {
    const d = r % base;
    parts.unshift({ digit: d, power: p, value: d * Math.pow(base, p) });
    r = Math.floor(r / base); p++;
  }
  return parts;
}

function romanParts(n: number) {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  const out: { sym: string; val: number }[] = [];
  let r = n;
  for (let i = 0; i < vals.length; i++) { while (r >= vals[i]) { out.push({ sym: syms[i], val: vals[i] }); r -= vals[i]; } }
  return out;
}

function alphaParts(n: number, units: Record<number, string>, tens: Record<number, string>, hundreds: Record<number, string>, mark: string) {
  const out: { sym: string; val: number }[] = [];
  const th = Math.floor(n / 1000);
  if (th) out.push({ sym: `${mark}${units[th]}`, val: th * 1000 });
  const r = n % 1000;
  const h = Math.floor(r / 100) * 100; if (h) out.push({ sym: hundreds[h], val: h });
  const t = Math.floor((r % 100) / 10) * 10; if (t) out.push({ sym: tens[t], val: t });
  const u = r % 10; if (u) out.push({ sym: units[u], val: u });
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

export default function NumberSystemsScreen({ onBack }: { onBack: () => void }) {
  const [inputValue, setInputValue] = useState('2024');
  const [inputSystem, setInputSystem] = useState<SystemId>('decimal');
  const [view, setView] = useState<ViewId>('cards');
  const [breakdownSystem, setBreakdownSystem] = useState<SystemId>('decimal');
  const [copied, setCopied] = useState<string | null>(null);

  // Генератор заданий
  const [genFrom, setGenFrom] = useState<SystemId>('decimal');
  const [genTo, setGenTo] = useState<SystemId>('binary');
  const [genLevel, setGenLevel] = useState<LevelId>('easy');
  const [genCount, setGenCount] = useState(10);
  const [genAnswers, setGenAnswers] = useState(true);
  const [tasks, setTasks] = useState<{ n: number; fromStr: string; toStr: string }[] | null>(null);

  const decimal = useMemo(() => parseNumber(inputValue, inputSystem), [inputValue, inputSystem]);
  const activeInput = SYSTEMS.find((s) => s.id === inputSystem)!;

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

  // ===== Скачивание информационной карточки (PNG) =====
  const downloadInfoCard = () => {
    if (decimal === null) return;
    const W = 1200;
    const rowH = 132;
    const headerH = 200;
    const footerH = 70;
    const H = headerH + SYSTEMS.length * rowH + footerH;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, '#7c3aed');
    g.addColorStop(1, '#db2777');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, headerH);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 58px Arial';
    ctx.fillText(`Число ${decimal.toLocaleString('ru-RU')}`, W / 2, 85);
    ctx.font = '30px Arial';
    ctx.fillText('в разных системах счисления', W / 2, 132);
    ctx.font = '20px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('Помощник учителя · карточка-справка', W / 2, 172);

    let y = headerH;
    SYSTEMS.forEach((s, i) => {
      if (i % 2 === 0) {
        ctx.fillStyle = '#faf5ff';
        ctx.fillRect(0, y, W, rowH);
      }
      ctx.textAlign = 'left';
      ctx.fillStyle = '#6b21a8';
      ctx.font = 'bold 30px Arial';
      ctx.fillText(s.name, 50, y + 44);
      ctx.fillStyle = '#6b7280';
      ctx.font = '19px Arial';
      ctx.fillText(`${s.typeName}${s.base ? ' · основание ' + s.base : ''} · ${s.era}`, 50, y + 72);
      ctx.fillStyle = '#111827';
      ctx.font = `bold 36px ${s.type === 'positional' ? '"Courier New", monospace' : 'Georgia, serif'}`;
      const val = convert(decimal, s.id);
      ctx.fillText(val.length > 26 ? val.slice(0, 26) + '…' : val, 50, y + 112);
      ctx.fillStyle = '#4b5563';
      ctx.font = '18px Arial';
      wrapCanvasText(ctx, s.howToRead, 470).slice(0, 3).forEach((line, li) => {
        ctx.fillText(line, 680, y + 42 + li * 26);
      });
      y += rowH;
    });

    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, H - footerH, W, footerH);
    ctx.fillStyle = '#6b7280';
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Создано в мини-приложении «Помощник учителя» · vk.ru/topteach', W / 2, H - 28);

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `chislo-${decimal}-sistemy-schisleniya.png`;
    a.click();
    triggerHaptic('heavy');
  };

  // ===== Генератор заданий =====
  const generateTasks = () => {
    const level = LEVELS.find((l) => l.id === genLevel)!;
    const nums = new Set<number>();
    let guard = 0;
    while (nums.size < genCount && guard < 500) {
      nums.add(level.min + Math.floor(Math.random() * (level.max - level.min + 1)));
      guard++;
    }
    const list = [...nums].sort((a, b) => a - b).map((n) => ({
      n,
      fromStr: convert(n, genFrom),
      toStr: convert(n, genTo),
    }));
    setTasks(list);
    triggerHaptic('medium');
  };

  const downloadTasks = () => {
    if (!tasks || !tasks.length) return;
    const from = SYSTEMS.find((s) => s.id === genFrom)!;
    const to = SYSTEMS.find((s) => s.id === genTo)!;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Задания: системы счисления</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 30px; color: #1f2937; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        .meta { font-size: 13px; color: #6b7280; margin-bottom: 16px; }
        .head { font-size: 15px; margin-bottom: 14px; }
        ol { padding-left: 22px; }
        li { margin-bottom: 10px; font-size: 15px; }
        .num { font-family: "Courier New", monospace; font-weight: bold; font-size: 16px; }
        .blank { display: inline-block; min-width: 120px; border-bottom: 1px solid #9ca3af; }
        .answers { page-break-before: always; }
        .answers h2 { font-size: 18px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; font-size: 14px; }
        @media print { .no-print { display: none; } }
      </style></head><body>
      <div class="no-print" style="text-align:center;margin-bottom:18px;">
        <button onclick="window.print()" style="padding:10px 24px;font-size:16px;cursor:pointer;">🖨️ Печать / сохранить в PDF</button>
      </div>
      <h1>Рабочий лист · Системы счисления</h1>
      <div class="meta">Перевод: ${from.name} → ${to.name} · Заданий: ${tasks.length} · Дата: ${new Date().toLocaleDateString('ru-RU')}</div>
      <div class="head">Имя: <span class="blank"></span> &nbsp;&nbsp; Класс: <span class="blank" style="min-width:60px;"></span></div>
      <p style="font-size:14px;">Переведите числа из системы «${from.name}» в систему «${to.name}»:</p>
      <ol>
        ${tasks.map((t) => `<li><span class="num">${t.fromStr}</span> (${from.shortName}) → ${to.name}: <span class="blank"></span></li>`).join('')}
      </ol>
      ${genAnswers ? `
      <div class="answers">
        <h2>Ответы</h2>
        <div class="grid">
          ${tasks.map((t, i) => `<div>${i + 1}. ${t.n} → <b>${t.toStr}</b></div>`).join('')}
        </div>
      </div>` : ''}
      </body></html>`);
    w.document.close();
    triggerHaptic('heavy');
  };

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
                {SYSTEMS.filter((s) => ['decimal', 'binary', 'octal', 'hex', 'base36', 'roman'].includes(s.id)).map((s) => (
                  <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 🆕 Число по центру */}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Например: ${activeInput.example}`}
            className="w-full rounded-xl border-2 border-purple-200 p-3 text-2xl font-mono text-center text-gray-900 focus:outline-none focus:border-purple-500 tracking-wide"
            autoComplete="off"
            spellCheck={false}
          />

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
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
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 text-center">
              ⚠️ Введите корректное число. Допустимые символы для {activeInput.name}: <b>{activeInput.allowedChars}</b>
            </div>
          ) : (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-sm text-purple-800">
                В десятичной: <b className="text-lg font-mono">{decimal.toLocaleString('ru-RU')}</b>
              </span>
              {/* 🆕 Скачивание информационной карточки */}
              <button
                onClick={downloadInfoCard}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Скачать карточку
              </button>
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
                          <button onClick={() => handleCopy(value, s.id)} className="p-1.5 rounded-lg hover:bg-white transition-colors" aria-label="Копировать">
                            {copied === s.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                          </button>
                          <button onClick={() => useAsInput(s.id)} disabled={isInput || value === '—'} className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 transition-colors" aria-label="Ввести в этой системе" title="Ввести в этой системе">
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
                        <td className="border border-gray-100 px-2 py-2 font-semibold whitespace-nowrap">{s.icon} {s.name}</td>
                        <td className="border border-gray-100 px-2 py-2 font-mono break-all" style={{ fontFamily: s.type === 'positional' ? 'monospace' : 'serif' }}>{convert(decimal, s.id)}</td>
                        <td className="border border-gray-100 px-2 py-2 text-center text-xs whitespace-nowrap">{s.typeName}</td>
                        <td className="border border-gray-100 px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{s.era}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

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
                          <p className="text-sm text-gray-600">Число <b className="font-mono">{convert(decimal, sys.id)}</b> в системе с основанием <b>{sys.base}</b>:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {parts.map((p, i) => (
                              <span key={i} className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm font-mono">
                                <b className="text-purple-700">{digitChar(p.digit)}</b>×{sys.base}<sup>{p.power}</sup>
                                <span className="text-gray-400"> = {p.value}</span>
                              </span>
                            ))}
                          </div>
                          <p className="text-sm text-gray-700 pt-1">Сумма: {parts.map((p) => p.value).join(' + ')} = <b className="text-purple-700">{decimal}</b></p>
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
                              <span key={i} className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm font-mono"><b className="text-amber-700">{p.sym}</b> = {p.val}</span>
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
                              <span key={i} className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm" style={{ fontFamily: 'serif' }}><b className="text-red-700">{p.sym}</b> = {p.val}</span>
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
                              <span key={i} className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm"><b className="text-yellow-700">{p.glyph}</b>×{p.count} = {p.val}</span>
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

        {/* ===== 🆕 ГЕНЕРАТОР ЗАДАНИЙ ===== */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-purple-700 text-base">Генератор заданий</h3>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-gray-600">
              <span className="block mb-1 font-semibold">Перевести из:</span>
              <select value={genFrom} onChange={(e) => setGenFrom(e.target.value as SystemId)} className="w-full rounded-lg border border-gray-200 p-2 text-sm bg-white">
                {SYSTEMS.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
              </select>
            </label>
            <label className="block text-xs text-gray-600">
              <span className="block mb-1 font-semibold">Перевести в:</span>
              <select value={genTo} onChange={(e) => setGenTo(e.target.value as SystemId)} className="w-full rounded-lg border border-gray-200 p-2 text-sm bg-white">
                {SYSTEMS.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                onClick={() => setGenLevel(l.id)}
                className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                  genLevel === l.id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-purple-50'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Количество заданий</span>
              <span className="font-mono font-bold text-purple-700">{genCount}</span>
            </div>
            <input type="range" min={5} max={30} value={genCount} onChange={(e) => setGenCount(Number(e.target.value))} className="w-full accent-purple-600" />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={genAnswers} onChange={(e) => setGenAnswers(e.target.checked)} className="w-4 h-4 accent-purple-600" />
            Добавить страницу с ответами
          </label>

          <div className="flex gap-2">
            <button
              onClick={generateTasks}
              className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Сгенерировать
            </button>
            <button
              onClick={downloadTasks}
              disabled={!tasks || !tasks.length}
              className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" /> Скачать вариант
            </button>
          </div>

          {tasks && tasks.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-3 max-h-64 overflow-y-auto">
              <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-800">
                {tasks.map((t, i) => (
                  <li key={i}>
                    <span className="font-mono font-bold">{t.fromStr}</span>
                    <span className="text-gray-500"> ({SYSTEMS.find((s) => s.id === genFrom)?.shortName}) → </span>
                    {SYSTEMS.find((s) => s.id === genTo)?.name}
                    {genAnswers && <span className="text-green-700 font-semibold"> = {t.toStr}</span>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>

        {/* ===== ПОСТОЯННЫЕ ПОЯСНЕНИЯ ===== */}
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

        {/* ===== 🆕 ЧАСТЫЕ ВОПРОСЫ ===== */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <details>
            <summary className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-700 text-sm">Частые вопросы</h3>
              <span className="text-xs font-bold text-purple-400">{FAQ_ITEMS.length}</span>
            </summary>
            <div className="px-4 pb-4 space-y-2">
              {FAQ_ITEMS.map((item, idx) => (
                <details key={idx} className="border border-purple-100 rounded-xl overflow-hidden">
                  <summary className="px-4 py-2.5 cursor-pointer hover:bg-purple-50 transition-colors font-semibold text-sm text-gray-800">{item.q}</summary>
                  <div className="px-4 pb-3 pt-1 text-sm text-gray-600 bg-purple-50/50 border-t border-purple-100">{item.a}</div>
                </details>
              ))}
            </div>
          </details>
        </section>

        {/* ===== 🆕 СЦЕНАРИИ ИСПОЛЬЗОВАНИЯ ===== */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <details>
            <summary className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-2">
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

        {/* ===== 🆕 ПОДРОБНЫЙ СПРАВОЧНИК ПО СИСТЕМАМ ===== */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <details>
            <summary className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-green-600" />
              <h3 className="font-bold text-purple-700 text-sm">Подробный справочник по системам</h3>
              <span className="text-xs font-bold text-purple-400">{SYSTEMS.length}</span>
            </summary>
            <div className="px-4 pb-4 space-y-2">
              {SYSTEMS.map((s) => (
                <details key={s.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <summary className="px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-2">
                    <span className="text-xl">{s.icon}</span>
                    <span className="font-semibold text-sm text-gray-800">{s.name}</span>
                    <span className="text-[10px] text-gray-400 ml-auto">{s.era}</span>
                  </summary>
                  <div className="px-4 pb-3 pt-1 text-sm text-gray-600 bg-gray-50 border-t border-gray-200 space-y-2">
                    <p>{s.full}</p>
                    <div className="bg-white border border-gray-200 rounded-lg p-2 text-xs">
                      <b>Символы:</b> <span className="font-mono" style={{ fontFamily: s.type === 'positional' ? 'monospace' : 'serif' }}>{s.symbols}</span>
                    </div>
                    <p className="text-xs"><b>Правило записи:</b> {s.rules}</p>
                    <p className="text-xs"><b>Пример:</b> <span className="font-mono" style={{ fontFamily: s.type === 'positional' ? 'monospace' : 'serif' }}>{s.example}</span></p>
                  </div>
                </details>
              ))}
            </div>
          </details>
        </section>
      </main>
    </div>
  );
}
