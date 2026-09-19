import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Contact,
  Plus,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Printer,
  Image as ImageIcon,
  Download,
  Save,
  FolderOpen,
  ListPlus,
  Type,
  Palette,
  LayoutTemplate,
  FileJson,
  Upload,
  X,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Trophy,
  Hash,
} from 'lucide-react';
import BackButton from './BackButton';
import { triggerHaptic } from '@/lib/haptic';
import { ConfirmDialog, AlertDialog } from './ConfirmDialog';

// ===== Типы =====

interface CardItem {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  footer: string;
  emoji: string;
  imageUrl: string;
  imageFit: 'cover' | 'contain';
}

type BgType = 'solid' | 'gradient' | 'pattern';
type PatternId = 'none' | 'dots' | 'grid' | 'lines' | 'diagonal';
type ImagePos = 'none' | 'top' | 'left' | 'right' | 'bg';
type AspectId = '1:1' | '3:4' | '4:3' | '2:3' | '3:2';
type PageId = 'a4p' | 'a4l' | 'a5p' | 'a5l';

interface MakerSettings {
  theme: string;
  bgType: BgType;
  bgColor1: string;
  bgColor2: string;
  gradientAngle: number;
  pattern: PatternId;
  patternColor: string;
  borderStyle: 'none' | 'solid' | 'double' | 'dashed' | 'dotted';
  borderWidth: number;
  borderColor: string;
  borderRadius: number;
  innerFrame: boolean;
  fontFamily: string;
  titleSize: number;
  titleBold: boolean;
  titleUpper: boolean;
  titleColor: string;
  titleAlign: 'left' | 'center' | 'right';
  bodySize: number;
  bodyColor: string;
  lineHeight: number;
  imagePos: ImagePos;
  imageSize: number;
  aspect: AspectId;
  shadow: boolean;
  showNumber: boolean;
  pageFormat: PageId;
  perPage: number;
  gap: number;
  margin: number;
  cutMarks: boolean;
  duplex: boolean;
  backText: string;
  backPattern: boolean;
  exportScale: number;
}

interface Project {
  id: string;
  name: string;
  cards: CardItem[];
  settings: MakerSettings;
  createdAt: number;
}

interface ConfirmState {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  action: () => void;
}

// ===== Константы =====

const CURRENT_KEY = 'cardmaker-current';
const PROJECTS_KEY = 'cardmaker-projects';

const ASPECTS: Record<AspectId, number> = { '1:1': 1, '3:4': 0.75, '4:3': 1.3333, '2:3': 0.6667, '3:2': 1.5 };
const PAGES: Record<PageId, [number, number]> = { a4p: [210, 297], a4l: [297, 210], a5p: [148, 210], a5l: [210, 148] };
const COLS: Record<number, number> = { 1: 1, 2: 2, 4: 2, 6: 2, 8: 2, 9: 3, 12: 3 };

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

const EMOJIS = ['📚','️','🧮','🔬','🌍','🎨','','⚽','🧩','','⭐','❤️','','🍎','🦋','','🌸','','❄️','☀️','🌈','🔥','💧','🌱','','🚀','','','💡','','','✂️','','🦉','🐬','','🎲','','📖','️','🎭','🗺️','⚙️','','🔭','🎧','','🐞','🌻'];

const DEFAULT_SETTINGS: MakerSettings = {
  theme: 'classic',
  bgType: 'solid', bgColor1: '#ffffff', bgColor2: '#f3e8ff', gradientAngle: 135,
  pattern: 'dots', patternColor: '#e9d5ff',
  borderStyle: 'solid', borderWidth: 3, borderColor: '#7c3aed', borderRadius: 14, innerFrame: true,
  fontFamily: 'Georgia, serif',
  titleSize: 20, titleBold: true, titleUpper: false, titleColor: '#4c1d95', titleAlign: 'center',
  bodySize: 13, bodyColor: '#374151', lineHeight: 1.45,
  imagePos: 'top', imageSize: 38,
  aspect: '3:4', shadow: true, showNumber: false,
  pageFormat: 'a4p', perPage: 6, gap: 4, margin: 8, cutMarks: true, duplex: false,
  backText: 'Помощник учителя', backPattern: true,
  exportScale: 3,
};

const THEMES: { id: string; name: string; patch: Partial<MakerSettings> }[] = [
  { id: 'classic', name: 'Классика', patch: { bgType: 'solid', bgColor1: '#ffffff', bgColor2: '#ffffff', pattern: 'none', borderStyle: 'solid', borderWidth: 3, borderColor: '#7c3aed', borderRadius: 14, innerFrame: true, fontFamily: 'Georgia, serif', titleColor: '#4c1d95', bodyColor: '#374151', titleUpper: false } },
  { id: 'pastel', name: 'Пастель', patch: { bgType: 'gradient', bgColor1: '#fdf2f8', bgColor2: '#ede9fe', gradientAngle: 135, pattern: 'none', borderStyle: 'solid', borderWidth: 2, borderColor: '#f9a8d4', borderRadius: 22, innerFrame: false, fontFamily: 'Verdana, sans-serif', titleColor: '#9d174d', bodyColor: '#6b7280', titleUpper: false } },
  { id: 'bright', name: 'Яркий', patch: { bgType: 'solid', bgColor1: '#fef08a', bgColor2: '#fef08a', pattern: 'none', borderStyle: 'double', borderWidth: 4, borderColor: '#ea580c', borderRadius: 10, innerFrame: false, fontFamily: 'Impact, sans-serif', titleColor: '#9a3412', bodyColor: '#431407', titleUpper: true } },
  { id: 'dark', name: 'Тёмный', patch: { bgType: 'gradient', bgColor1: '#111827', bgColor2: '#312e81', gradientAngle: 160, pattern: 'none', borderStyle: 'solid', borderWidth: 2, borderColor: '#a78bfa', borderRadius: 16, innerFrame: true, fontFamily: 'Verdana, sans-serif', titleColor: '#f9fafb', bodyColor: '#d1d5db', titleUpper: false } },
  { id: 'chalk', name: 'Доска', patch: { bgType: 'solid', bgColor1: '#14532d', bgColor2: '#14532d', pattern: 'none', borderStyle: 'dashed', borderWidth: 3, borderColor: '#fef9c3', borderRadius: 8, innerFrame: false, fontFamily: '"Comic Sans MS", cursive', titleColor: '#fef9c3', bodyColor: '#ecfccb', titleUpper: false } },
  { id: 'note', name: 'В клетку', patch: { bgType: 'pattern', bgColor1: '#ffffff', bgColor2: '#ffffff', pattern: 'grid', patternColor: '#bfdbfe', borderStyle: 'solid', borderWidth: 2, borderColor: '#3b82f6', borderRadius: 6, innerFrame: false, fontFamily: '"Courier New", monospace', titleColor: '#1e3a8a', bodyColor: '#334155', titleUpper: false } },
  { id: 'sunset', name: 'Закат', patch: { bgType: 'gradient', bgColor1: '#fb7185', bgColor2: '#fbbf24', gradientAngle: 120, pattern: 'none', borderStyle: 'solid', borderWidth: 3, borderColor: '#ffffff', borderRadius: 26, innerFrame: true, fontFamily: 'Trebuchet MS, sans-serif', titleColor: '#ffffff', bodyColor: '#fff7ed', titleUpper: false } },
  { id: 'mono', name: 'Монохром', patch: { bgType: 'solid', bgColor1: '#ffffff', bgColor2: '#ffffff', pattern: 'none', borderStyle: 'solid', borderWidth: 1, borderColor: '#111827', borderRadius: 0, innerFrame: false, fontFamily: '"Times New Roman", serif', titleColor: '#111827', bodyColor: '#111827', titleUpper: true } },
];

