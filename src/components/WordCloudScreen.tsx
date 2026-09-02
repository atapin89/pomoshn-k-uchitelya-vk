import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Cloud,
  Upload,
  Download,
  RefreshCw,
  Trash2,
  Save,
  Image as ImageIcon,
  FileDown,
  Palette,
  Type,
  Settings2,
  BarChart3,
  Sparkles,
  Maximize2,
  X,
  HelpCircle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  Move,
  RotateCcw as ResetIcon,
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
  minFont: number;
  maxFont: number;
  seed: number;
}

interface ProjectData {
  text: string;
  lineMode: boolean;
  stopWords: string;
  settings: CloudSettings;
}

const PROJECT_KEY = 'wordcloud-project';
const CLOUD_WIDTH = 500;
const CLOUD_HEIGHT = 375;

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

const DEFAULT_STOP_WORDS = 'и в во не что он на я с со как а то все она так его но да ты к у же вы за бы по только ее мне было вот от меня еще нет о из ему теперь даже ну вдруг ли если уже или ни быть был него до вас нибудь опять уж вам ведь там потом себя ничего ей может они тут где есть надо ней для мы тебя их чем была сам чтоб без будто человек чего разве';

const DEMO_TEXT = `Волк и семеро козлят
Жила-была коза с козлятами. Уходила коза в лес есть траву шелковую, пить воду студеную. Как только уйдет — козлятки запрут избушку и сами никуда не выходят. Воротится коза, постучится в дверь и запоет:
— Козлятушки, ребятушки!
Отопритеся, отворитеся!
Ваша мать пришла — молока принесла;
Бежит молоко по вымечку,
Из вымечка по копытечку,
Из копытечка во сыру землю!
Козлятки отопрут дверь и впустят мать. Она их покормит, напоит и опять уйдет в лес, а козлята запрутся крепко-накрепко.
Волк подслушал, как поет коза. Вот раз коза ушла, волк побежал к избушке и закричал толстым голосом:
— Вы, детушки!
Вы, козлятушки!
Отопритеся,
Отворитеся,
Ваша мать пришла,
Молока принесла.
Полны копытцы водицы!
Козлята ему отвечают:
— Слышим, слышим — да не матушкин это голосок! Наша матушка поет тонюсеньким голосом и не так причитает.
Волку делать нечего. Пошел он в кузницу и велел себе горло перековать, чтоб петь тонюсеньким голосом. Кузнец ему горло перековал. Волк опять побежал к избушке и спрятался за куст.
Вот приходит коза и стучится:
— Козлятушки, ребятушки!
Отопритеся, отворитеся!
Ваша мать пришла — молока принесла;
Бежит молоко по вымечку,
Из вымечка по копытечку,
Из копытечка во сыру землю!
Козлята впустили мать и давай рассказывать, как приходил волк, хотел их съесть.
Коза накормила, напоила козлят и строго-настрого наказала:
— Кто придет к избушечке, станет проситься толстым голосом да не переберет всего, что я вам причитываю, — дверь не отворяйте, никого не впускайте.
Только ушла коза, волк опять шасть к избушке, постучался и начал причитывать тонюсеньким голосом:
— Козлятушки, ребятушки!
Отопритеся, отворитеся!
Ваша мать пришла — молока принесла;
Бежит молоко по вымечку,
Из вымечка по копытечку,
Из копытечка во сыру землю!
Козлята отворили дверь, волк кинулся в избу и всех козлят съел. Только один козленочек схоронился в печке.
Приходит коза; сколько ни звала, ни причитывала — никто ей не отвечает. Видит — дверь отворена, вбежала в избушку — там нет никого. Заглянула в печь и нашла одного козленочка.
Как узнала коза о своей беде, как села она на лавку — начала горевать, горько плакать:
— Ох вы, детушки мои, козлятушки!
На что отпиралися-отворялися,
Злому волку доставалися?
Услыхал это волк, входит в избушку и говорит козе:
— Что ты на меня грешишь, кума? Не я твоих козлят съел. Полно горевать, пойдем лучше в лес, погуляем.
Пошли они в лес, а в лесу была яма, а в яме костер горел. Коза и говорит волку:
— Давай, волк, попробуем, кто перепрыгнет через яму?
Стали они прыгать. Коза перепрыгнула, а волк прыгнул, да и ввалился в горячую яму.
Брюхо у него от огня лопнуло, козлята оттуда выскочили, все живые, да — прыг к матери! И стали они жить-поживать по-прежнему.`;

