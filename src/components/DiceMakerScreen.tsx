import { useRef, useState } from 'react';
import { Box, Download, Type, Image as ImageIcon, Layers, Lightbulb } from 'lucide-react';
import { jsPDF } from 'jspdf';
import BackButton from './BackButton';
import { triggerHaptic } from '@/lib/haptic';

type DiceMode = 'text' | 'images' | 'both';

interface DiceSettings {
  mode: DiceMode;
  textFaces: string[];
  category: string;
  fontFamily: string;
  fontSize: number;
  showDots: boolean;
}

const SETTINGS_KEY = 'dice-maker-settings';

const CATEGORIES: { id: string; label: string; items: string[] }[] = [
  { id: 'animals', label: 'Животные', items: ['🐶', '', '', '🦊', '🐻', ''] },
  { id: 'food', label: 'Еда', items: ['🍎', '🍌', '🍕', '🥕', '', '🧀'] },
  { id: 'clothes', label: 'Одежда', items: ['👕', '', '', '👗', '🧤', '👟'] },
  { id: 'transport', label: 'Транспорт', items: ['🚗', '🚌', '🚲', '️', '🚂', '🛵'] },
  { id: 'weather', label: 'Погода', items: ['☀️', '🌧️', '❄️', '🌈', '⛈️', '🌙'] },
  { id: 'jobs', label: 'Профессии', items: ['👩‍⚕️', '👨‍🚒', '👮♀️', '👩‍🏫', '👨🍳', '‍♀️'] },
  { id: 'emotions', label: 'Эмоции', items: ['😀', '😢', '😡', '😲', '😴', '🤩'] },
  { id: 'colors', label: 'Цвета', items: ['🟥', '🟦', '', '', '🟪', '🟧'] },
];

const FONTS = [
  { id: 'Verdana, sans-serif', label: 'Verdana (рекомендуется)' },
  { id: '"Comic Sans MS", cursive', label: 'Comic Sans (рекомендуется)' },
  { id: 'Arial, sans-serif', label: 'Arial' },
  { id: 'Georgia, serif', label: 'Georgia' },
  { id: '"Courier New", monospace', label: 'Courier' },
];

const DEFAULT_SETTINGS: DiceSettings = {
  mode: 'both',
  textFaces: ['Кто?', 'Что?', 'Где?', 'Когда?', 'Почему?', 'Как?'],
  category: 'animals',
  fontFamily: 'Verdana, sans-serif',
  fontSize: 20,
  showDots: true,
};

const IDEA_ITEMS = [
  'Кубик с картинками + кубик с вопросами: ученик бросает оба и отвечает на вопрос про выпавшую картинку.',
  'Два кубика с картинками: ученик составляет предложение, связывающее два выпавших объекта.',
  'Кубик с буквосочетаниями: за 2 минуты записать как можно больше слов с выпавшей комбинацией.',
];

// Точки (пипсы) для граней 1–6, координаты в долях стороны
const PIPS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.25], [0.25, 0.5], [0.25, 0.75], [0.75, 0.25], [0.75, 0.5], [0.75, 0.75]],
};

