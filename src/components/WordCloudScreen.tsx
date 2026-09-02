import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Cloud,
  Upload,
  Download,
  RefreshCw,
  Trash2,
  Save,
  FileText,
  Image as ImageIcon,
  FileDown,
  Palette,
  Type,
  Settings2,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import BackButton from './BackButton';
import { triggerHaptic } from '@/lib/haptic';

interface WordItem {
  text: string;
  weight: number;
  x: number;
  y: number;
  rotate: number;
  fontSize: number;
  color: string;
}

interface CloudSettings {
  shape: 'circle' | 'heart' | 'star' | 'diamond' | 'rectangle';
  fontFamily: string;
  palette: string;
  backgroundColor: string;
  minAngle: number;
  maxAngle: number;
  density: number;
  maxWords: number;
  seed: number;
}

interface ProjectData {
  text: string;
  lineMode: boolean;
  stopWords: string;
  settings: CloudSettings;
}

const PROJECT_KEY = 'wordcloud-project';
const FONTS = [
  'Arial, sans-serif',
  'Georgia, serif',
  '"Times New Roman", serif',
  '"Courier New", monospace',
  'Verdana, sans-serif',
  '"Trebuchet MS", sans-serif',
  'Impact, sans-serif',
  '"Comic Sans MS", cursive',
  'Tahoma, sans-serif',
];

const GOOGLE_FONTS = [
  'Roboto',
  'Open Sans',
  'Montserrat',
  'Lobster',
  'Pacifico',
  'Bebas Neue',
  'Oswald',
  'Playfair Display',
];

const PALETTES: Record<string, string[]> = {
  rainbow: ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#f72585'],
  ocean: ['#006ba6', '#0496ff', '#40e0d0', '#76e2f4', '#a8e6cf', '#dcedc1'],
  sunset: ['#ff6b6b', '#feca57', '#ff9ff3', '#f368e0', '#ee5253', '#ff9f43'],
  forest: ['#2d5016', '#4a7c2a', '#6fa550', '#95c97a', '#c5e8a5', '#e8f5d1'],
  mono: ['#1a1a1a', '#333333', '#555555', '#777777', '#999999', '#bbbbbb'],
  pastel: ['#ffb3ba', '#bae1ff', '#baffc9', '#ffffba', '#ffdfba', '#e0baff'],
};

const DEFAULT_STOP_WORDS = 'и в во не что он на я с со как а то все она так его но да ты к у же вы за бы по только ее мне было вот от меня еще нет о из ему теперь даже ну вдруг ли если уже или ни быть был него до вас нибудь опять уж вам ведь там потом себя ничего ей может они тут где есть надо ней для мы тебя их чем была сам чтоб без будто человек чего разве там этой этого этого когда';

const DEMO_TEXT = `Педагогика это искусство воспитания и обучения. Современная школа использует интерактивные методы. Ученики изучают математику, русский язык, литературу, историю, географию, биологию, физику, химию. Важны критическое мышление, творчество, коммуникация, сотрудничество. Учитель помогает раскрывать потенциал каждого ребёнка. Образование формирует личность будущего гражданина. Наука и технологии меняют мир. Знания это сила. Учеба это путь к успеху.`;

const DEFAULT_SETTINGS: CloudSettings = {
  shape: 'circle',
  fontFamily: 'Arial, sans-serif',
  palette: 'rainbow',
  backgroundColor: '#ffffff',
  minAngle: 0,
  maxAngle: 0,
  density: 1.0,
  maxWords: 80,
  seed: 42,
};