const DEFAULT_CARDS: CardItem[] = [
  { id: 'c1', title: 'Фотосинтез', subtitle: 'Биология, 6 класс', body: 'Процесс образования органических веществ из углекислого газа и воды на свету.', footer: 'Карточка 1', emoji: '🌱', imageUrl: '', imageFit: 'cover' },
  { id: 'c2', title: 'Глагол', subtitle: 'Русский язык', body: 'Часть речи, обозначающая действие предмета.', footer: 'Карточка 2', emoji: '✏️', imageUrl: '', imageFit: 'cover' },
  { id: 'c3', title: 'Square', subtitle: 'English · Shapes', body: 'A shape with four equal sides and four right angles.', footer: 'Card 3', emoji: '🟦', imageUrl: '', imageFit: 'cover' },
  { id: 'c4', title: '7 × 8', subtitle: 'Математика · Таблица', body: '= 56', footer: 'Карточка 4', emoji: '🧮', imageUrl: '', imageFit: 'cover' },
];

const FAQ_ITEMS = [
  { q: 'Как быстро создать много карточек?', a: 'Кнопка «Пакетный ввод»: каждая строка — одна карточка в формате «Заголовок | Текст | Эмодзи». Например: «Столица Франции | Париж | 🗼». Карточки добавятся в конец колоды одним действием.' },
  { q: 'Как добавить своё изображение?', a: 'В редакторе карточки кнопка «Загрузить фото» (файл с устройства) или поле ссылки на картинку. Режим вписывания: «заполнить» или «целиком». Позицию картинки (сверху, слева, справа, фоном) задайте в блоке «Макет».' },
  { q: 'Что делает двусторонняя печать?', a: 'После страниц с лицевой стороной добавляются страницы рубашек (узор + надпись). Напечатайте лица, переверните стопку в лотке принтера и напечатайте рубашки — карточки станут двусторонними.' },
  { q: 'Зачем нужны метки реза?', a: 'Пунктирные направляющие вокруг каждой карточки на листе: по ним удобно резать гильотиной или ножницами. Отключаются тумблером, если мешают.' },
  { q: 'Как получить картинку карточки для презентации?', a: 'Кнопка «PNG» под предпросмотром скачивает карточку в высоком разрешении (масштаб 2×–4×). «PNG все» скачивает всю колоду по одной карточке за файл.' },
  { q: 'Сохраняются ли мои карточки?', a: 'Да: текущая колода и все настройки сохраняются автоматически. Кнопка «Сохранить копию» создаёт именованный проект в списке — можно вести отдельные колоды по классам и темам.' },
];

const SCENARIO_ITEMS = [
  { icon: '🔤', title: 'Слова на карточках для английского', description: 'Колода «слово | перевод | картинка-эмодзи»: раздайте парам для игры в «найди пару» или используйте как раздаточный материал для повторения лексики.' },
  { icon: '🧮', title: 'Математические карточки-минутки', description: 'На лице пример, на рубашке (двусторонняя печать) — ответ. Ученик решает, переворачивает и проверяет себя: самостоятельная тренировка без учителя.' },
  { icon: '🏷️', title: 'Подписи для кабинета и стендов', description: 'Крупный шрифт, рамка и метки реза: карточки-таблички «Дежурный», «Расписание», названия полок и зон кабинета печатаются за минуту.' },
  { icon: '🎲', title: 'Карточки для игр и станций', description: 'Задания для станционной ротации или настольной игры урока: тема «Яркий» с рамкой double и нумерацией превращает список заданий в игровую колоду.' },
  { icon: '🖼️', title: 'Наглядность по теме урока', description: 'Загрузите фото (опыт, карта, портрет) и добавьте подпись: комплект наглядных карточек для доски или раздачи вместо распечатки учебника.' },
];

// ===== Утилиты =====