function loadSettings(): DiceSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && Array.isArray(p.textFaces) && p.textFaces.length === 6) return { ...DEFAULT_SETTINGS, ...p };
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
  // Грани: [перед, право, зад, лево, верх, низ], значения точек 1–6
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
      {/* Клапаны для склейки */}
      {tabs.map((d, i) => (
        <path key={i} d={d} fill="#f3f4f6" stroke="#111827" strokeWidth={1.5} />
      ))}
      {/* Грани */}
      {faces.map((f, i) => (
        <rect key={i} x={f.x} y={f.y} width={S} height={S} fill="#ffffff" stroke="#111827" strokeWidth={2} />
      ))}
      {/* Линии сгиба (пунктир) */}
      <g stroke="#6b7280" strokeWidth={1.5} strokeDasharray="6 4">
        <line x1={x0 + S} y1={y0 + S} x2={x0 + 2 * S} y2={y0 + S} />
        <line x1={x0 + S} y1={y0 + 2 * S} x2={x0 + 2 * S} y2={y0 + 2 * S} />
        <line x1={x0 + S} y1={y0 + S} x2={x0 + S} y2={y0 + 2 * S} />
        <line x1={x0 + 2 * S} y1={y0 + S} x2={x0 + 2 * S} y2={y0 + 2 * S} />
        <line x1={x0 + 3 * S} y1={y0 + S} x2={x0 + 3 * S} y2={y0 + 2 * S} />
      </g>
      {/* Содержимое граней */}
      {faces.map((f, i) => {
        if (type === 'image') {
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
  const cat = CATEGORIES.find((c) => c.id === settings.category) || CATEGORIES[0];
  const single = settings.mode !== 'both';
  const S = single ? 170 : 120;
  const netW = 4 * S + 28;
  const netH = 3 * S + 28;
  const x0 = (W - netW) / 2 + 14;

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
      {single ? (
        <Net
          x0={x0}
          y0={(H - netH) / 2 + 14}
          S={S}
          values={settings.mode === 'text' ? settings.textFaces : cat.items}
          type={settings.mode === 'text' ? 'text' : 'image'}
          settings={settings}
        />
      ) : (
        <>
          <text x={W / 2} y={72} textAnchor="middle" fontSize={14} fill="#9ca3af" fontFamily="Verdana, sans-serif">
            Кубик с картинками
          </text>
          <Net x0={x0} y0={86} S={S} values={cat.items} type="image" settings={settings} />
          <text x={W / 2} y={86 + netH + 34} textAnchor="middle" fontSize={14} fill="#9ca3af" fontFamily="Verdana, sans-serif">
            Кубик с текстом
          </text>
          <Net x0={x0} y0={86 + netH + 46} S={S} values={settings.textFaces} type="text" settings={settings} />
        </>
      )}
    </svg>
  );
};

export default function DiceMakerScreen({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState<DiceSettings>(() => loadSettings());
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

  const withText = settings.mode !== 'images';
  const withImages = settings.mode !== 'text';

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
        {/* Режим */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <label className="text-sm font-semibold text-purple-700">Режим</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => update({ mode: 'text' })}
              className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-semibold text-xs transition-colors ${
                settings.mode === 'text' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700'
              }`}
            >
              <Type className="w-5 h-5" /> Текст
            </button>
            <button
              onClick={() => update({ mode: 'images' })}
              className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-semibold text-xs transition-colors ${
                settings.mode === 'images' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700'
              }`}
            >
              <ImageIcon className="w-5 h-5" /> Картинки
            </button>
            <button
              onClick={() => update({ mode: 'both' })}
              className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-semibold text-xs transition-colors ${
                settings.mode === 'both' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700'
              }`}
            >
              <Layers className="w-5 h-5" /> Оба
            </button>
          </div>
          <p className="text-xs text-gray-500">
            {settings.mode === 'text' && 'Один кубик с вашим текстом на гранях.'}
            {settings.mode === 'images' && 'Один кубик с картинками из выбранной категории.'}
            {settings.mode === 'both' && 'Два кубика на листе: картинки + текст (игра «вопрос-ответ»).'}
          </p>
        </div>

        {/* Категория картинок */}
        {withImages && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <label className="text-sm font-semibold text-purple-700">Категория картинок</label>
            <select
              value={settings.category}
              onChange={(e) => update({ category: e.target.value })}
              className="w-full rounded-xl border border-gray-200 p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <div className="flex justify-between text-2xl">
              {(CATEGORIES.find((c) => c.id === settings.category) || CATEGORIES[0]).items.map((e, i) => (
                <span key={i}>{e}</span>
              ))}
            </div>
          </div>
        )}

        {/* Настройки текста */}
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

        {/* Предпросмотр */}
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

        {/* Идеи */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-purple-700 text-sm">Идеи для занятий</h3>
          </div>
          {IDEA_ITEMS.map((idea, i) => (
            <p key={i} className="text-xs text-gray-600 leading-relaxed">• {idea}</p>
          ))}
          <p className="text-[11px] text-gray-400 pt-1">
            Совет: если текст не помещается на грани — уменьшите размер шрифта. На листе Letter используйте масштаб печати 90%.
          </p>
        </div>
      </main>
    </div>
  );
}