function loadProject(): ProjectData {
  try {
    const raw = localStorage.getItem(PROJECT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    text: '',
    lineMode: false,
    stopWords: DEFAULT_STOP_WORDS,
    settings: DEFAULT_SETTINGS,
  };
}

function saveProject(p: ProjectData) {
  try {
    localStorage.setItem(PROJECT_KEY, JSON.stringify(p));
  } catch {}
}

// Простая нормализация (lowercase + убрать пунктуацию + базовая стемминг)
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Упрощённый стемминг русского
function stemRu(word: string): string {
  if (word.length < 4) return word;
  const endings = ['ами', 'ями', 'ого', 'его', 'ому', 'ему', 'ых', 'их', 'ые', 'ий', 'ой', 'ей', 'ую', 'юю', 'ая', 'яя', 'ом', 'ем', 'ах', 'ях', 'ов', 'ев', 'ам', 'ям', 'ой', 'ей', 'ую', 'юю', 'ать', 'ять', 'еть', 'ить', 'оть', 'ать', 'ять', 'ыть', 'ут', 'ют', 'ат', 'ят', 'ит', 'ет', 'ёт'];
  for (const e of endings) {
    if (word.length > e.length + 2 && word.endsWith(e)) {
      return word.slice(0, -e.length);
    }
  }
  return word;
}

function parseText(text: string, lineMode: boolean, stopWords: Set<string>, maxWords: number): { word: string; count: number }[] {
  if (!text.trim()) return [];

  if (lineMode) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const counts = new Map<string, number>();
    for (const line of lines) {
      const norm = normalize(line);
      if (norm.length < 1) continue;
      counts.set(norm, (counts.get(norm) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, maxWords);
  }

  const words = normalize(text).split(' ');
  const counts = new Map<string, number>();
  for (const w of words) {
    if (w.length < 2) continue;
    const stemmed = stemRu(w);
    if (stopWords.has(stemmed) || stopWords.has(w)) continue;
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, maxWords);
}

// Спиральный алгоритм размещения (как в d3-cloud)
function layoutWords(
  words: { word: string; count: number }[],
  width: number,
  height: number,
  settings: CloudSettings,
  rng: () => number,
): WordItem[] {
  if (words.length === 0) return [];

  const maxCount = Math.max(...words.map((w) => w.count));
  const minFont = 12;
  const maxFont = Math.min(width, height) * 0.18;
  const palette = PALETTES[settings.palette] || PALETTES.rainbow;

  // Маска формы (бинарный массив)
  const maskW = Math.ceil(width / 4);
  const maskH = Math.ceil(height / 4);
  const mask = createShapeMask(settings.shape, maskW, maskH);

  // Занятые прямоугольники
  const occupied: { x: number; y: number; w: number; h: number }[] = [];

  const items: WordItem[] = [];
  const cx = width / 2;
  const cy = height / 2;

  for (const w of words) {
    const t = w.count / maxCount;
    const fontSize = Math.round(minFont + t * (maxFont - minFont));

    // Примерные размеры слова
    const charWidth = fontSize * 0.55;
    const wordW = w.word.length * charWidth;
    const wordH = fontSize * 1.2;

    // Угол поворота
    const angleRange = settings.maxAngle - settings.minAngle;
    let rotate = 0;
    if (angleRange > 0) {
      if (settings.maxAngle === 90 && settings.minAngle === 0) {
        rotate = rng() > 0.5 ? 0 : -90;
      } else {
        rotate = settings.minAngle + rng() * angleRange;
      }
    }

    // Спиральный поиск позиции
    let placed = false;
    let attempts = 0;
    const maxAttempts = 500;
    let angle = 0;
    let radius = 0;

    while (!placed && attempts < maxAttempts) {
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;

      // Проверка попадания в маску
      const mx = Math.floor((x / width) * maskW);
      const my = Math.floor((y / height) * maskH);
      if (mx >= 0 && mx < maskW && my >= 0 && my < maskH && !mask[my * maskW + mx]) {
        // Проверка коллизий с уже размещёнными
        const box = {
          x: x - wordW / 2,
          y: y - wordH / 2,
          w: wordW,
          h: wordH,
        };
        let collision = false;
        const gap = 4 * settings.density;
        for (const occ of occupied) {
          if (
            box.x < occ.x + occ.w + gap &&
            box.x + box.w + gap > occ.x &&
            box.y < occ.y + occ.h + gap &&
            box.y + box.h + gap > occ.y
          ) {
            collision = true;
            break;
          }
        }
        if (!collision && x - wordW / 2 > 0 && x + wordW / 2 < width && y - wordH / 2 > 0 && y + wordH / 2 < height) {
          items.push({
            text: w.word,
            weight: w.count,
            x,
            y,
            rotate,
            fontSize,
            color: palette[items.length % palette.length],
          });
          occupied.push(box);
          placed = true;
        }
      }

      angle += 0.3;
      radius += 0.5;
      attempts++;
    }
  }

  return items;
}

function createShapeMask(shape: string, w: number, h: number): Uint8Array {
  const mask = new Uint8Array(w * h);
  const cx = w / 2;
  const cy = h / 2;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = (x - cx) / cx;
      const ny = (y - cy) / cy;
      let inside = false;

      switch (shape) {
        case 'circle':
          inside = nx * nx + ny * ny <= 0.9;
          break;
        case 'rectangle':
          inside = Math.abs(nx) < 0.95 && Math.abs(ny) < 0.85;
          break;
        case 'heart': {
          const hx = nx * 1.3;
          const hy = -ny * 1.3 + 0.3;
          inside = Math.pow(hx * hx + hy * hy - 1, 3) - hx * hx * hy * hy * hy <= 0;
          break;
        }
        case 'star': {
          const a = Math.atan2(ny, nx);
          const r = Math.sqrt(nx * nx + ny * ny);
          const rStar = 0.5 + 0.3 * Math.cos(5 * a);
          inside = r <= rStar;
          break;
        }
        case 'diamond':
          inside = Math.abs(nx) + Math.abs(ny) <= 0.9;
          break;
      }

      if (!inside) mask[y * w + x] = 1;
    }
  }
  return mask;
}