function uid(): string {
  return `c-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function loadCurrent(): { cards: CardItem[]; settings: MakerSettings } {
  try {
    const raw = localStorage.getItem(CURRENT_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (Array.isArray(p.cards) && p.cards.length) {
        return { cards: p.cards, settings: { ...DEFAULT_SETTINGS, ...(p.settings || {}) } };
      }
    }
  } catch {}
  return { cards: DEFAULT_CARDS, settings: DEFAULT_SETTINGS };
}

function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch {}
  return [];
}

function persistProjects(list: Project[]) {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
  } catch {}
}

function cssBg(s: MakerSettings): { backgroundColor?: string; backgroundImage?: string; backgroundSize?: string } {
  if (s.bgType === 'solid') return { backgroundColor: s.bgColor1 };
  if (s.bgType === 'gradient') return { backgroundImage: `linear-gradient(${s.gradientAngle}deg, ${s.bgColor1}, ${s.bgColor2})` };
  const c = s.patternColor;
  const base = s.bgColor1;
  switch (s.pattern) {
    case 'dots': return { backgroundColor: base, backgroundImage: `radial-gradient(${c} 1.5px, transparent 1.6px)`, backgroundSize: '14px 14px' };
    case 'grid': return { backgroundColor: base, backgroundImage: `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`, backgroundSize: '16px 16px' };
    case 'lines': return { backgroundColor: base, backgroundImage: `linear-gradient(${c} 1.5px, transparent 1.5px)`, backgroundSize: '100% 12px' };
    case 'diagonal': return { backgroundColor: base, backgroundImage: `repeating-linear-gradient(45deg, ${c} 0 2px, transparent 2px 12px)` };
    default: return { backgroundColor: base };
  }
}

function bgStyleStr(s: MakerSettings): string {
  const b = cssBg(s);
  let out = '';
  if (b.backgroundColor) out += `background-color:${b.backgroundColor};`;
  if (b.backgroundImage) out += `background-image:${b.backgroundImage};`;
  if (b.backgroundSize) out += `background-size:${b.backgroundSize};`;
  return out;
}

function esc(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ===== Печать: HTML карточки и рубашки =====

function cardPrintHtml(card: CardItem, s: MakerSettings, idx: number): string {
  const border = s.borderStyle !== 'none' ? `border:${s.borderWidth}px ${s.borderStyle} ${s.borderColor};` : '';
  const dir = s.imagePos === 'left' ? 'row' : s.imagePos === 'right' ? 'row-reverse' : 'column';
  const hasImg = Boolean(card.imageUrl || card.emoji);
  const imgSlot = s.imagePos !== 'none' && s.imagePos !== 'bg' && hasImg
    ? `<div style="${s.imagePos === 'top' ? `height:${s.imageSize}%;width:100%;` : `width:${s.imageSize}%;height:100%;`}padding:4px;box-sizing:border-box;">${
        card.imageUrl
          ? `<img src="${card.imageUrl}" style="width:100%;height:100%;object-fit:${card.imageFit};"/>`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:34px;">${card.emoji}</div>`
      }</div>`
    : '';
  const bgLayer = s.imagePos === 'bg' && card.imageUrl
    ? `<img src="${card.imageUrl}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:${card.imageFit};"/>`
    : s.imagePos === 'bg' && card.emoji
      ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:60px;opacity:.25;">${card.emoji}</div>`
      : '';
  const panel = s.imagePos === 'bg' ? 'background:rgba(255,255,255,.85);border-radius:8px;margin:8%;padding:6px;' : '';
  return `<div style="position:relative;width:100%;height:100%;box-sizing:border-box;overflow:hidden;${bgStyleStr(s)}${border}border-radius:${s.borderRadius}px;font-family:${s.fontFamily};display:flex;flex-direction:${dir};">
    ${bgLayer}
    ${s.innerFrame ? `<div style="position:absolute;inset:${s.borderWidth + 4}px;border:1px solid ${s.borderColor};border-radius:${Math.max(0, s.borderRadius - 6)}px;opacity:.5;"></div>` : ''}
    ${s.showNumber ? `<div style="position:absolute;top:4px;left:4px;width:18px;height:18px;border-radius:50%;background:${s.borderColor};color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;">${idx + 1}</div>` : ''}
    ${imgSlot}
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:2px;padding:6px;text-align:${s.titleAlign};${panel}">
      ${card.title ? `<div style="font-size:${s.titleSize}px;font-weight:${s.titleBold ? 700 : 400};color:${s.titleColor};text-transform:${s.titleUpper ? 'uppercase' : 'none'};line-height:1.15;">${esc(card.title)}</div>` : ''}
      ${card.subtitle ? `<div style="font-size:${Math.round(s.bodySize * 0.9)}px;font-style:italic;color:${s.bodyColor};opacity:.8;">${esc(card.subtitle)}</div>` : ''}
      ${card.body ? `<div style="font-size:${s.bodySize}px;color:${s.bodyColor};line-height:${s.lineHeight};white-space:pre-wrap;">${esc(card.body)}</div>` : ''}
      ${card.footer ? `<div style="margin-top:auto;font-size:${Math.round(s.bodySize * 0.75)}px;color:${s.bodyColor};opacity:.6;text-align:center;">${esc(card.footer)}</div>` : ''}
    </div>
  </div>`;
}

function backPrintHtml(s: MakerSettings): string {
  const border = s.borderStyle !== 'none' ? `border:${s.borderWidth}px ${s.borderStyle} ${s.borderColor};` : '';
  const bg = s.backPattern ? cssBg(s) : { backgroundColor: s.bgColor1 };
  let bgStr = '';
  if (bg.backgroundColor) bgStr += `background-color:${bg.backgroundColor};`;
  if (s.backPattern && bg.backgroundImage) bgStr += `background-image:${bg.backgroundImage};`;
  if (s.backPattern && bg.backgroundSize) bgStr += `background-size:${bg.backgroundSize};`;
  return `<div style="position:relative;width:100%;height:100%;box-sizing:border-box;overflow:hidden;${bgStr}${border}border-radius:${s.borderRadius}px;display:flex;align-items:center;justify-content:center;font-family:${s.fontFamily};">
    <div style="font-size:${Math.max(10, s.titleSize * 0.8)}px;font-weight:700;color:${s.titleColor};opacity:.85;text-align:center;padding:8px;">${esc(s.backText)}</div>
  </div>`;
}

// ===== PNG-экспорт через canvas =====

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });
}

function drawImgFit(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, fit: 'cover' | 'contain') {
  const ir = img.width / img.height;
  const r = w / h;
  let dw: number, dh: number;
  if (fit === 'cover') {
    if (ir > r) { dh = h; dw = h * ir; } else { dw = w; dh = w / ir; }
  } else {
    if (ir > r) { dw = w; dh = w / ir; } else { dh = h; dw = h * ir; }
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const raw of text.split('\n')) {
    const words = raw.split(/\s+/);
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t;
    }
    out.push(cur);
  }
  return out.filter((l, i) => l !== '' || i === 0);
}

