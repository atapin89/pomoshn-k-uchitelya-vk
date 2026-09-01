import { useRef, useState } from 'react';
import {
  Box,
  Download,
  Type,
  Sparkles,
  Lightbulb,
  HelpCircle,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import BackButton from './BackButton';
import { triggerHaptic } from '@/lib/haptic';

type DiceMode = 'text' | 'images';

interface DiceSettings {
  mode: DiceMode;
  textFaces: string[];
  category: string;
  iconFaces: string[];
  fontFamily: string;
  fontSize: number;
  showDots: boolean;
}

const SETTINGS_KEY = 'dice-maker-settings';

const CATEGORIES: { id: string; label: string; items: string[] }[] = [
  { id: 'animals', label: 'Животные', items: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆'] },
  { id: 'food', label: 'Еда', items: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑', '🍍', '🥝', '🥑', '🥕', '🌽', '🥦', '🥔', '🍕', '🍩', '🍰'] },
  { id: 'clothes', label: 'Одежда', items: ['👕', '👖', '👗', '👔', '👒', '👑', '🎩', '🧤', '🧣', '👠', '👢', '👟', '🥾', '👡', '👜', '🎒', '👓', '🕶', '👡', '💍'] },
  { id: 'transport', label: 'Транспорт', items: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🛵', '🏍', '🚲', '🛴', '🛶', '🛸', '🚤'] },
  { id: 'weather', label: 'Погода', items: ['☀', '🌤', '⛅', '🌥', '☁', '🌦', '🌧', '⛈', '🌩', '🌨', '❄', '💨', '🌫', '🌪', '🌈', '🌙', '⭐', '⚡', '💧', '🔥'] },
  { id: 'jobs', label: 'Люди и роли', items: ['👮', '👷', '💂', '🕵', '👩‍⚕', '👨‍🚒', '👩‍🏫', '👨‍🍳', '🤴', '👸', '🧙', '🧜', '🧝', '🧞', '🧟', '👶', '🧒', '👦', '👧', '🧑'] },
  { id: 'emotions', label: 'Эмоции', items: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😜', '🤪', '😎'] },
  { id: 'colors', label: 'Цвета', items: ['🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '🟫', '⬛', '⬜', '🟣', '🟡', '🟢', '🔵', '🔴', '🟠', '🟤', '💜', '💙', '💚', '💛'] },
  { id: 'nature', label: 'Природа', items: ['🌳', '🌲', '🌴', '🌵', '🌾', '🌿', '☘', '🍀', '🍁', '🍂', '🍃', '🌺', '🌻', '🌹', '🌷', '🌸', '💐', '🍄', '🌊', '⛰'] },
  { id: 'sports', label: 'Спорт', items: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥊', '🥋', '🥅', '⛳', '🏌', '🏄', '🏊', '🚴', '🤸', '⛷'] },
  { id: 'music', label: 'Музыка', items: ['🎵', '🎶', '🎼', '🎧', '🎤', '🎸', '🎹', '🥁', '🎷', '🎺', '🎻', '🪕', '📻', '🎭', '🎪', '🔔', '🎟', '🎫', '🎬', '🎨'] },
  { id: 'school', label: 'Школа', items: ['📚', '📖', '✏', '🖊', '🖍', '📏', '📐', '✂', '🧪', '🔬', '🔭', '💻', '🖥', '📝', '📌', '📎', '🗂', '🎒', '🌍', '🗺'] },
];

const FONTS = [
  { id: 'Verdana, sans-serif', label: 'Verdana (рекомендуется)' },
  { id: '"Comic Sans MS", cursive', label: 'Comic Sans (рекомендуется)' },
  { id: 'Arial, sans-serif', label: 'Arial' },
  { id: 'Georgia, serif', label: 'Georgia' },
  { id: '"Courier New", monospace', label: 'Courier' },
];

const DEFAULT_SETTINGS: DiceSettings = {
  mode: 'text',
  textFaces: ['Кто?', 'Что?', 'Где?', 'Когда?', 'Почему?', 'Как?'],
  category: 'animals',
  iconFaces: CATEGORIES[0].items.slice(0, 6),
  fontFamily: 'Verdana, sans-serif',
  fontSize: 20,
  showDots: true,
};

const PIPS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.25], [0.25, 0.5], [0.25, 0.75], [0.75, 0.25], [0.75, 0.5], [0.75, 0.75]],
};

const FAQ_ITEMS = [
  {
    q: 'Как собрать кубик после печати?',
    a: '1. Вырежьте шаблон по внешнему контуру.\n2. Согните по пунктирным линиям (линейка + тупой предмет для чётких сгибов).\n3. Нанесите клей на серые клапаны и приклейте их внутри граней.\n4. Дайте высохнуть 10–15 минут.',
  },
  {
    q: 'На какой бумаге печатать?',
    a: 'Оптимально: плотная 160–200 г/м². На офисной 80 г/м² кубик хлипкий. Для долговечности заламинируйте лист перед вырезанием.',
  },
  {
    q: 'Текст не помещается на грани — что делать?',
    a: 'Уменьшите размер шрифта (12–16 для длинных фраз) или сократите текст: «Когда произошло событие?» → «Когда?». Verdana и Comic Sans читаются лучше при мелких размерах.',
  },
  {
    q: 'Что такое «Точки на фоне»?',
    a: 'Классический точечный рисунок игральных костей (1–6). Включайте, если кубик нужен в настольной игре со значениями очков. Точки рисуются полупрозрачно за текстом.',
  },
  {
    q: 'Как печатать на Letter (США)?',
    a: 'В настройках печати выберите масштаб 90% и минимальные поля, либо «Подогнать по размеру страницы».',
  },
  {
    q: 'Можно ли несколько кубиков на одном листе?',
    a: 'По умолчанию — один кубик на A4. Уменьшите масштаб печати до 70% — поместятся два кубика рядом.',
  },
];

const SCENARIO_ITEMS = [
  { icon: '📖', title: 'Изучение языков', description: 'Кубик с вопросами (Кто? Что? Где?) + кубик с иконками. Ученик бросает оба и строит фразу: «Кто? — 🐶, Где? — 🏫» → «The dog is at school».' },
  { icon: '🎭', title: 'Развитие речи', description: 'Два кубика с иконками: ученик составляет историю, связывающую выпавшие объекты. 🚗 + 🌧️ → «Однажды в дождливый день машина отправилась в путь…»' },
  { icon: '✍️', title: 'Буквосочетания', description: 'Кубик с сочетаниями (ЧА, ЩА, ЖИ, ШИ, ЧУ, ЩУ). За 2 минуты записать как можно больше слов с выпавшей комбинацией.' },
  { icon: '🧮', title: 'Математика', description: 'Кубик с цифрами 1–6 + кубик с действиями (+, −, ×, ÷). Бросок: 4 × 3 = 12. Для старших — двузначные числа.' },
  { icon: '🎨', title: 'Творческое письмо', description: 'Кубики эмоций, мест и персонажей. 😢 + 🏔️ + 👩🚒 → «Пожарная плакала на вершине горы, потому что…»' },
  { icon: '🌍', title: 'География и история', description: 'Кубик с вопросами + кубик иконок стран и эпох. «Когда?» + 🏛️ → событие из истории Древней Греции.' },
];

function loadSettings(): DiceSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && Array.isArray(p.textFaces) && p.textFaces.length === 6) {
        if (p.mode === 'both') p.mode = 'text';
        if (!Array.isArray(p.iconFaces)) {
          const cat = CATEGORIES.find((c) => c.id === p.category) || CATEGORIES[0];
          p.iconFaces = cat.items.slice(0, 6);
        }
        return { ...DEFAULT_SETTINGS, ...p };
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(s: DiceSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (t.length <= maxChars) cur = t;
    else {
      if (cur) lines.push(cur);
      cur = w.length > maxChars ? w.slice(0, maxChars) : w;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

function tabPath(x: number, y: number, S: number, side: 'top' | 'bottom' | 'left' | 'right'): string {
  const T = 14, t = 5, m = 3;
  switch (side) {
    case 'top':
      return `M ${x + m} ${y} L ${x + S - m} ${y} L ${x + S - m - t} ${y - T} L ${x + m + t} ${y - T} Z`;
    case 'bottom':
      return `M ${x + m} ${y + S} L ${x + S - m} ${y + S} L ${x + S - m - t} ${y + S + T} L ${x + m + t} ${y + S + T} Z`;
    case 'left':
      return `M ${x} ${y + m} L ${x} ${y + S - m} L ${x - T} ${y + S - m - t} L ${x - T} ${y + m + t} Z`;
    case 'right':
      return `M ${x + S} ${y + m} L ${x + S} ${y + S - m} L ${x + S + T} ${y + S - m - t} L ${x + S + T} ${y + m + t} Z`;
  }
}

interface NetProps {
  x0: number;
  y0: number;
  S: number;
  values: string[];
  type: 'text' | 'image';
  settings: DiceSettings;
}

function Net({ x0, y0, S, values, type, settings }: NetProps) {
  const faces = [
    { x: x0 + S, y: y0 + S, v: 1, val: values[0] },
    { x: x0 + 2 * S, y: y0 + S, v: 2, val: values[1] },
    { x: x0 + 3 * S, y: y0 + S, v: 3, val: values[2] },
    { x: x0, y: y0 + S, v: 4, val: values[3] },
    { x: x0 + S, y: y0, v: 5, val: values[4] },
    { x: x0 + S, y: y0 + 2 * S, v: 6, val: values[5] },
  ];

  const tabs = [
    tabPath(x0 + S, y0, S, 'top'),
    tabPath(x0 + S, y0, S, 'left'),
    tabPath(x0 + S, y0, S, 'right'),
    tabPath(x0 + S, y0 + 2 * S, S, 'bottom'),
    tabPath(x0 + S, y0 + 2 * S, S, 'left'),
    tabPath(x0 + S, y0 + 2 * S, S, 'right'),
    tabPath(x0 + 3 * S, y0 + S, S, 'right'),
  ];

  const maxChars = Math.max(6, Math.floor(S / (settings.fontSize * 0.62)));

  return (
    <g>
      {tabs.map((d, i) => (
        <path key={i} d={d} fill="#f3f4f6" stroke="#111827" strokeWidth={1.5} />
      ))}
      {faces.map((f, i) => (
        <rect key={i} x={f.x} y={f.y} width={S} height={S} fill="#ffffff" stroke="#111827" strokeWidth={2} />
      ))}
      <g stroke="#6b7280" strokeWidth={1.5} strokeDasharray="6 4">
        <line x1={x0 + S} y1={y0 + S} x2={x0 + 2 * S} y2={y0 + S} />
        <line x1={x0 + S} y1={y0 + 2 * S} x2={x0 + 2 * S} y2={y0 + 2 * S} />
        <line x1={x0 + S} y1={y0 + S} x2={x0 + S} y2={y0 + 2 * S} />
        <line x1={x0 + 2 * S} y1={y0 + S} x2={x0 + 2 * S} y2={y0 + 2 * S} />
        <line x1={x0 + 3 * S} y1={y0 + S} x2={x0 + 3 * S} y2={y0 + 2 * S} />
      </g>
      {faces.map((f, i) => {
        if (type === 'image') {
          if (!f.val) return null;
          return (
            <text key={i} x={f.x + S / 2} y={f.y + S / 2} fontSize={S * 0.55} textAnchor="middle" dominantBaseline="central">
              {f.val}
            </text>
          );
        }
        const lines = wrapText(f.val || '', maxChars);
        const lh = settings.fontSize * 1.15;
        const startY = f.y + S / 2 - ((lines.length - 1) * lh) / 2;
        return (
          <g key={i}>
            {settings.showDots &&
              (PIPS[f.v] || []).map(([px, py], j) => (
                <circle key={j} cx={f.x + px * S} cy={f.y + py * S} r={S * 0.07} fill="#9ca3af" opacity={0.3} />
              ))}
            {lines.map((l, j) => (
              <text
                key={`t${j}`}
                x={f.x + S / 2}
                y={startY + j * lh}
                fontFamily={settings.fontFamily}
                fontSize={settings.fontSize}
                fontWeight={600}
                fill="#1f2937"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {l}
              </text>
            ))}
          </g>
        );
      })}
    </g>
  );
}

const Sheet = ({ settings, sheetRef }: { settings: DiceSettings; sheetRef: React.RefObject<SVGSVGElement> }) => {
  const W = 794, H = 1123;
  const S = 170;
  const netW = 4 * S + 28;
  const netH = 3 * S + 28;
  const x0 = (W - netW) / 2 + 14;

  const iconValues = [...settings.iconFaces];
  while (iconValues.length < 6) iconValues.push('');

  return (
    <svg
      ref={sheetRef}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block', background: '#ffffff' }}
    >
      <rect x={0} y={0} width={W} height={H} fill="#ffffff" />
      <text x={W / 2} y={40} textAnchor="middle" fontSize={16} fill="#6b7280" fontFamily="Verdana, sans-serif">
        Вырежи по контуру, согни по пунктиру, склей клапаны
      </text>
      <Net
        x0={x0}
        y0={(H - netH) / 2 + 14}
        S={S}
        values={settings.mode === 'text' ? settings.textFaces : iconValues}
        type={settings.mode === 'text' ? 'text' : 'image'}
        settings={settings}
      />
    </svg>
  );
};

export default function DiceMakerScreen({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState<DiceSettings>(() => loadSettings());
  const [openFaqItem, setOpenFaqItem] = useState<number | null>(null);
  const [showFaq, setShowFaq] = useState(false);
  const [showScen, setShowScen] = useState(false);
  const sheetRef = useRef<SVGSVGElement>(null);

  const update = (patch: Partial<DiceSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  };

  const updateFace = (i: number, value: string) => {
    const faces = [...settings.textFaces];
    faces[i] = value;
    update({ textFaces: faces });
  };

  const changeCategory = (id: string) => {
    const cat = CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];
    update({ category: id, iconFaces: cat.items.slice(0, 6) });
  };

  const toggleIcon = (icon: string) => {
    setSettings((prev) => {
      const faces = [...prev.iconFaces];
      const idx = faces.indexOf(icon);
      if (idx >= 0) {
        faces.splice(idx, 1);
        triggerHaptic('light');
      } else if (faces.length < 6) {
        faces.push(icon);
        triggerHaptic('light');
      } else {
        triggerHaptic('medium');
        return prev;
      }
      const next = { ...prev, iconFaces: faces };
      saveSettings(next);
      return next;
    });
  };

  const handleExportPDF = async () => {
    const svg = sheetRef.current;
    if (!svg) return;
    triggerHaptic('light');
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const data = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('svg load error'));
      img.src = url;
    });
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = 794 * scale;
    canvas.height = 1123 * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, 794, 1123);
    URL.revokeObjectURL(url);
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
    doc.save('кубики.pdf');
  };

  const withText = settings.mode === 'text';
  const withImages = settings.mode === 'images';
  const currentCat = CATEGORIES.find((c) => c.id === settings.category) || CATEGORIES[0];

  return (
    <div className="min-h-[100dvh] bg-purple-50 flex flex-col">
      <header className="bg-purple-700 shadow-md sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Конструктор кубиков</h1>
            <p className="text-xs text-purple-200">Печать игровых кубиков</p>
          </div>
          <Box className="w-6 h-6 text-white/70" />
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-5 py-5 space-y-4 pb-8">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <label className="text-sm font-semibold text-purple-700">Режим</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => update({ mode: 'text' })}
              className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-semibold text-sm transition-colors ${
                settings.mode === 'text' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700'
              }`}
            >
              <Type className="w-5 h-5" /> Текст
            </button>
            <button
              onClick={() => update({ mode: 'images' })}
              className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-semibold text-sm transition-colors ${
                settings.mode === 'images' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700'
              }`}
            >
              <Sparkles className="w-5 h-5" /> Иконки
            </button>
          </div>
          <p className="text-xs text-gray-500">
            {withText && 'Кубик с вашим текстом на 6 гранях: вопросы, термины, цифры.'}
            {withImages && 'Выберите категорию и отметьте тапом до 6 иконок для граней.'}
          </p>
        </div>

        {withImages && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-purple-700">Категория иконок</label>
              <span className="text-xs font-bold text-purple-600 bg-purple-50 rounded-lg px-2 py-1">
                на гранях: {settings.iconFaces.length} / 6
              </span>
            </div>
            <select
              value={settings.category}
              onChange={(e) => changeCategory(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>

            <div
              className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {currentCat.items.map((icon, i) => {
                const selIdx = settings.iconFaces.indexOf(icon);
                const selected = selIdx >= 0;
                return (
                  <button
                    key={`${settings.category}-${i}`}
                    onClick={() => toggleIcon(icon)}
                    className={`relative shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl border-2 transition-all active:scale-90 ${
                      selected
                        ? 'bg-purple-100 border-purple-500 shadow-sm'
                        : 'bg-gray-50 border-gray-200 hover:border-purple-300'
                    }`}
                    aria-label={selected ? `Убрать иконку ${icon}` : `Выбрать иконку ${icon}`}
                  >
                    {icon}
                    {selected && (
                      <span className="absolute -top-1.5 -right-1.5 bg-purple-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
                        {selIdx + 1}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-400 text-center">
              ← прокрутите ленту · тап — выбрать иконку на грань (номер в кружке), повторный тап — убрать →
            </p>
          </div>
        )}

        {withText && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <label className="text-sm font-semibold text-purple-700">Текст на гранях</label>
            <div className="grid grid-cols-2 gap-2">
              {settings.textFaces.map((f, i) => (
                <div key={i}>
                  <label className="text-xs text-gray-500">Грань {i + 1}</label>
                  <input
                    type="text"
                    maxLength={30}
                    value={f}
                    onChange={(e) => updateFace(i, e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2 text-sm mt-0.5 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs text-gray-500">Шрифт</label>
              <select
                value={settings.fontFamily}
                onChange={(e) => update({ fontFamily: e.target.value })}
                className="w-full rounded-xl border border-gray-200 p-2.5 text-sm bg-white mt-0.5 focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                {FONTS.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">
                Размер шрифта: {settings.fontSize} (короткие слова — 24–28, длинные фразы — 12–16)
              </label>
              <input
                type="range"
                min={10}
                max={30}
                step={1}
                value={settings.fontSize}
                onChange={(e) => update({ fontSize: Number(e.target.value) })}
                className="w-full accent-purple-600"
              />
            </div>
            <label className="flex items-center justify-between gap-2">
              <span className="text-sm text-gray-700">Точки на фоне (номер грани)</span>
              <button
                onClick={() => update({ showDots: !settings.showDots })}
                className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${settings.showDots ? 'bg-purple-600' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${settings.showDots ? 'translate-x-5' : ''}`} />
              </button>
            </label>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <label className="text-sm font-semibold text-purple-700">Предпросмотр листа (A4)</label>
          <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
            <Sheet settings={settings} sheetRef={sheetRef} />
          </div>
        </div>

        <button
          onClick={handleExportPDF}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <Download className="w-5 h-5" /> Скачать PDF
        </button>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowFaq(!showFaq)}
            className="w-full px-4 py-4 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-700">Частые вопросы</h3>
              <span className="text-xs font-bold text-purple-400">{FAQ_ITEMS.length}</span>
            </div>
            {showFaq ? <ChevronUp className="w-5 h-5 text-purple-600" /> : <ChevronDown className="w-5 h-5 text-purple-600" />}
          </button>
          {showFaq && (
            <div className="px-3 pb-3 space-y-2">
              {FAQ_ITEMS.map((item, idx) => (
                <div key={idx} className="border border-purple-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaqItem(openFaqItem === idx ? null : idx)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-purple-50 transition-colors"
                  >
                    <span className="font-semibold text-sm text-gray-800">{item.q}</span>
                    {openFaqItem === idx ? (
                      <ChevronUp className="w-4 h-4 text-purple-600 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-purple-600 shrink-0" />
                    )}
                  </button>
                  {openFaqItem === idx && (
                    <div className="px-4 pb-3 pt-1 text-sm text-gray-600 bg-purple-50/50 border-t border-purple-100 whitespace-pre-line">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowScen(!showScen)}
            className="w-full px-4 py-4 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-700">Сценарии для занятий</h3>
              <span className="text-xs font-bold text-purple-400">{SCENARIO_ITEMS.length}</span>
            </div>
            {showScen ? <ChevronUp className="w-5 h-5 text-purple-600" /> : <ChevronDown className="w-5 h-5 text-purple-600" />}
          </button>
          {showScen && (
            <div className="px-3 pb-3 space-y-2">
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
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 items-start">
          <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900 leading-relaxed">
            <b>Совет:</b> если текст не помещается на грани — уменьшите размер шрифта.
            На листе Letter используйте масштаб печати 90%. Для долговечных кубиков — бумага 160–200 г/м².
          </p>
        </div>
      </main>
    </div>
  );
}