export default function WordCloudScreen({ onBack }: { onBack: () => void }) {
  const [project, setProject] = useState<ProjectData>(() => loadProject());
  const [view, setView] = useState<'main' | 'export'>('main');
  const [scale, setScale] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const settings = project.settings;
  const stopWordsSet = useMemo(() => new Set(project.stopWords.toLowerCase().split(/\s+/).filter(Boolean)), [project.stopWords]);

  const wordsData = useMemo(
    () => parseText(project.text, project.lineMode, stopWordsSet, settings.maxWords),
    [project.text, project.lineMode, stopWordsSet, settings.maxWords],
  );

  const stats = useMemo(() => {
    const total = project.text.trim().split(/\s+/).filter(Boolean).length;
    return { unique: wordsData.length, total };
  }, [wordsData, project.text]);

  const update = useCallback((patch: Partial<ProjectData>) => {
    setProject((prev) => {
      const next = { ...prev, ...patch };
      saveProject(next);
      return next;
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<CloudSettings>) => {
    setProject((prev) => {
      const next = { ...prev, settings: { ...prev.settings, ...patch } };
      saveSettings(next.settings);
      saveProject(next);
      return next;
    });
  }, []);

  function saveSettings(s: CloudSettings) {
    try {
      localStorage.setItem('wordcloud-settings', JSON.stringify(s));
    } catch {}
  }

  const rng = useCallback(() => {
    let s = settings.seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }, [settings.seed]);

  const cloudItems = useMemo(() => {
    if (wordsData.length === 0) return [];
    return layoutWords(wordsData, 800, 600, settings, rng());
  }, [wordsData, settings, rng]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.csv')) {
      const text = await file.text();
      // Проверим формат: либо "word,count" либо просто текст
      const lines = text.split('\n').filter(Boolean);
      const isCsvFormat = lines[0] && lines[0].includes(',');
      if (isCsvFormat) {
        // CSV с частотами
        const csvWords: { word: string; count: number }[] = [];
        for (const line of lines) {
          const [w, c] = line.split(',').map((s) => s.trim());
          const n = parseInt(c);
          if (w && !isNaN(n)) csvWords.push({ word: w, count: n });
        }
        // Временно используем как обычный текст через join
        update({ text: csvWords.map((w) => `${w.word} `.repeat(w.count)).join('\n') });
        return;
      }
      update({ text: text });
    } else if (file.name.endsWith('.txt')) {
      update({ text: await file.text() });
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      alert('Excel: сохраните как CSV и загрузите снова (поддержка XLSX требует библиотеки xlsx).');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRedraw = () => {
    updateSettings({ seed: Math.floor(Math.random() * 100000) });
    triggerHaptic('light');
  };

  const handleDemo = () => {
    update({ text: DEMO_TEXT });
    triggerHaptic('light');
  };

  const handleClear = () => {
    update({ text: '' });
  };

  const handleExportPNG = (resolution: 1 | 2 | 4) => {
    const svgEl = document.getElementById('wordcloud-svg');
    if (!svgEl) return;
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    const data = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 800 * resolution;
      canvas.height = 600 * resolution;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = settings.backgroundColor === 'transparent' ? 'rgba(0,0,0,0)' : settings.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(resolution, resolution);
      ctx.drawImage(img, 0, 0, 800, 600);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => {
        if (!b) return;
        const u = URL.createObjectURL(b);
        const a = document.createElement('a');
        a.href = u;
        a.download = `облако-слов-${resolution}x.png`;
        a.click();
        URL.revokeObjectURL(u);
        triggerHaptic('light');
      });
    };
    img.src = url;
  };

  const handleExportSVG = () => {
    const svgEl = document.getElementById('wordcloud-svg');
    if (!svgEl) return;
    const data = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'облако-слов.svg';
    a.click();
    URL.revokeObjectURL(url);
    triggerHaptic('light');
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'облако-проект.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as ProjectData;
      setProject(data);
      saveProject(data);
    } catch {
      alert('Не удалось загрузить файл проекта');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-purple-50 to-blue-50 flex flex-col">
      <header className="bg-gradient-to-r from-purple-700 to-violet-600 shadow-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Облако слов</h1>
            <p className="text-xs text-purple-200">
              {stats.unique} уник. · {stats.total} слов
            </p>
          </div>
          <Cloud className="w-6 h-6 text-white/70" />
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-3 space-y-3 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
          {/* ЛЕВАЯ КОЛОНКА: Облако */}
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-purple-700">Облако слов</label>
                <div className="flex gap-1 items-center">
                  <button
                    onClick={handleRedraw}
                    className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-lg font-semibold flex items-center gap-1"
                    title="Перерисовать"
                  >
                    <RefreshCw className="w-3 h-3" /> Ещё раз
                  </button>
                  <input
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="w-20 accent-purple-600"
                  />
                  <span className="text-xs text-gray-500 w-8">{(scale * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div className="border-2 border-gray-200 rounded-xl overflow-hidden" style={{ background: settings.backgroundColor === 'transparent' ? 'repeating-conic-gradient(#e5e7eb 0% 25%, #fff 0% 50%) 50% / 20px 20px' : settings.backgroundColor }}>
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 800, height: 600 }}>
                  <svg id="wordcloud-svg" width={800} height={600} viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
                    {cloudItems.length === 0 ? (
                      <text x={400} y={300} textAnchor="middle" fontSize={20} fill="#9ca3af" fontFamily="Arial, sans-serif">
                        Введите текст или загрузите файл
                      </text>
                    ) : (
                      cloudItems.map((item, i) => (
                        <text
                          key={`${item.text}-${i}`}
                          x={item.x}
                          y={item.y}
                          fontSize={item.fontSize}
                          fontFamily={settings.fontFamily}
                          fontWeight={item.weight > (wordsData[0]?.count || 1) * 0.5 ? 700 : 400}
                          fill={item.color}
                          textAnchor="middle"
                          dominantBaseline="central"
                          transform={`rotate(${item.rotate} ${item.x} ${item.y})`}
                          className="select-none"
                          style={{ cursor: 'move' }}
                        >
                          {item.text}
                        </text>
                      ))
                    )}
                  </svg>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={handleDemo} className="flex-1 py-2 text-xs bg-purple-50 text-purple-700 rounded-lg font-semibold flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3" /> Демо-текст
                </button>
                <button onClick={handleClear} className="flex-1 py-2 text-xs bg-red-50 text-red-600 rounded-lg font-semibold flex items-center justify-center gap-1">
                  <Trash2 className="w-3 h-3" /> Очистить
                </button>
              </div>
            </div>

            {/* Текст */}
            <div className="bg-white rounded-2xl p-3 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-purple-700">Текст</label>
                <div className="flex gap-1">
                  <label className="flex items-center gap-1 text-xs text-gray-600">
                    <input type="checkbox" checked={project.lineMode} onChange={(e) => update({ lineMode: e.target.checked })} className="accent-purple-600" />
                    Построчно
                  </label>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-lg font-semibold flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" /> Файл
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>
              <textarea
                value={project.text}
                onChange={(e) => update({ text: e.target.value })}
                placeholder={project.lineMode ? 'Каждая строка — отдельное слово или фраза...' : 'Вставьте текст, отрывок или список слов...'}
                rows={6}
                className="w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            {/* Экспорт */}
            <div className="bg-white rounded-2xl p-3 shadow-sm space-y-2">
              <label className="text-sm font-semibold text-purple-700">Экспорт</label>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => handleExportPNG(1)} className="py-2.5 rounded-xl bg-purple-50 text-purple-700 text-xs font-semibold flex flex-col items-center gap-1">
                  <ImageIcon className="w-4 h-4" /> PNG 1×
                </button>
                <button onClick={() => handleExportPNG(2)} className="py-2.5 rounded-xl bg-purple-50 text-purple-700 text-xs font-semibold flex flex-col items-center gap-1">
                  <ImageIcon className="w-4 h-4" /> PNG 2×
                </button>
                <button onClick={() => handleExportPNG(4)} className="py-2.5 rounded-xl bg-purple-50 text-purple-700 text-xs font-semibold flex flex-col items-center gap-1">
                  <ImageIcon className="w-4 h-4" /> PNG 4K
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleExportSVG} className="py-2.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-semibold flex items-center justify-center gap-1">
                  <FileDown className="w-4 h-4" /> SVG (вектор)
                </button>
                <button onClick={handleExportJSON} className="py-2.5 rounded-xl bg-green-50 text-green-700 text-xs font-semibold flex items-center justify-center gap-1">
                  <Save className="w-4 h-4" /> Сохранить проект
                </button>
              </div>
              <div>
                <label className="text-[10px] text-gray-500">Загрузить проект:</label>
                <label className="block mt-1 py-1.5 px-2 border border-dashed border-gray-300 rounded-lg text-center text-xs text-gray-500 cursor-pointer hover:bg-gray-50">
                  <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
                  📁 Выбрать файл .json
                </label>
              </div>
            </div>
          </div>

          {/* ПРАВАЯ КОЛОНКА: Настройки */}
          <div className="space-y-3">
            {/* Форма */}
            <div className="bg-white rounded-2xl p-3 shadow-sm space-y-2">
              <div className="flex items-center gap-1">
                <Settings2 className="w-4 h-4 text-purple-600" />
                <label className="text-sm font-semibold text-purple-700">Форма</label>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {(['circle', 'heart', 'star', 'diamond', 'rectangle'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => updateSettings({ shape: s })}
                    className={`p-2 rounded-lg text-xs font-semibold border ${settings.shape === s ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}
                    title={s}
                  >
                    {s === 'circle' ? '●' : s === 'heart' ? '♥' : s === 'star' ? '★' : s === 'diamond' ? '◆' : '▬'}
                  </button>
                ))}
              </div>
            </div>

            {/* Шрифт */}
            <div className="bg-white rounded-2xl p-3 shadow-sm space-y-2">
              <div className="flex items-center gap-1">
                <Type className="w-4 h-4 text-purple-600" />
                <label className="text-sm font-semibold text-purple-700">Шрифт</label>
              </div>
              <select
                value={settings.fontFamily}
                onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                className="w-full rounded-lg border border-gray-200 p-1.5 text-xs bg-white"
              >
                <optgroup label="Системные">
                  {FONTS.map((f) => (
                    <option key={f} value={f} style={{ fontFamily: f }}>
                      {f.split(',')[0].replace(/"/g, '')}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Google Fonts">
                  {GOOGLE_FONTS.map((f) => (
                    <option key={f} value={`"${f}", sans-serif`}>
                      {f}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Палитра */}
            <div className="bg-white rounded-2xl p-3 shadow-sm space-y-2">
              <div className="flex items-center gap-1">
                <Palette className="w-4 h-4 text-purple-600" />
                <label className="text-sm font-semibold text-purple-700">Палитра</label>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(PALETTES).map(([name, colors]) => (
                  <button
                    key={name}
                    onClick={() => updateSettings({ palette: name })}
                    className={`p-1.5 rounded-lg border ${settings.palette === name ? 'border-purple-500' : 'border-gray-200'}`}
                  >
                    <div className="flex gap-0.5 h-4">
                      {colors.map((c, i) => (
                        <div key={i} className="flex-1 rounded" style={{ background: c }} />
                      ))}
                    </div>
                    <p className="text-[9px] text-gray-600 mt-1 capitalize">{name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Фон */}
            <div className="bg-white rounded-2xl p-3 shadow-sm space-y-2">
              <label className="text-sm font-semibold text-purple-700">Фон</label>
              <div className="grid grid-cols-4 gap-1">
                {['#ffffff', '#000000', '#f3f4f6', 'transparent'].map((c) => (
                  <button
                    key={c}
                    onClick={() => updateSettings({ backgroundColor: c })}
                    className={`h-8 rounded-lg border-2 ${settings.backgroundColor === c ? 'border-purple-500' : 'border-gray-200'}`}
                    style={{
                      background: c === 'transparent' ? 'repeating-conic-gradient(#e5e7eb 0% 25%, #fff 0% 50%) 50% / 10px 10px' : c,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Углы */}
            <div className="bg-white rounded-2xl p-3 shadow-sm space-y-2">
              <label className="text-sm font-semibold text-purple-700">Углы наклона</label>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => updateSettings({ minAngle: 0, maxAngle: 0 })}
                  className={`py-1.5 rounded-lg text-[10px] font-semibold border ${settings.minAngle === 0 && settings.maxAngle === 0 ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}
                >
                  Гориз.
                </button>
                <button
                  onClick={() => updateSettings({ minAngle: -90, maxAngle: -90 })}
                  className={`py-1.5 rounded-lg text-[10px] font-semibold border ${settings.minAngle === -90 && settings.maxAngle === -90 ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}
                >
                  Верт.
                </button>
                <button
                  onClick={() => updateSettings({ minAngle: 0, maxAngle: 90 })}
                  className={`py-1.5 rounded-lg text-[10px] font-semibold border ${settings.maxAngle === 90 && settings.minAngle === 0 ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}
                >
                  Случ.
                </button>
              </div>
            </div>

            {/* Плотность и лимит */}
            <div className="bg-white rounded-2xl p-3 shadow-sm space-y-2">
              <div>
                <label className="text-[10px] text-gray-500">Плотность: {settings.density.toFixed(1)}</label>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={settings.density}
                  onChange={(e) => updateSettings({ density: Number(e.target.value) })}
                  className="w-full accent-purple-600"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500">Максимум слов: {settings.maxWords}</label>
                <input
                  type="range"
                  min={10}
                  max={200}
                  step={5}
                  value={settings.maxWords}
                  onChange={(e) => updateSettings({ maxWords: Number(e.target.value) })}
                  className="w-full accent-purple-600"
                />
              </div>
            </div>

            {/* Стоп-слова */}
            <div className="bg-white rounded-2xl p-3 shadow-sm space-y-2">
              <label className="text-sm font-semibold text-purple-700">Стоп-слова</label>
              <textarea
                value={project.stopWords}
                onChange={(e) => update({ stopWords: e.target.value })}
                placeholder="и в во не что..."
                rows={3}
                className="w-full rounded-lg border border-gray-200 p-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <button
                onClick={() => update({ stopWords: DEFAULT_STOP_WORDS })}
                className="w-full py-1.5 text-[10px] bg-gray-50 text-gray-600 rounded-lg font-semibold"
              >
                Сбросить список
              </button>
            </div>

            {/* Статистика */}
            <div className="bg-white rounded-2xl p-3 shadow-sm">
              <div className="flex items-center gap-1 mb-2">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                <label className="text-sm font-semibold text-purple-700">Топ-10 слов</label>
              </div>
              <div className="space-y-1">
                {wordsData.slice(0, 10).map((w, i) => {
                  const max = wordsData[0]?.count || 1;
                  return (
                    <div key={w.word} className="flex items-center gap-2 text-[10px]">
                      <span className="w-4 text-gray-400">{i + 1}</span>
                      <span className="flex-1 truncate font-semibold text-gray-700">{w.word}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded overflow-hidden">
                        <div className="h-full bg-purple-400" style={{ width: `${(w.count / max) * 100}%` }} />
                      </div>
                      <span className="w-6 text-right text-gray-500">{w.count}</span>
                    </div>
                  );
                })}
                {wordsData.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Нет данных</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[10px] text-amber-900">
          <b>Всё локально:</b> текст и настройки хранятся в вашем браузере, данные никуда не отправляются.
        </div>
      </main>
    </div>
  );
}