const DEFAULT_SETTINGS: CloudSettings = {
  shape: 'circle',
  fontFamily: 'Arial, sans-serif',
  palette: 'rainbow',
  backgroundColor: '#ffffff',
  minAngle: 0,
  maxAngle: 0,
  density: 1.0,
  maxWords: 80,
  minFont: 14,
  maxFont: 96,
  seed: 42,
};

const FAQ_ITEMS = [
  {
    q: 'Почему некоторые слова не появляются в облаке?',
    a: 'Возможные причины:\n1. Слово входит в список стоп-слов (предлоги, союзы) — его можно отредактировать в блоке «Стоп-слова».\n2. Слово короче 2 символов — короткие слова фильтруются автоматически.\n3. Превышен лимит слов (по умолчанию 80) — увеличьте в блоке «Плотность и лимит».\n4. Слово не помещается физически — уменьшите плотность или лимит.',
  },
  {
    q: 'Можно ли загрузить свою форму облака?',
    a: 'В текущей версии доступны 5 встроенных форм: круг, сердце, звезда, ромб, прямоугольник. Этого достаточно для большинства образовательных задач.',
  },
  {
    q: 'Как использовать облако на уроке?',
    a: 'Проекция на доску — отличное начало урока: ученики угадывают тему по ключевым словам. Или наоборот — после изучения темы попросите детей составить своё облако из того, что запомнилось.',
  },
  {
    q: 'Чем отличается «Построчный режим» от обычного?',
    a: 'Обычный режим: текст разбивается на отдельные слова, подсчитывается их частота. Подходит для анализа статей, эссе.\nПострочный режим: каждая строка = отдельное слово или фраза. Идеально для списков терминов, имён, дат.',
  },
  {
    q: 'Что такое «Демо-текст»?',
    a: 'Готовый пример текста (сказка «Волк и семеро козлят») для быстрого знакомства с инструментом. Нажмите кнопку и замените текст на свой.',
  },
  {
    q: 'Как перемещать и масштабировать предпросмотр?',
    a: 'Зажмите и перетаскивайте мышью для перемещения. Используйте колесо мыши для масштабирования. Кнопки + / − / ↺ тоже работают.',
  },
];

const SCENARIO_ITEMS = [
  {
    icon: '📚',
    title: 'Введение в новую тему',
    description: 'Перед началом темы покажите облако из ключевых слов. Ученики угадывают тему, выдвигают гипотезы. В конце урока вернитесь к облаку и обсудите, какие слова стали понятны.',
  },
  {
    icon: '✍️',
    title: 'Анализ прочитанного текста',
    description: 'Вставьте отрывок из литературного произведения. Облако покажет самые частые слова — отправная точка для обсуждения: почему автор использует именно их?',
  },
  {
    icon: '🎯',
    title: 'Повторение перед контрольной',
    description: 'Каждый ученик пишет 5-10 ключевых терминов по теме. Соберите всё в одно облако. Ученики видят, какие понятия класс считает самыми важными.',
  },
  {
    icon: '🌍',
    title: 'Исследовательский проект',
    description: 'При анализе исторических документов или новостных статей облако выявляет доминирующие понятия. Сравните облака из разных источников.',
  },
  {
    icon: '🎨',
    title: 'Творческое задание',
    description: 'Пусть ученики напишут эссе «Мой мир». Объедините тексты в облако — получится коллективный портрет класса.',
  },
  {
    icon: '🔬',
    title: 'Научные термины',
    description: 'Построчный режим + список терминов по биологии, физике, химии. Получится наглядная «карта понятий» для кабинета.',
  },
];