async function drawCardCanvas(card: CardItem, s: MakerSettings, idx: number): Promise<HTMLCanvasElement> {
  const scale = s.exportScale || 3;
  const W = 300 * scale;
  const H = Math.round(W / (ASPECTS[s.aspect] || 1));
  const k = W / 300;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no ctx');

  const rad = s.borderRadius * k;

  // Фон
  ctx.save();
  rr(ctx, 0, 0, W, H, rad);
  ctx.clip();
  if (s.bgType === 'solid') {
    ctx.fillStyle = s.bgColor1;
    ctx.fillRect(0, 0, W, H);
  } else if (s.bgType === 'gradient') {
    const a = (s.gradientAngle * Math.PI) / 180;
    const cx = W / 2, cy = H / 2;
    const len = Math.abs(W * Math.sin(a)) + Math.abs(H * Math.cos(a));
    const g = ctx.createLinearGradient(cx - Math.sin(a) * len / 2, cy - Math.cos(a) * len / 2, cx + Math.sin(a) * len / 2, cy + Math.cos(a) * len / 2);
    g.addColorStop(0, s.bgColor1);
    g.addColorStop(1, s.bgColor2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = s.bgColor1;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = s.patternColor;
    ctx.strokeStyle = s.patternColor;
    if (s.pattern === 'dots') {
      for (let y = 7 * k; y < H; y += 14 * k) for (let x = 7 * k; x < W; x += 14 * k) { ctx.beginPath(); ctx.arc(x, y, 1.5 * k, 0, Math.PI * 2); ctx.fill(); }
    } else if (s.pattern === 'grid') {
      ctx.lineWidth = 1 * k;
      for (let x = 0; x < W; x += 16 * k) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 16 * k) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    } else if (s.pattern === 'lines') {
      ctx.lineWidth = 1.5 * k;
      for (let y = 0; y < H; y += 12 * k) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    } else if (s.pattern === 'diagonal') {
      ctx.lineWidth = 2 * k;
      for (let d = -H; d < W + H; d += 12 * k) { ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d + H, H); ctx.stroke(); }
    }
  }

  // Изображение фоном
  let img: HTMLImageElement | null = null;
  if (card.imageUrl) img = await loadImg(card.imageUrl);
  if (s.imagePos === 'bg' && img) {
    drawImgFit(ctx, img, 0, 0, W, H, card.imageFit === 'cover' ? 'cover' : 'cover');
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    rr(ctx, W * 0.08, H * 0.08, W * 0.84, H * 0.84, 8 * k);
    ctx.fill();
  } else if (s.imagePos === 'bg' && card.emoji) {
    ctx.globalAlpha = 0.25;
    ctx.font = `${60 * k}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(card.emoji, W / 2, H / 2);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // Область текста и слот изображения
  const pad = 6 * k;
  let tx = pad, ty = pad, tw = W - pad * 2, th = H - pad * 2;
  if (s.imagePos !== 'none' && s.imagePos !== 'bg' && (img || card.emoji)) {
    const pct = s.imageSize / 100;
    if (s.imagePos === 'top') {
      const sh = H * pct;
      if (img) drawImgFit(ctx, img, pad, pad, W - pad * 2, sh - pad, card.imageFit);
      else if (card.emoji) { ctx.font = `${(sh - pad) * 0.65}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(card.emoji, W / 2, pad + (sh - pad) / 2); }
      ty = sh; th = H - sh - pad;
    } else if (s.imagePos === 'left') {
      const sw = W * pct;
      if (img) drawImgFit(ctx, img, pad, pad, sw - pad, H - pad * 2, card.imageFit);
      else if (card.emoji) { ctx.font = `${(sw - pad) * 0.6}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(card.emoji, pad + (sw - pad) / 2, H / 2); }
      tx = sw; tw = W - sw - pad;
    } else if (s.imagePos === 'right') {
      const sw = W * pct;
      if (img) drawImgFit(ctx, img, W - sw, pad, sw - pad, H - pad * 2, card.imageFit);
      else if (card.emoji) { ctx.font = `${(sw - pad) * 0.6}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(card.emoji, W - sw + (sw - pad) / 2, H / 2); }
      tw = W - sw - pad;
    }
  }

  // Текст
  if (s.imagePos === 'bg') { tx = W * 0.1; ty = H * 0.1; tw = W * 0.8; th = H * 0.8; }
  const alignX = s.titleAlign === 'left' ? tx : s.titleAlign === 'right' ? tx + tw : tx + tw / 2;
  ctx.textAlign = s.titleAlign as CanvasTextAlign;
  ctx.textBaseline = 'top';
  let y = ty + 4 * k;
  const maxW = tw - 8 * k;

  if (card.title) {
    ctx.font = `${s.titleBold ? 'bold ' : ''}${s.titleSize * k}px ${s.fontFamily}`;
    ctx.fillStyle = s.titleColor;
    const lines = wrapText(ctx, s.titleUpper ? card.title.toUpperCase() : card.title, maxW);
    for (const l of lines) { ctx.fillText(l, alignX, y); y += s.titleSize * k * 1.15; }
    y += 3 * k;
  }
  if (card.subtitle) {
    ctx.font = `italic ${Math.round(s.bodySize * 0.9) * k}px ${s.fontFamily}`;
    ctx.fillStyle = s.bodyColor;
    ctx.globalAlpha = 0.8;
    for (const l of wrapText(ctx, card.subtitle, maxW)) { ctx.fillText(l, alignX, y); y += s.bodySize * k * 1.2; }
    ctx.globalAlpha = 1;
    y += 2 * k;
  }
  if (card.body) {
    ctx.font = `${s.bodySize * k}px ${s.fontFamily}`;
    ctx.fillStyle = s.bodyColor;
    for (const l of wrapText(ctx, card.body, maxW)) { ctx.fillText(l, alignX, y); y += s.bodySize * k * s.lineHeight; }
  }
  if (card.footer) {
    ctx.font = `${Math.round(s.bodySize * 0.75) * k}px ${s.fontFamily}`;
    ctx.fillStyle = s.bodyColor;
    ctx.globalAlpha = 0.6;
    ctx.textAlign = 'center';
    ctx.fillText(card.footer, tx + tw / 2, ty + th - s.bodySize * k);
    ctx.globalAlpha = 1;
  }

  // Номер
  if (s.showNumber) {
    ctx.fillStyle = s.borderColor;
    ctx.beginPath();
    ctx.arc(14 * k, 14 * k, 11 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${12 * k}px ${s.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(idx + 1), 14 * k, 14 * k + 1);
  }

  // Рамки
  if (s.borderStyle !== 'none') {
    const bw = s.borderWidth * k;
    ctx.strokeStyle = s.borderColor;
    ctx.lineWidth = bw;
    if (s.borderStyle === 'dashed') ctx.setLineDash([bw * 3, bw * 2]);
    if (s.borderStyle === 'dotted') ctx.setLineDash([bw, bw * 1.6]);
    rr(ctx, bw / 2, bw / 2, W - bw, H - bw, Math.max(0, rad - bw / 2));
    ctx.stroke();
    if (s.borderStyle === 'double') {
      ctx.setLineDash([]);
      rr(ctx, bw * 2.5, bw * 2.5, W - bw * 5, H - bw * 5, Math.max(0, rad - bw * 2.5));
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  if (s.innerFrame) {
    const ins = (s.borderWidth + 4) * k;
    ctx.strokeStyle = s.borderColor;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1 * k;
    rr(ctx, ins, ins, W - ins * 2, H - ins * 2, Math.max(0, rad - ins));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  return canvas;
}

// ===== Предпросмотр карточки =====

function CardView({ card, s, index, compact }: { card: CardItem; s: MakerSettings; index: number; compact?: boolean }) {
  const bg = cssBg(s);
  const ratio = ASPECTS[s.aspect] || 1;
  const dir = s.imagePos === 'left' ? 'row' : s.imagePos === 'right' ? 'row-reverse' : 'column';
  const hasImg = Boolean(card.imageUrl || card.emoji);

  if (compact) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center gap-1 overflow-hidden"
        style={{ ...bg, border: s.borderStyle !== 'none' ? `${Math.max(1, s.borderWidth - 1)}px ${s.borderStyle} ${s.borderColor}` : 'none', borderRadius: Math.max(4, s.borderRadius / 2), fontFamily: s.fontFamily }}
      >
        {(card.emoji || card.imageUrl) && (card.imageUrl ? <img src={card.imageUrl} className="w-6 h-6 object-cover rounded" alt="" /> : <span className="text-lg leading-none">{card.emoji}</span>)}
        <span className="text-[9px] font-semibold text-center leading-tight line-clamp-2 px-1" style={{ color: s.titleColor }}>{card.title || '—'}</span>
      </div>
    );
  }

  const imgSlot = s.imagePos !== 'none' && s.imagePos !== 'bg' && hasImg ? (
    <div style={s.imagePos === 'top' ? { height: `${s.imageSize}%`, width: '100%', padding: 6, boxSizing: 'border-box' } : { width: `${s.imageSize}%`, height: '100%', padding: 6, boxSizing: 'border-box' }}>
      {card.imageUrl ? (
        <img src={card.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: card.imageFit, borderRadius: Math.max(0, s.borderRadius - 6) }} />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>{card.emoji}</div>
      )}
    </div>
  ) : null;

  return (
    <div
      className="relative w-full overflow-hidden flex"
      style={{
        aspectRatio: `${ratio}`,
        ...bg,
        border: s.borderStyle !== 'none' ? `${s.borderWidth}px ${s.borderStyle} ${s.borderColor}` : 'none',
        borderRadius: s.borderRadius,
        boxShadow: s.shadow ? '0 4px 14px rgba(0,0,0,.18)' : undefined,
        flexDirection: dir,
        fontFamily: s.fontFamily,
      }}
    >
      {s.imagePos === 'bg' && card.imageUrl && (
        <img src={card.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      {s.imagePos === 'bg' && !card.imageUrl && card.emoji && (
        <div className="absolute inset-0 flex items-center justify-center opacity-25" style={{ fontSize: 60 }}>{card.emoji}</div>
      )}
      {s.imagePos === 'bg' && <div className="absolute inset-0" style={{ background: 'rgba(255,255,255,0.0)' }} />}
      {s.innerFrame && (
        <div className="absolute pointer-events-none" style={{ inset: s.borderWidth + 4, border: `1px solid ${s.borderColor}`, borderRadius: Math.max(0, s.borderRadius - 6), opacity: 0.5 }} />
      )}
      {s.showNumber && (
        <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold z-10" style={{ background: s.borderColor }}>
          {index + 1}
        </div>
      )}
      {imgSlot}
      <div
        className="flex-1 min-w-0 flex flex-col justify-center gap-1"
        style={{
          padding: 10,
          textAlign: s.titleAlign,
          ...(s.imagePos === 'bg' ? { background: 'rgba(255,255,255,.85)', borderRadius: 8, margin: '10%', padding: 8 } : {}),
        }}
      >
        {card.title && (
          <div style={{ fontSize: s.titleSize, fontWeight: s.titleBold ? 700 : 400, color: s.titleColor, textTransform: s.titleUpper ? 'uppercase' : 'none', lineHeight: 1.15 }}>
            {card.title}
          </div>
        )}
        {card.subtitle && (
          <div style={{ fontSize: Math.round(s.bodySize * 0.9), fontStyle: 'italic', color: s.bodyColor, opacity: 0.8 }}>{card.subtitle}</div>
        )}
        {card.body && (
          <div style={{ fontSize: s.bodySize, color: s.bodyColor, lineHeight: s.lineHeight, whiteSpace: 'pre-wrap' }}>{card.body}</div>
        )}
        {card.footer && (
          <div className="mt-auto text-center" style={{ fontSize: Math.round(s.bodySize * 0.75), color: s.bodyColor, opacity: 0.6 }}>{card.footer}</div>
        )}
      </div>
    </div>
  );
}

// ===== Мини-компоненты настроек =====

function Num({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] text-gray-500 mb-0.5">
        <span>{label}</span>
        <span className="font-mono text-purple-700">{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step || 1} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-purple-600" />
    </div>
  );
}

function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-gray-600">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-7 h-7 rounded cursor-pointer border border-gray-200 p-0.5 bg-white" />
      {label}
    </label>
  );
}

