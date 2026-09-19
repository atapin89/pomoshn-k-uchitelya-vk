import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Image as ImageIcon,
  Grid3x3,
  Download,
  Settings,
  X,
  Upload,
  FileImage,
  Printer,
  RotateCw,
  Maximize2,
  Trash2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Trophy,
  Check,
} from 'lucide-react';
import BackButton from './BackButton';
import { triggerHaptic } from '@/lib/haptic';
import { ConfirmDialog, AlertDialog } from './ConfirmDialog';

// ===== Типы =====

type PaperSize = 'a4' | 'letter' | 'a3' | 'legal';
type Orientation = 'portrait' | 'landscape';

interface PosterSettings {
  cols: number;
  rows: number;
  paperSize: PaperSize;
  orientation: Orientation;
  overlap: number; // в мм
  margin: number; // в мм
  quality: number; // 0.1-1.0
  showGrid: boolean;
  showNumbers: boolean;
  showCropMarks: boolean;
}

interface Project {
  id: string;
  name: string;
  imageData: string;
  settings: PosterSettings;
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

const CURRENT_KEY = 'postermaker-current';
const PROJECTS_KEY = 'postermaker-projects';

const PAPER_SIZES: Record<PaperSize, { w: number; h: number; label: string }> = {
  a4: { w: 210, h: 297, label: 'A4 (210×297 мм)' },
  letter: { w: 216, h: 279, label: 'Letter (8.5×11")' },
  a3: { w: 297, h: 420, label: 'A3 (297×420 мм)' },
  legal: { w: 216, h: 356, label: 'Legal (8.5×14")' },
};

const DEFAULT_SETTINGS: PosterSettings = {
  cols: 2,
  rows: 2,
  paperSize: 'a4',
  orientation: 'portrait',
  overlap: 5,
  margin: 10,
  quality: 0.95,
  showGrid: true,
  showNumbers: true,
  showCropMarks: true,
};

const FAQ_ITEMS = [
  { q: 'Как правильно склеить страницы?', a: 'Печатайте с перекрытием (overlap) 5-10 мм — это позволит точно совместить края. Обрежьте одну сторону каждой страницы по линии перекрытия и наложите на соседнюю. Используйте клей-карандаш или двусторонний скотч.' },
  { q: 'Зачем нужны метки реза?', a: 'Метки реза (crop marks) — это маленькие уголки на каждой странице, показывающие точную линию обреза. Помогают обрезать страницы ровно и без перекосов.' },
  { q: 'Какое перекрытие выбрать?', a: '5 мм — минимум для точного совмещения. 10 мм — если принтер печатает с небольшой погрешностью. 15 мм — для больших постеров, где легче выравнивать.' },
  { q: 'Можно ли изменить количество страниц?', a: 'Да, меняйте количество столбцов и строк в настройках. Например, 3×3 = 9 страниц, 4×2 = 8 страниц. Предпросмотр обновится мгновенно.' },
  { q: 'Почему постер выглядит размытым?', a: 'Увеличьте качество экспорта (ползунок «Качество»). Для печати лучше использовать исходное изображение высокого разрешения (минимум 2000×2000 пикселей).' },
  { q: 'Как сохранить проект?', a: 'Нажмите «Сохранить проект» — изображение и настройки сохранятся локально. Можно загрузить позже и продолжить работу.' },
];

const SCENARIO_ITEMS = [
  { icon: '🎨', title: 'Постер для кабинета', description: 'Распечатайте мотивационный плакат, таблицу умножения или карту мира на 6-9 листах A4 и склейте — получится большой постер для стены.' },
  { icon: '📚', title: 'Инфографика для урока', description: 'Создайте большую схему, диаграмму или таймлайн из вашего изображения. Ученики видят детали с любой парты.' },
  { icon: '🎉', title: 'Праздничное оформление', description: 'Распечатайте поздравительный постер к дню рождения, выпускному или школьному празднику. Быстро и без затрат на типографию.' },
  { icon: '🗺️', title: 'Карта для квеста', description: 'Разделите карту сокровищ или схему станции на части для квеста: каждая команда получает свой фрагмент.' },
  { icon: '📸', title: 'Фотоколлаж на стену', description: 'Превратите любимое фото класса в большой постер. Отличный подарок учителю или украшение класса.' },
];

// ===== Утилиты =====

function uid(): string {
  return `p-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function loadCurrent(): { imageData: string; settings: PosterSettings } | null {
  try {
    const raw = localStorage.getItem(CURRENT_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p.imageData && p.settings) return p;
    }
  } catch {}
  return null;
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

// ===== Компонент =====

export default function PosterMakerScreen({ onBack }: { onBack: () => void }) {
  const [imageData, setImageData] = useState<string>('');
  const [settings, setSettings] = useState<PosterSettings>(DEFAULT_SETTINGS);
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());
  const [showProjects, setShowProjects] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [showScen, setShowScen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const imageLoaded = Boolean(imageData);

  useEffect(() => {
    if (imageData) {
      try {
        localStorage.setItem(CURRENT_KEY, JSON.stringify({ imageData, settings }));
      } catch {}
    }
  }, [imageData, settings]);

  useEffect(() => {
    const saved = loadCurrent();
    if (saved) {
      setImageData(saved.imageData);
      setSettings(saved.settings);
    }
  }, []);

  const up = (patch: Partial<PosterSettings>) => setSettings((p) => ({ ...p, ...patch }));

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setAlertMsg('Пожалуйста, выберите изображение (JPG, PNG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result as string;
      setImageData(data);
      triggerHaptic('medium');
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setConfirmState({
      title: 'Удалить изображение?',
      message: 'Текущее изображение будет удалено.',
      confirmLabel: 'Удалить',
      danger: true,
      action: () => {
        setImageData('');
        localStorage.removeItem(CURRENT_KEY);
      },
    });
  };

  const saveProject = () => {
    if (!imageData) {
      setAlertMsg('Сначала загрузите изображение.');
      return;
    }
    const name = `Постер ${new Date().toLocaleDateString('ru-RU')}`;
    const p: Project = { id: uid(), name, imageData, settings, createdAt: Date.now() };
    setProjects((prev) => {
      const next = [p, ...prev];
      persistProjects(next);
      return next;
    });
    setAlertMsg('Проект сохранён ✅');
  };

  const loadProject = (p: Project) => {
    setImageData(p.imageData);
    setSettings(p.settings);
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

  const paper = PAPER_SIZES[settings.paperSize];
  const paperW = settings.orientation === 'portrait' ? paper.w : paper.h;
  const paperH = settings.orientation === 'portrait' ? paper.h : paper.w;

  const totalPages = settings.cols * settings.rows;
  const posterWidth = paperW * settings.cols - settings.overlap * (settings.cols - 1);
  const posterHeight = paperH * settings.rows - settings.overlap * (settings.rows - 1);

  // Генерация PDF через jsPDF (динамический импорт)
  const exportPDF = async () => {
    if (!imageData || !canvasRef.current) {
      setAlertMsg('Сначала загрузите изображение.');
      return;
    }

    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const img = new Image();
      img.src = imageData;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });

      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;

      // Размер постера в пикселях (при 96 DPI)
      const mmToPx = 96 / 25.4;
      const posterPxW = Math.round(posterWidth * mmToPx);
      const posterPxH = Math.round(posterHeight * mmToPx);

      const cellPxW = Math.round(posterPxW / settings.cols);
      const cellPxH = Math.round(posterPxH / settings.rows);
      const overlapPxW = Math.round(settings.overlap * mmToPx);
      const overlapPxH = Math.round(settings.overlap * mmToPx);

      const pdf = new jsPDF({
        orientation: settings.orientation,
        unit: 'mm',
        format: settings.paperSize,
      });

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      let pageNum = 1;
      for (let row = 0; row < settings.rows; row++) {
        for (let col = 0; col < settings.cols; col++) {
          if (pageNum > 1) pdf.addPage();

          // Расчет области изображения для этой страницы
          const srcX = Math.round((col * (cellPxW - overlapPxW) / posterPxW) * imgW);
          const srcY = Math.round((row * (cellPxH - overlapPxH) / posterPxH) * imgH);
          const srcW = Math.round((cellPxW / posterPxW) * imgW);
          const srcH = Math.round((cellPxH / posterPxH) * imgH);

          canvas.width = cellPxW;
          canvas.height = cellPxH;

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, cellPxW, cellPxH);

          const marginPx = Math.round(settings.margin * mmToPx);
          const drawW = cellPxW - marginPx * 2;
          const drawH = cellPxH - marginPx * 2;

          ctx.drawImage(img, srcX, srcY, srcW, srcH, marginPx, marginPx, drawW, drawH);

          // Метки реза
          if (settings.showCropMarks) {
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            const markLen = 10;
            // Верхний левый
            ctx.beginPath();
            ctx.moveTo(marginPx - markLen, marginPx);
            ctx.lineTo(marginPx, marginPx);
            ctx.moveTo(marginPx, marginPx - markLen);
            ctx.lineTo(marginPx, marginPx);
            // Верхний правый
            ctx.moveTo(cellPxW - marginPx + markLen, marginPx);
            ctx.lineTo(cellPxW - marginPx, marginPx);
            ctx.moveTo(cellPxW - marginPx, marginPx - markLen);
            ctx.lineTo(cellPxW - marginPx, marginPx);
            // Нижний левый
            ctx.moveTo(marginPx - markLen, cellPxH - marginPx);
            ctx.lineTo(marginPx, cellPxH - marginPx);
            ctx.moveTo(marginPx, cellPxH - marginPx + markLen);
            ctx.lineTo(marginPx, cellPxH - marginPx);
            // Нижний правый
            ctx.moveTo(cellPxW - marginPx + markLen, cellPxH - marginPx);
            ctx.lineTo(cellPxW - marginPx, cellPxH - marginPx);
            ctx.moveTo(cellPxW - marginPx, cellPxH - marginPx + markLen);
            ctx.lineTo(cellPxW - marginPx, cellPxH - marginPx);
            ctx.stroke();
          }

          // Номер страницы
          if (settings.showNumbers) {
            ctx.fillStyle = '#000000';
            ctx.font = `${Math.round(12 * mmToPx / 3)}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(`${row * settings.cols + col + 1}`, cellPxW / 2, cellPxH - marginPx / 2);
          }