function loadProject(): ProjectData {
  try {
    const raw = localStorage.getItem(PROJECT_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      // миграция старых настроек без minFont/maxFont
      if (!p.settings?.minFont) p.settings.minFont = DEFAULT_SETTINGS.minFont;
      if (!p.settings?.maxFont) p.settings.maxFont = DEFAULT_SETTINGS.maxFont;
      return p;
    }
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

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stemRu(word: string): string {
  if (word.length < 4) return word;
  const endings = ['ами', 'ями', 'ого', 'его', 'ому', 'ему', 'ых', 'их', 'ые', 'ий', 'ой', 'ей', 'ую', 'юю', 'ая', 'яя', 'ом', 'ем', 'ах', 'ях', 'ов', 'ев', 'ам', 'ям', 'ать', 'ять', 'еть', 'ить', 'ут', 'ют', 'ат', 'ят', 'ит', 'ет', 'ёт'];
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

function createRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
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

function layoutWords(
  words: { word: string; count: number }[],
  width: number,
  height: number,
  settings: CloudSettings,
): WordItem[] {
  if (words.length === 0) return [];

  const rng = createRng(settings.seed);
  const maxCount = Math.max(...words.map((w) => w.count));
  const palette = PALETTES[settings.palette] || PALETTES.rainbow;

  const maskW = Math.ceil(width / 4);
  const maskH = Math.ceil(height / 4);
  const mask = createShapeMask(settings.shape, maskW, maskH);

  const occupied: { x: number; y: number; w: number; h: number }[] = [];
  const items: WordItem[] = [];
  const cx = width / 2;
  const cy = height / 2;

  for (const w of words) {
    const t = w.count / maxCount;
    const fontSize = Math.round(settings.minFont + t * (settings.maxFont - settings.minFont));
    const charWidth = fontSize * 0.55;
    const wordW = w.word.length * charWidth;
    const wordH = fontSize * 1.2;

    const angleRange = settings.maxAngle - settings.minAngle;
    let rotate = 0;
    if (angleRange > 0) {
      if (settings.maxAngle === 90 && settings.minAngle === 0) {
        rotate = rng() > 0.5 ? 0 : -90;
      } else {
        rotate = settings.minAngle + rng() * angleRange;
      }
    }

    let placed = false;
    let attempts = 0;
    const maxAttempts = 500;
    let angle = 0;
    let radius = 0;

    while (!placed && attempts < maxAttempts) {
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;

      const mx = Math.floor((x / width) * maskW);
      const my = Math.floor((y / height) * maskH);
      if (mx >= 0 && mx < maskW && my >= 0 && my < maskH && !mask[my * maskW + mx]) {
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

const CloudSVG = ({ items, settings, fontFamily, id, width, height }: {
  items: WordItem[];
  settings: CloudSettings;
  fontFamily: string;
  id?: string;
  width: number;
  height: number;
}) => {
  const bgFill = settings.backgroundColor === 'transparent' ? 'none' : settings.backgroundColor;
  return (
    <svg id={id} width={width} height={height} viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg" style={{ background: bgFill, display: 'block' }}>
      {items.length === 0 ? (
        <text x={width / 2} y={height / 2} textAnchor="middle" fontSize={16} fill="#9ca3af" fontFamily="Arial, sans-serif">
          Введите текст или загрузите файл
        </text>
      ) : (
        items.map((item, i) => (
          <text
            key={`${item.text}-${i}`}
            x={item.x}
            y={item.y}
            fontSize={item.fontSize}
            fontFamily={fontFamily}
            fontWeight={item.weight > 3 ? 700 : 400}
            fill={item.color}
            textAnchor="middle"
            dominantBaseline="central"
            transform={`rotate(${item.rotate} ${item.x} ${item.y})`}
            className="select-none"
          >
            {item.text}
          </text>
        ))
      )}
    </svg>
  );
};

export default function WordCloudScreen({ onBack }: { onBack: () => void }) {
  const [project, setProject] = useState<ProjectData>(() => loadProject());
  const [showPreviewFull, setShowPreviewFull] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [showScen, setShowScen] = useState(false);
  const [openFaqItem, setOpenFaqItem] = useState<number | null>(null);

  // Зум и панорамирование предпросмотра
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

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

  const cloudItems = useMemo(
    () => layoutWords(wordsData, CLOUD_WIDTH, CLOUD_HEIGHT, settings),
    [wordsData, settings],
  );

  const update = (patch: Partial<ProjectData>) => {
    setProject((prev) => {
      const next = { ...prev, ...patch };
      saveProject(next);
      return next;
    });
  };

  const updateSettings = (patch: Partial<CloudSettings>) => {
    setProject((prev) => {
      const next = { ...prev, settings: { ...prev.settings, ...patch } };
      saveProject(next);
      return next;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      update({ text: await file.text() });
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      alert('Excel: сохраните как CSV и загрузите снова');
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

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.max(0.3, Math.min(3, z + delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: panStartRef.current.panX + (e.clientX - panStartRef.current.x),
      y: panStartRef.current.panY + (e.clientY - panStartRef.current.y),
    });
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsPanning(true);
    panStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX: pan.x, panY: pan.y };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPanning || e.touches.length !== 1) return;
    setPan({
      x: panStartRef.current.panX + (e.touches[0].clientX - panStartRef.current.x),
      y: panStartRef.current.panY + (e.touches[0].clientY - panStartRef.current.y),
    });
  };

  const handleTouchEnd = () => setIsPanning(false);

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
      canvas.width = CLOUD_WIDTH * resolution;
      canvas.height = CLOUD_HEIGHT * resolution;
      const ctx = canvas.getContext('2d')!;
      if (settings.backgroundColor === 'transparent') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = settings.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.scale(resolution, resolution);
      ctx.drawImage(img, 0, 0, CLOUD_WIDTH, CLOUD_HEIGHT);
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
    if (jsonInputRef.current) jsonInputRef.current.value = '';
  };

  const renderPreview = (zoomable: boolean) => (
    <div
      ref={zoomable ? previewContainerRef : undefined}
      onWheel={zoomable ? handleWheel : undefined}
      onMouseDown={zoomable ? handleMouseDown : undefined}
      onMouseMove={zoomable ? handleMouseMove : undefined}
      onMouseUp={zoomable ? handleMouseUp : undefined}
      onMouseLeave={zoomable ? handleMouseUp : undefined}
      onTouchStart={zoomable ? handleTouchStart : undefined}
      onTouchMove={zoomable ? handleTouchMove : undefined}
      onTouchEnd={zoomable ? handleTouchEnd : undefined}
      className={`w-full h-full flex items-center justify-center overflow-hidden ${zoomable ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
      style={{
        background:
          settings.backgroundColor === 'transparent'
            ? 'repeating-conic-gradient(#e5e7eb 0% 25%, #fff 0% 50%) 50% / 20px 20px'
            : settings.backgroundColor,
      }}
    >
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 0.2s',
        }}
      >
        <CloudSVG
          id="wordcloud-svg"
          items={cloudItems}
          settings={settings}
          fontFamily={settings.fontFamily}
          width={CLOUD_WIDTH}
          height={CLOUD_HEIGHT}
        />
      </div>
    </div>
  );

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
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3">
          {/* ЛЕВАЯ КОЛОНКА */}
          <div className="space-y-3">
            {/* Компактное превью с зумом и панорамой */}
            <div className="bg-white rounded-2xl p-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-purple-700">Облако слов</label>
                <div className="flex gap-1 items-center">
                  <button
                    onClick={handleRedraw}
                    className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-lg font-semibold flex items-center gap-1 active:scale-95"
                    title="Перерисовать (новый случайный порядок)"
                  >
                    <RefreshCw className="w-3 h-3" /> Ещё раз
                  </button>
                  <button
                    onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                    className="p-1 text-xs bg-gray-100 text-gray-700 rounded-lg"
                    title="Приблизить"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
                    className="p-1 text-xs bg-gray-100 text-gray-700 rounded-lg"
                    title="Отдалить"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={resetView}
                    className="p-1 text-xs bg-gray-100 text-gray-700 rounded-lg"
                    title="Сбросить вид"
                  >
                    <ResetIcon className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono text-gray-500 w-10 text-right">{(zoom * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div className="border-2 border-gray-200 rounded-xl overflow-hidden" style={{ height: '320px' }}>
                {renderPreview(true)}
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-1.5">
                🖱️ Перетаскивайте для перемещения · колесо мыши для масштаба
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button onClick={handleDemo} className="py-1.5 text-xs bg-purple-50 text-purple-700 rounded-lg font-semibold flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3" /> Демо-текст
                </button>
                <button onClick={handleClear} className="py-1.5 text-xs bg-red-50 text-red-600 rounded-lg font-semibold flex items-center justify-center gap-1">
                  <Trash2 className="w-3 h-3" /> Очистить
                </button>
              </div>
            </div>

            {/* Текст */}
            <div className="bg-white rounded-2xl p-3 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-purple-700">Текст</label>
                <div className="flex gap-1 items-center">
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
                  <input ref={fileInputRef} type="file" accept=".txt,.csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
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
                <button onClick={() => handleExportPNG(1)} className="py-2 rounded-xl bg-purple-50 text-purple-700 text-xs font-semibold flex flex-col items-center gap-1">
                  <ImageIcon className="w-4 h-4" /> PNG 1×
                </button>
                <button onClick={() => handleExportPNG(2)} className="py-2 rounded-xl bg-purple-50 text-purple-700 text-xs font-semibold flex flex-col items-center gap-1">
                  <ImageIcon className="w-4 h-4" /> PNG 2×
                </button>
                <button onClick={() => handleExportPNG(4)} className="py-2 rounded-xl bg-purple-50 text-purple-700 text-xs font-semibold flex flex-col items-center gap-1">
                  <ImageIcon className="w-4 h-4" /> PNG 4K
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleExportSVG} className="py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-semibold flex items-center justify-center gap-1">
                  <FileDown className="w-4 h-4" /> SVG
                </button>
                <button onClick={handleExportJSON} className="py-2 rounded-xl bg-green-50 text-green-700 text-xs font-semibold flex items-center justify-center gap-1">
                  <Save className="w-4 h-4" /> JSON
                </button>
              </div>
              <label className="block py-1.5 border border-dashed border-gray-300 rounded-lg text-center text-xs text-gray-500 cursor-pointer hover:bg-gray-50">
                <input ref={jsonInputRef} type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
                📁 Загрузить проект
              </label>
            </div>
          </div>

          {/* ПРАВАЯ КОЛОНКА: компактные вертикальные модули */}
          <div className="space-y-2">
            {/* Форма + углы */}
            <div className="bg-white rounded-2xl p-2.5 shadow-sm space-y-2">
              <div className="flex items-center gap-1">
                <Settings2 className="w-3.5 h-3.5 text-purple-600" />
                <label className="text-xs font-bold text-purple-700">Форма и расположение</label>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {(['circle', 'heart', 'star', 'diamond', 'rectangle'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => updateSettings({ shape: s })}
                    className={`py-1.5 rounded-lg text-sm font-semibold border ${settings.shape === s ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}
                    title={s}
                  >
                    {s === 'circle' ? '●' : s === 'heart' ? '♥' : s === 'star' ? '★' : s === 'diamond' ? '◆' : '▬'}
                  </button>
                ))}
              </div>
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

            {/* Шрифт + размер + фон */}
            <div className="bg-white rounded-2xl p-2.5 shadow-sm space-y-2">
              <div className="flex items-center gap-1">
                <Type className="w-3.5 h-3.5 text-purple-600" />
                <label className="text-xs font-bold text-purple-700">Шрифт и размер</label>
              </div>
              <select
                value={settings.fontFamily}
                onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                className="w-full rounded-lg border border-gray-200 p-1.5 text-xs bg-white"
              >
                <optgroup label="Системные">
                  {FONTS.map((f) => (
                    <option key={f} value={f}>{f.split(',')[0].replace(/"/g, '')}</option>
                  ))}
                </optgroup>
                <optgroup label="Google Fonts">
                  {GOOGLE_FONTS.map((f) => (
                    <option key={f} value={`"${f}", sans-serif`}>{f}</option>
                  ))}
                </optgroup>
              </select>
              <div>
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-gray-500">Мин. размер</label>
                  <span className="text-[10px] font-mono text-purple-700">{settings.minFont}px</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={48}
                  step={1}
                  value={settings.minFont}
                  onChange={(e) => updateSettings({ minFont: Math.min(Number(e.target.value), settings.maxFont - 4) })}
                  className="w-full accent-purple-600"
                />
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-gray-500">Макс. размер</label>
                  <span className="text-[10px] font-mono text-purple-700">{settings.maxFont}px</span>
                </div>
                <input
                  type="range"
                  min={24}
                  max={180}
                  step={2}
                  value={settings.maxFont}
                  onChange={(e) => updateSettings({ maxFont: Math.max(Number(e.target.value), settings.minFont + 4) })}
                  className="w-full accent-purple-600"
                />
              </div>
            </div>

            {/* Фон */}
            <div className="bg-white rounded-2xl p-2.5 shadow-sm space-y-2">
              <label className="text-xs font-bold text-purple-700">Фон</label>
              <div className="grid grid-cols-4 gap-1">
                {['#ffffff', '#000000', '#f3f4f6', 'transparent'].map((c) => (
                  <button
                    key={c}
                    onClick={() => updateSettings({ backgroundColor: c })}
                    className={`h-7 rounded-lg border-2 ${settings.backgroundColor === c ? 'border-purple-500' : 'border-gray-200'}`}
                    style={{
                      background: c === 'transparent' ? 'repeating-conic-gradient(#e5e7eb 0% 25%, #fff 0% 50%) 50% / 8px 8px' : c,
                    }}
                    title={c === 'transparent' ? 'Прозрачный' : c}
                  />
                ))}
              </div>
            </div>

            {/* Палитра */}
            <div className="bg-white rounded-2xl p-2.5 shadow-sm space-y-2">
              <div className="flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-purple-600" />
                <label className="text-xs font-bold text-purple-700">Палитра</label>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(PALETTES).map(([name, colors]) => (
                  <button
                    key={name}
                    onClick={() => updateSettings({ palette: name })}
                    className={`p-1 rounded-lg border ${settings.palette === name ? 'border-purple-500' : 'border-gray-200'}`}
                  >
                    <div className="flex gap-0.5 h-3">
                      {colors.map((c, i) => (
                        <div key={i} className="flex-1 rounded" style={{ background: c }} />
                      ))}
                    </div>
                    <p className="text-[9px] text-gray-600 mt-0.5 capitalize">{name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Плотность и лимит */}
            <div className="bg-white rounded-2xl p-2.5 shadow-sm space-y-2">
              <div>
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-gray-500">Плотность</label>
                  <span className="text-[10px] font-mono text-purple-700">{settings.density.toFixed(1)}</span>
                </div>
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
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-gray-500">Максимум слов</label>
                  <span className="text-[10px] font-mono text-purple-700">{settings.maxWords}</span>
                </div>
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
            <div className="bg-white rounded-2xl p-2.5 shadow-sm space-y-1">
              <label className="text-xs font-bold text-purple-700">Стоп-слова</label>
              <textarea
                value={project.stopWords}
                onChange={(e) => update({ stopWords: e.target.value })}
                placeholder="и в во не что..."
                rows={2}
                className="w-full rounded-lg border border-gray-200 p-1.5 text-[10px] focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <button
                onClick={() => update({ stopWords: DEFAULT_STOP_WORDS })}
                className="w-full py-1 text-[10px] bg-gray-50 text-gray-600 rounded-lg font-semibold"
              >
                Сбросить список
              </button>
            </div>

            {/* Статистика */}
            <div className="bg-white rounded-2xl p-2.5 shadow-sm">
              <div className="flex items-center gap-1 mb-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
                <label className="text-xs font-bold text-purple-700">Топ-10 слов</label>
              </div>
              <div className="space-y-1">
                {wordsData.slice(0, 10).map((w, i) => {
                  const max = wordsData[0]?.count || 1;
                  return (
                    <div key={w.word} className="flex items-center gap-1.5 text-[10px]">
                      <span className="w-3 text-gray-400">{i + 1}</span>
                      <span className="flex-1 truncate font-semibold text-gray-700">{w.word}</span>
                      <div className="flex-1 h-1 bg-gray-100 rounded overflow-hidden">
                        <div className="h-full bg-purple-400" style={{ width: `${(w.count / max) * 100}%` }} />
                      </div>
                      <span className="w-5 text-right text-gray-500">{w.count}</span>
                    </div>
                  );
                })}
                {wordsData.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Нет данных</p>}
              </div>
            </div>
          </div>
        </div>

        {/* АККОРДЕОН FAQ */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowFaq(!showFaq)}
            className="w-full px-4 py-3 flex items-center justify-between gap-2"
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

        {/* АККОРДЕОН СЦЕНАРИИ */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowScen(!showScen)}
            className="w-full px-4 py-3 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-700">Сценарии использования</h3>
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

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[10px] text-amber-900">
          <b>Приватность:</b> весь текст и настройки хранятся локально в браузере, данные никуда не отправляются.
        </div>
      </main>
    </div>
  );
}