function Sel<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <label className="block text-[11px] text-gray-600">
      <span className="block mb-0.5">{label}</span>
      <select value={String(value)} onChange={(e) => onChange((isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value)) as T)} className="w-full rounded-lg border border-gray-200 p-1.5 text-xs bg-white">
        {options.map(([v, t]) => (
          <option key={String(v)} value={String(v)}>{t}</option>
        ))}
      </select>
    </label>
  );
}

function Tgl({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-purple-600" />
      {label}
    </label>
  );
}

// ===== Компонент экрана =====

export default function CardMakerScreen({ onBack }: { onBack: () => void }) {
  const initial = useMemo(() => loadCurrent(), []);
  const [cards, setCards] = useState<CardItem[]>(initial.cards);
  const [settings, setSettings] = useState<MakerSettings>(initial.settings);
  const [selectedId, setSelectedId] = useState<string>(initial.cards[0]?.id || '');
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());
  const [showProjects, setShowProjects] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [showFaq, setShowFaq] = useState(false);
  const [showScen, setShowScen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const fileImgRef = useRef<HTMLInputElement>(null);
  const fileJsonRef = useRef<HTMLInputElement>(null);

  const selected = cards.find((c) => c.id === selectedId) || cards[0];
  const selectedIndex = cards.findIndex((c) => c.id === selected?.id);

  useEffect(() => {
    try {
      localStorage.setItem(CURRENT_KEY, JSON.stringify({ cards, settings }));
    } catch {}
  }, [cards, settings]);

  const up = (patch: Partial<MakerSettings>) => setSettings((p) => ({ ...p, ...patch }));
  const upCard = (patch: Partial<CardItem>) => {
    if (!selected) return;
    setCards((prev) => prev.map((c) => (c.id === selected.id ? { ...c, ...patch } : c)));
  };

  const addCard = () => {
    const c: CardItem = { id: uid(), title: 'Новая карточка', subtitle: '', body: '', footer: '', emoji: '', imageUrl: '', imageFit: 'cover' };
    setCards((p) => [...p, c]);
    setSelectedId(c.id);
    triggerHaptic('light');
  };

  const duplicateCard = () => {
    if (!selected) return;
    const c = { ...selected, id: uid() };
    setCards((p) => {
      const i = p.findIndex((x) => x.id === selected.id);
      const next = [...p];
      next.splice(i + 1, 0, c);
      return next;
    });
    setSelectedId(c.id);
  };

  const deleteCard = () => {
    if (!selected) return;
    setConfirmState({
      title: 'Удалить карточку?',
      message: `«${selected.title || 'Без названия'}» будет удалена.`,
      confirmLabel: 'Удалить',
      danger: true,
      action: () => {
        setCards((p) => {
          const next = p.filter((c) => c.id !== selected.id);
          if (next.length && selectedId === selected.id) setSelectedId(next[0].id);
          return next;
        });
      },
    });
  };

  const moveCard = (dir: -1 | 1) => {
    if (!selected) return;
    setCards((p) => {
      const i = p.findIndex((c) => c.id === selected.id);
      const j = i + dir;
      if (j < 0 || j >= p.length) return p;
      const next = [...p];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const shuffleCards = () => {
    setConfirmState({
      title: 'Перемешать карточки?',
      message: 'Порядок колоды станет случайным.',
      confirmLabel: 'Перемешать',
      action: () => {
        setCards((p) => {
          const a = [...p];
          for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
          }
          return a;
        });
        triggerHaptic('medium');
      },
    });
  };

  const batchAdd = () => {
    const lines = batchText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) {
      setAlertMsg('Введите хотя бы одну строку.');
      return;
    }
    const added: CardItem[] = lines.map((l) => {
      const parts = l.split('|').map((p) => p.trim());
      const third = parts[2] || '';
      const isUrl = third.startsWith('http') || third.startsWith('data:');
      return {
        id: uid(),
        title: parts[0] || '',
        body: parts[1] || '',
        subtitle: '',
        footer: '',
        emoji: isUrl ? '' : third,
        imageUrl: isUrl ? third : '',
        imageFit: 'cover',
      };
    });
    setCards((p) => [...p, ...added]);
    setBatchText('');
    setBatchOpen(false);
    setAlertMsg(`Добавлено карточек: ${added.length} ✅`);
  };

  const uploadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => upCard({ imageUrl: String(reader.result), emoji: '' });
    reader.readAsDataURL(file);
  };

  const saveCopy = () => {
    const name = `Колода ${new Date(projects.length + 1).toLocaleDateString ? new Date().toLocaleDateString('ru-RU') : ''}`;
    const p: Project = { id: uid(), name: `Колода от ${new Date().toLocaleDateString('ru-RU')} (${cards.length} карт)`, settings, cards, createdAt: Date.now() };
    void name;
    setProjects((prev) => {
      const next = [p, ...prev];
      persistProjects(next);
      return next;
    });
    setAlertMsg('Копия сохранена в список проектов ✅');
  };

  const loadProject = (p: Project) => {
    setCards(p.cards.map((c) => ({ ...c })));
    setSettings({ ...DEFAULT_SETTINGS, ...p.settings });
    setSelectedId(p.cards[0]?.id || '');
    setShowProjects(false);
    triggerHaptic('light');
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      persistProjects(next);
      return next;
    });
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ cards, settings }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cards-project.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const p = JSON.parse(String(reader.result));
        if (Array.isArray(p.cards)) {
          setCards(p.cards);
          if (p.settings) setSettings({ ...DEFAULT_SETTINGS, ...p.settings });
          setSelectedId(p.cards[0]?.id || '');
          setAlertMsg('Проект импортирован ✅');
        } else setAlertMsg('В файле нет списка карточек.');
      } catch {
        setAlertMsg('Не удалось прочитать файл проекта.');
      }
    };
    reader.readAsText(file);
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) {
      setAlertMsg('Разрешите всплывающие окна для печати');
      return;
    }
    const [pw, ph] = PAGES[settings.pageFormat];
    const cols = COLS[settings.perPage] || 2;
    const pages: CardItem[][] = [];
    for (let i = 0; i < cards.length; i += settings.perPage) pages.push(cards.slice(i, i + settings.perPage));
    if (!pages.length) pages.push([]);

    const pageHtml = (items: CardItem[], isBack: boolean, startIdx: number) => `
      <div class="page">
        <div class="grid">
          ${items.length
            ? items.map((c, i) => `<div class="cell">${isBack ? backPrintHtml(settings) : cardPrintHtml(c, settings, startIdx + i)}</div>`).join('')
            : ''}
          ${isBack ? Array.from({ length: Math.max(0, settings.perPage - items.length) }, () => `<div class="cell">${backPrintHtml(settings)}</div>`).join('') : ''}
        </div>
      </div>`;

    let body = '';
    let idx = 0;
    pages.forEach((pg) => {
      body += pageHtml(pg, false, idx);
      idx += pg.length;
    });
    if (settings.duplex) {
      body += `<div class="no-print" style="page-break-after:always;padding:10mm;font-family:Arial;font-size:14px;">✂️ Страницы рубашек ниже. Напечатайте лица, переверните стопку и напечатайте рубашки.</div>`;
      pages.forEach((pg) => {
        body += pageHtml(pg, true, 0);
      });
    }

    w.document.write(`<!DOCTYPE html><html><head><title>Карточки</title><style>
      @page { size: ${pw}mm ${ph}mm; margin: 0; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Arial; }
      .page { width: ${pw}mm; height: ${ph}mm; page-break-after: always; position: relative; overflow: hidden; }
      .grid { width: 100%; height: 100%; padding: ${settings.margin}mm; display: grid; grid-template-columns: repeat(${cols}, 1fr); grid-auto-rows: 1fr; gap: ${settings.gap}mm; }
      .cell { position: relative; min-height: 0; ${settings.cutMarks ? `outline: 0.3mm dashed #9ca3af; outline-offset: ${settings.gap / 2}mm;` : ''} }
      @media print { .no-print { display: none !important; } }
    </style></head><body>
      <div class="no-print" style="padding:8mm;text-align:center;">
        <button onclick="window.print()" style="padding:10px 24px;font-size:16px;cursor:pointer;">🖨️ Печать</button>
        <p style="font-size:12px;color:#666;">Карточек: ${cards.length} · на странице: ${settings.perPage}${settings.duplex ? ' · двусторонняя (рубашки в конце)' : ''}</p>
      </div>
      ${body}
    </body></html>`);
    w.document.close();
  };

  const downloadPng = async (card: CardItem, idx: number) => {
    try {
      const canvas = await drawCardCanvas(card, settings, idx);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `card-${idx + 1}.png`;
      a.click();
      triggerHaptic('light');
    } catch {
      setAlertMsg('Не удалось экспортировать PNG. Если картинка загружена по ссылке — скачайте её и загрузите файлом.');
    }
  };

  const downloadAllPng = async () => {
    for (let i = 0; i < cards.length; i++) {
      await downloadPng(cards[i], i);
      await new Promise((r) => setTimeout(r, 350));
    }
  };

  return (
    <div className="min-h-[100dvh] notebook-bg flex flex-col">
      <header className="bg-purple-700 shadow-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Конструктор карточек</h1>
          </div>
          <Contact className="w-6 h-6 text-white/70 shrink-0" />
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4 space-y-4 pb-8">
        {/* ===== Колода ===== */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-sm font-bold text-purple-700 flex items-center gap-1.5">
              <LayoutTemplate className="w-4 h-4" /> Колода · {cards.length}
            </h2>
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={addCard} className="px-2.5 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Карточка
              </button>
              <button onClick={() => setBatchOpen(true)} className="px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-700 text-xs font-semibold flex items-center gap-1">
                <ListPlus className="w-3.5 h-3.5" /> Пакетно
              </button>
              <button onClick={shuffleCards} className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold flex items-center gap-1">
                <Shuffle className="w-3.5 h-3.5" /> Перемешать
              </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {cards.map((c, i) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`shrink-0 w-16 h-22 rounded-lg overflow-hidden transition-all ${
                  selected?.id === c.id ? 'ring-2 ring-purple-500 scale-105' : 'opacity-70 hover:opacity-100'
                }`}
                style={{ height: 88 }}
                title={c.title}
              >
                <CardView card={c} s={settings} index={i} compact />
              </button>
            ))}
          </div>

          {selected && (
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => moveCard(-1)} disabled={selectedIndex <= 0} className="p-1.5 rounded-lg bg-gray-100 text-gray-600 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => moveCard(1)} disabled={selectedIndex >= cards.length - 1} className="p-1.5 rounded-lg bg-gray-100 text-gray-600 disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={duplicateCard} className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold flex items-center gap-1">
                <Copy className="w-3.5 h-3.5" /> Дублировать
              </button>
              <button onClick={deleteCard} className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Удалить
              </button>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ===== Редактор карточки ===== */}
          {selected && (
            <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-purple-700">Содержимое карточки</h2>
              <input value={selected.title} onChange={(e) => upCard({ title: e.target.value })} placeholder="Заголовок" className="w-full rounded-xl border border-purple-200 p-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-400" />
              <input value={selected.subtitle} onChange={(e) => upCard({ subtitle: e.target.value })} placeholder="Подзаголовок (необязательно)" className="w-full rounded-xl border border-purple-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
              <textarea value={selected.body} onChange={(e) => upCard({ body: e.target.value })} placeholder="Основной текст" rows={3} className="w-full rounded-xl border border-purple-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-y" />
              <input value={selected.footer} onChange={(e) => upCard({ footer: e.target.value })} placeholder="Нижняя подпись (необязательно)" className="w-full rounded-xl border border-purple-200 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400" />

              <div className="flex gap-2 flex-wrap items-center">
                <button onClick={() => setShowEmoji(!showEmoji)} className="px-3 py-2 rounded-xl bg-amber-50 text-amber-700 text-xs font-semibold flex items-center gap-1.5">
                  {selected.emoji || '😀'} Эмодзи
                </button>
                <button onClick={() => fileImgRef.current?.click()} className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-semibold flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" /> Загрузить фото
                </button>
                {selected.imageUrl && (
                  <button onClick={() => upCard({ imageUrl: '' })} className="px-3 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-semibold flex items-center gap-1.5">
                    <X className="w-3.5 h-3.5" /> Убрать фото
                  </button>
                )}
                <input ref={fileImgRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ''; }} />
              </div>

              {showEmoji && (
                <div className="grid grid-cols-10 gap-1 p-2 bg-amber-50 rounded-xl max-h-32 overflow-y-auto">
                  {EMOJIS.map((e) => (
                    <button key={e} onClick={() => { upCard({ emoji: e, imageUrl: '' }); setShowEmoji(false); }} className="text-xl hover:scale-125 transition-transform">
                      {e}
                    </button>
                  ))}
                </div>
              )}

              <input value={selected.imageUrl.startsWith('data:') ? '' : selected.imageUrl} onChange={(e) => upCard({ imageUrl: e.target.value })} placeholder="…или ссылка на картинку (https://)" className="w-full rounded-xl border border-gray-200 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400" />

              <div className="grid grid-cols-2 gap-2">
                <Sel label="Вписывание фото" value={selected.imageFit} options={[['cover', 'Заполнить'], ['contain', 'Целиком']]} onChange={(v) => upCard({ imageFit: v })} />
                <Sel label="Позиция картинки" value={settings.imagePos} options={[['none', 'Без картинки'], ['top', 'Сверху'], ['left', 'Слева'], ['right', 'Справа'], ['bg', 'Фоном']]} onChange={(v) => up({ imagePos: v })} />
              </div>
              {settings.imagePos !== 'none' && settings.imagePos !== 'bg' && (
                <Num label="Размер области картинки, %" value={settings.imageSize} min={15} max={70} onChange={(v) => up({ imageSize: v })} />
              )}
            </section>
          )}

          {/* ===== Предпросмотр ===== */}
          <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-purple-700">Предпросмотр</h2>
              <div className="flex gap-1.5">
                <button onClick={() => selected && downloadPng(selected, selectedIndex)} className="px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-semibold flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" /> PNG
                </button>
                <button onClick={downloadAllPng} className="px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-semibold flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" /> PNG все
                </button>
              </div>
            </div>
            <div className="max-w-[280px] mx-auto">
              {selected && <CardView card={selected} s={settings} index={selectedIndex} />}
            </div>
            <div className="flex items-center justify-center gap-3">
              <Sel label="" value={settings.exportScale} options={[[2, '2×'], [3, '3×'], [4, '4×']]} onChange={(v) => up({ exportScale: v })} />
              <span className="text-[11px] text-gray-400">качество PNG</span>
            </div>
          </section>
        </div>

        {/* ===== Дизайн ===== */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-purple-700 flex items-center gap-1.5">
            <Palette className="w-4 h-4" /> Дизайн
          </h2>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => { setSettings((p) => ({ ...p, ...t.patch, theme: t.id })); triggerHaptic('light'); }}
                className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-colors ${
                  settings.theme === t.id ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:border-purple-200'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase">Фон</h3>
              <div className="grid grid-cols-3 gap-1.5">
                {(['solid', 'gradient', 'pattern'] as BgType[]).map((b) => (
                  <button key={b} onClick={() => up({ bgType: b })} className={`py-1.5 rounded-lg text-[11px] font-semibold border ${settings.bgType === b ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600'}`}>
                    {b === 'solid' ? 'Цвет' : b === 'gradient' ? 'Градиент' : 'Узор'}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 flex-wrap">
                <Color label="Цвет 1" value={settings.bgColor1} onChange={(v) => up({ bgColor1: v })} />
                {settings.bgType === 'gradient' && <Color label="Цвет 2" value={settings.bgColor2} onChange={(v) => up({ bgColor2: v })} />}
                {settings.bgType === 'pattern' && <Color label="Узор" value={settings.patternColor} onChange={(v) => up({ patternColor: v })} />}
              </div>
              {settings.bgType === 'gradient' && <Num label="Угол градиента, °" value={settings.gradientAngle} min={0} max={360} step={15} onChange={(v) => up({ gradientAngle: v })} />}
              {settings.bgType === 'pattern' && (
                <Sel label="Тип узора" value={settings.pattern} options={[['dots', 'Точки'], ['grid', 'Клетка'], ['lines', 'Линии'], ['diagonal', 'Диагональ'], ['none', 'Без узора']]} onChange={(v) => up({ pattern: v })} />
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase">Рамка</h3>
              <Sel label="Стиль рамки" value={settings.borderStyle} options={[['none', 'Без рамки'], ['solid', 'Сплошная'], ['double', 'Двойная'], ['dashed', 'Пунктир'], ['dotted', 'Точки']]} onChange={(v) => up({ borderStyle: v })} />
              {settings.borderStyle !== 'none' && (
                <>
                  <Num label="Толщина, px" value={settings.borderWidth} min={1} max={10} onChange={(v) => up({ borderWidth: v })} />
                  <Color label="Цвет рамки" value={settings.borderColor} onChange={(v) => up({ borderColor: v })} />
                </>
              )}
              <Num label="Скругление углов, px" value={settings.borderRadius} min={0} max={40} onChange={(v) => up({ borderRadius: v })} />
              <Tgl label="Внутренняя рамка" value={settings.innerFrame} onChange={(v) => up({ innerFrame: v })} />
              <Tgl label="Тень карточки" value={settings.shadow} onChange={(v) => up({ shadow: v })} />
              <Tgl label="Нумерация карточек" value={settings.showNumber} onChange={(v) => up({ showNumber: v })} />
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Type className="w-3 h-3" /> Текст</h3>
              <Sel label="Шрифт" value={settings.fontFamily} options={FONTS.map((f) => [f, f.split(',')[0].replace(/"/g, '')] as [string, string])} onChange={(v) => up({ fontFamily: v })} />
              <Num label="Заголовок, px" value={settings.titleSize} min={10} max={40} onChange={(v) => up({ titleSize: v })} />
              <Num label="Текст, px" value={settings.bodySize} min={8} max={24} onChange={(v) => up({ bodySize: v })} />
              <Num label="Межстрочный" value={settings.lineHeight} min={1} max={2} step={0.05} onChange={(v) => up({ lineHeight: v })} />
              <div className="flex gap-3 flex-wrap">
                <Color label="Заголовок" value={settings.titleColor} onChange={(v) => up({ titleColor: v })} />
                <Color label="Текст" value={settings.bodyColor} onChange={(v) => up({ bodyColor: v })} />
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['left', 'center', 'right'] as const).map((a) => (
                  <button key={a} onClick={() => up({ titleAlign: a })} className={`py-1.5 rounded-lg text-[11px] font-semibold border ${settings.titleAlign === a ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600'}`}>
                    {a === 'left' ? 'Слева' : a === 'center' ? 'Центр' : 'Справа'}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Tgl label="Жирный" value={settings.titleBold} onChange={(v) => up({ titleBold: v })} />
                <Tgl label="КАПСОМ" value={settings.titleUpper} onChange={(v) => up({ titleUpper: v })} />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase">Формат карточки</h3>
              <Sel label="Пропорции" value={settings.aspect} options={[['1:1', 'Квадрат 1:1'], ['3:4', 'Портрет 3:4'], ['4:3', 'Ландшафт 4:3'], ['2:3', 'Узкая 2:3'], ['3:2', 'Широкая 3:2']]} onChange={(v) => up({ aspect: v })} />
              <div className="bg-purple-50 rounded-xl p-3 space-y-2">
                <h4 className="text-xs font-bold text-purple-800 flex items-center gap-1"><Printer className="w-3 h-3" /> Лист и печать</h4>
                <Sel label="Формат листа" value={settings.pageFormat} options={[['a4p', 'A4 книжный'], ['a4l', 'A4 альбомный'], ['a5p', 'A5 книжный'], ['a5l', 'A5 альбомный']]} onChange={(v) => up({ pageFormat: v })} />
                <Sel label="Карточек на листе" value={settings.perPage} options={[[1, '1'], [2, '2'], [4, '4'], [6, '6'], [8, '8'], [9, '9'], [12, '12']]} onChange={(v) => up({ perPage: v })} />
                <Num label="Отступ между, мм" value={settings.gap} min={0} max={15} onChange={(v) => up({ gap: v })} />
                <Num label="Поля листа, мм" value={settings.margin} min={0} max={25} onChange={(v) => up({ margin: v })} />
                <Tgl label="Метки реза" value={settings.cutMarks} onChange={(v) => up({ cutMarks: v })} />
                <Tgl label="Двусторонняя печать (рубашки)" value={settings.duplex} onChange={(v) => up({ duplex: v })} />
                {settings.duplex && (
                  <>
                    <input value={settings.backText} onChange={(e) => up({ backText: e.target.value })} placeholder="Надпись на рубашке" className="w-full rounded-lg border border-gray-200 p-1.5 text-xs" />
                    <Tgl label="Узор на рубашке" value={settings.backPattern} onChange={(v) => up({ backPattern: v })} />
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ===== Проекты и экспорт ===== */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-purple-700 flex items-center gap-1.5">
            <Save className="w-4 h-4" /> Проекты и печать
          </h2>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handlePrint} className="flex-1 min-w-[130px] py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5">
              <Printer className="w-4 h-4" /> Печать / PDF
            </button>
            <button onClick={saveCopy} className="flex-1 min-w-[130px] py-2.5 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 text-sm font-semibold flex items-center justify-center gap-1.5">
              <Save className="w-4 h-4" /> Сохранить копию
            </button>
            <button onClick={() => setShowProjects(!showProjects)} className="flex-1 min-w-[130px] py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-semibold flex items-center justify-center gap-1.5">
              <FolderOpen className="w-4 h-4" /> Проекты ({projects.length})
            </button>
            <button onClick={exportJson} className="flex-1 min-w-[110px] py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold flex items-center justify-center gap-1.5">
              <FileJson className="w-4 h-4" /> Экспорт JSON
            </button>
            <button onClick={() => fileJsonRef.current?.click()} className="flex-1 min-w-[110px] py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold flex items-center justify-center gap-1.5">
              <Upload className="w-4 h-4" /> Импорт
            </button>
            <input ref={fileJsonRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ''; }} />
          </div>

          {showProjects && (
            <div className="space-y-2">
              {projects.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-3">Пока нет сохранённых копий</p>
              ) : (
                projects.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 border border-purple-100 rounded-xl p-2.5">
                    <button onClick={() => loadProject(p)} className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.cards.length} карт · {new Date(p.createdAt).toLocaleDateString('ru-RU')}</p>
                    </button>
                    <button onClick={() => deleteProject(p.id)} className="p-1.5 text-gray-300 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* ===== FAQ ===== */}
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

        {/* ===== Сценарии ===== */}
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

      {/* Пакетный ввод */}
      {batchOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setBatchOpen(false)}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Пакетный ввод карточек</h2>
              <button onClick={() => setBatchOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Закрыть">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-500">Каждая строка — карточка в формате: <b>Заголовок | Текст | Эмодзи или ссылка</b></p>
              <textarea
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                rows={8}
                placeholder={'Столица Франции | Париж | 🗼\nH2O | Вода | 💧\n7 × 8 | 56 | 🧮'}
                className="w-full rounded-xl border border-purple-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-y"
              />
              <button onClick={batchAdd} className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center justify-center gap-2">
                <ListPlus className="w-5 h-5" /> Добавить карточки
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmState !== null}
        title={confirmState?.title ?? ''}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        danger={confirmState?.danger}
        onConfirm={() => { confirmState?.action(); setConfirmState(null); }}
        onCancel={() => setConfirmState(null)}
      />
      <AlertDialog isOpen={alertMsg !== null} message={alertMsg ?? ''} onClose={() => setAlertMsg(null)} />
    </div>
  );
}