          // Добавляем страницу в PDF
          const imgData = canvas.toDataURL('image/jpeg', settings.quality);
          pdf.addImage(imgData, 'JPEG', 0, 0, paperW, paperH, undefined, 'FAST');

          pageNum++;
        }
      }

      pdf.save(`poster-${settings.cols}x${settings.rows}.pdf`);
      triggerHaptic('heavy');
      setAlertMsg('PDF сохранён ✅');
    } catch (err) {
      console.error('Export error:', err);
      setAlertMsg('Ошибка при экспорте. Попробуйте ещё раз.');
    } finally {
      setExporting(false);
    }
  };

  // Предпросмотр сетки
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!imageData || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = imageData;
    img.onload = () => {
      const maxW = 400;
      const maxH = 300;
      const ratio = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
      canvas.width = img.naturalWidth * ratio;
      canvas.height = img.naturalHeight * ratio;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      if (settings.showGrid) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        const cellW = canvas.width / settings.cols;
        const cellH = canvas.height / settings.rows;

        for (let i = 1; i < settings.cols; i++) {
          ctx.beginPath();
          ctx.moveTo(i * cellW, 0);
          ctx.lineTo(i * cellW, canvas.height);
          ctx.stroke();
        }
        for (let i = 1; i < settings.rows; i++) {
          ctx.beginPath();
          ctx.moveTo(0, i * cellH);
          ctx.lineTo(canvas.width, i * cellH);
          ctx.stroke();
        }

        ctx.setLineDash([]);
      }
    };
  }, [imageData, settings.cols, settings.rows, settings.showGrid]);

  return (
    <div className="min-h-[100dvh] notebook-bg flex flex-col">
      <header className="bg-purple-700 shadow-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Постер из изображения</h1>
          </div>
          <Grid3x3 className="w-6 h-6 text-white/70 shrink-0" />
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4 space-y-4 pb-8">
        {/* Загрузка изображения */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-purple-700 flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4" /> Изображение
          </h2>
          {!imageLoaded ? (
            <div className="border-2 border-dashed border-purple-300 rounded-xl p-8 text-center">
              <Upload className="w-12 h-12 text-purple-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-3">Перетащите изображение или нажмите для выбора</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors"
              >
                Выбрать файл
              </button>
              <p className="text-xs text-gray-400 mt-2">JPG, PNG, WebP · рекомендуется 2000×2000 px и больше</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileImage className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-semibold text-gray-800">Изображение загружено</span>
                </div>
                <button
                  onClick={clearImage}
                  className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                  aria-label="Удалить"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 max-h-80 overflow-hidden flex items-center justify-center">
                <img src={imageData} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg" />
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
              e.target.value = '';
            }}
          />
        </section>

        {/* Предпросмотр сетки */}
        {imageLoaded && (
          <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-purple-700 flex items-center gap-1.5">
              <Maximize2 className="w-4 h-4" /> Предпросмотр сетки
            </h2>
            <div className="flex justify-center">
              <canvas ref={previewCanvasRef} className="border border-gray-200 rounded-lg shadow-sm" />
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-xs text-gray-600">
              <div className="bg-purple-50 rounded-lg p-2">
                <div className="font-bold text-purple-700 text-lg">{settings.cols}×{settings.rows}</div>
                <div>Сетка</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-2">
                <div className="font-bold text-blue-700 text-lg">{totalPages}</div>
                <div>Страниц</div>
              </div>
              <div className="bg-green-50 rounded-lg p-2">
                <div className="font-bold text-green-700 text-lg">{posterWidth.toFixed(0)}×{posterHeight.toFixed(0)}</div>
                <div>Размер, мм</div>
              </div>
            </div>
          </section>
        )}

        {/* Настройки */}
        {imageLoaded && (
          <section className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-purple-700 flex items-center gap-1.5">
              <Settings className="w-4 h-4" /> Настройки
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Сетка */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase">Сетка</h3>
                <div>
                  <label className="text-xs text-gray-600 flex justify-between mb-1">
                    <span>Столбцы</span>
                    <span className="font-mono text-purple-700">{settings.cols}</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={6}
                    value={settings.cols}
                    onChange={(e) => up({ cols: Number(e.target.value) })}
                    className="w-full accent-purple-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 flex justify-between mb-1">
                    <span>Строки</span>
                    <span className="font-mono text-purple-700">{settings.rows}</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={6}
                    value={settings.rows}
                    onChange={(e) => up({ rows: Number(e.target.value) })}
                    className="w-full accent-purple-600"
                  />
                </div>
              </div>

              {/* Бумага */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase">Бумага</h3>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Формат</label>
                  <select
                    value={settings.paperSize}
                    onChange={(e) => up({ paperSize: e.target.value as PaperSize })}
                    className="w-full rounded-lg border border-gray-200 p-2 text-sm bg-white"
                  >
                    {Object.entries(PAPER_SIZES).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Ориентация</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['portrait', 'landscape'] as Orientation[]).map((o) => (
                      <button
                        key={o}
                        onClick={() => up({ orientation: o })}
                        className={`py-2 rounded-lg text-xs font-semibold border-2 transition-colors flex items-center justify-center gap-1 ${
                          settings.orientation === o
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 text-gray-600 hover:border-purple-200'
                        }`}
                      >
                        <RotateCw className={`w-3 h-3 ${o === 'landscape' ? 'rotate-90' : ''}`} />
                        {o === 'portrait' ? 'Портрет' : 'Ландшафт'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Перекрытие и поля */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase">Перекрытие и поля</h3>
                <div>
                  <label className="text-xs text-gray-600 flex justify-between mb-1">
                    <span>Перекрытие (overlap)</span>
                    <span className="font-mono text-purple-700">{settings.overlap} мм</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    value={settings.overlap}
                    onChange={(e) => up({ overlap: Number(e.target.value) })}
                    className="w-full accent-purple-600"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">Для точного совмещения при склейке</p>
                </div>
                <div>
                  <label className="text-xs text-gray-600 flex justify-between mb-1">
                    <span>Поля</span>
                    <span className="font-mono text-purple-700">{settings.margin} мм</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    value={settings.margin}
                    onChange={(e) => up({ margin: Number(e.target.value) })}
                    className="w-full accent-purple-600"
                  />
                </div>
              </div>

              {/* Качество и опции */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase">Качество и опции</h3>
                <div>
                  <label className="text-xs text-gray-600 flex justify-between mb-1">
                    <span>Качество JPEG</span>
                    <span className="font-mono text-purple-700">{Math.round(settings.quality * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min={50}
                    max={100}
                    value={settings.quality * 100}
                    onChange={(e) => up({ quality: Number(e.target.value) / 100 })}
                    className="w-full accent-purple-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showGrid}
                      onChange={(e) => up({ showGrid: e.target.checked })}
                      className="w-4 h-4 accent-purple-600"
                    />
                    Показать сетку в предпросмотре
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showCropMarks}
                      onChange={(e) => up({ showCropMarks: e.target.checked })}
                      className="w-4 h-4 accent-purple-600"
                    />
                    Метки реза (crop marks)
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showNumbers}
                      onChange={(e) => up({ showNumbers: e.target.checked })}
                      className="w-4 h-4 accent-purple-600"
                    />
                    Нумерация страниц
                  </label>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Экспорт и проекты */}
        {imageLoaded && (
          <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-purple-700 flex items-center gap-1.5">
              <Download className="w-4 h-4" /> Экспорт и проекты
            </h2>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={exportPDF}
                disabled={exporting}
                className="flex-1 min-w-[150px] py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Printer className="w-5 h-5" />
                {exporting ? 'Экспорт...' : 'Скачать PDF'}
              </button>
              <button
                onClick={saveProject}
                className="flex-1 min-w-[130px] py-3 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-5 h-5" />
                Сохранить проект
              </button>
              <button
                onClick={() => setShowProjects(!showProjects)}
                className="flex-1 min-w-[130px] py-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <FileImage className="w-5 h-5" />
                Проекты ({projects.length})
              </button>
            </div>

            {showProjects && (
              <div className="space-y-2 mt-3">
                {projects.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-3">Пока нет сохранённых проектов</p>
                ) : (
                  projects.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 border border-purple-100 rounded-xl p-2.5">
                      <button onClick={() => loadProject(p)} className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                        <p className="text-xs text-gray-500">
                          {p.settings.cols}×{p.settings.rows} · {new Date(p.createdAt).toLocaleDateString('ru-RU')}
                        </p>
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

      <canvas ref={canvasRef} className="hidden" />

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
