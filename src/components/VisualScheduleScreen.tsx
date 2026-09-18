import { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  Save,
  Image,
  Grid3x3,
  LayoutList,
  LayoutGrid,
  Languages,
  Search,
  X,
  FileDown,
  Check,
  ChevronDown,
  HelpCircle,
  Lightbulb,
  Printer,
  Edit3,
  Maximize2,
  Minimize2,
  Type,
  Smile,
  FolderOpen,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Sparkles,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PICTOGRAMS, PICTOGRAM_CATEGORIES, type Pictogram } from '@/data/pictograms';
import { ConfirmDialog, AlertDialog } from './ConfirmDialog';

type TemplateType = 'horizontal' | 'vertical' | 'grid3' | 'grid4';
type Language = 'ru' | 'en';
type AlignPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';
type TextAlign = 'left' | 'center' | 'right';

interface ScheduleCell {
  id: string;
  type: 'pictogram' | 'image' | 'empty';
  pictogramId?: string;
  imageData?: string;
  customLabel?: string;
}

interface SavedProject {
  id: string;
  name: string;
  template: TemplateType;
  cells: ScheduleCell[];
  language: Language;
  updatedAt: number;
}

interface CellStyle {
  emojiScale: number;
  textScale: number;
  emojiAlign: AlignPosition;
  textAlign: TextAlign;
}

interface ConfirmState {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  action: () => void;
}

const STORAGE_KEY = 'visual-schedule-projects';

const TEMPLATES: { id: TemplateType; label: string; icon: React.ReactNode; maxCells: number }[] = [
  { id: 'horizontal', label: 'Линейный', icon: <LayoutList className="w-3 h-3" />, maxCells: 8 },
  { id: 'vertical', label: 'Верт.', icon: <LayoutList className="w-3 h-3 rotate-90" />, maxCells: 8 },
  { id: 'grid3', label: '3×3', icon: <Grid3x3 className="w-3 h-3" />, maxCells: 9 },
  { id: 'grid4', label: '4×4', icon: <LayoutGrid className="w-3 h-3" />, maxCells: 16 },
];

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.0;
const SCALE_STEP = 0.15;

const DEFAULT_STYLE: CellStyle = {
  emojiScale: 1.0,
  textScale: 1.0,
  emojiAlign: 'center',
  textAlign: 'center',
};

const UNICODE_FONTS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', 'Noto Sans', 'Noto Sans Cyrillic', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', Arial, sans-serif";
const EMOJI_FONTS = "'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', sans-serif";

function generateId(): string {
  return `cell-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadProjects(): SavedProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveProjects(list: SavedProject[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

function createEmptyCells(template: TemplateType): ScheduleCell[] {
  const count = TEMPLATES.find(t => t.id === template)?.maxCells || 8;
  return Array.from({ length: count }, () => ({
    id: generateId(),
    type: 'empty' as const,
  }));
}

// Преобразование AlignPosition в tailwind-классы для flex-контейнера
function getEmojiAlignClasses(pos: AlignPosition): string {
  const map: Record<AlignPosition, string> = {
    'top-left':      'items-start justify-start',
    'top-center':    'items-start justify-center',
    'top-right':     'items-start justify-end',
    'center-left':   'items-center justify-start',
    'center':        'items-center justify-center',
    'center-right':  'items-center justify-end',
    'bottom-left':   'items-end justify-start',
    'bottom-center': 'items-end justify-center',
    'bottom-right':  'items-end justify-end',
  };
  return map[pos];
}

// 🆕 Определение мобильного устройства
function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export default function VisualScheduleScreen({ onBack }: { onBack: () => void }) {
  const [projects, setProjects] = useState<SavedProject[]>(() => loadProjects());
  const [currentProject, setCurrentProject] = useState<SavedProject>({
    id: generateId(),
    name: 'Новое расписание',
    template: 'horizontal',
    cells: createEmptyCells('horizontal'),
    language: 'ru',
    updatedAt: Date.now(),
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('morning');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCellId, setEditingCellId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [showProjects, setShowProjects] = useState(false);
  const [draggedPictogram, setDraggedPictogram] = useState<Pictogram | null>(null);
  const [dragOverCellId, setDragOverCellId] = useState<string | null>(null);
  const [showFaq, setShowFaq] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [showPreview, setShowPreview] = useState(false);
  const [previewLanguage, setPreviewLanguage] = useState<Language>('ru');
  const [editingPreviewCellId, setEditingPreviewCellId] = useState<string | null>(null);

  // Единое хранилище стилей для всех ячеек
  const [cellStyles, setCellStyles] = useState<Record<string, CellStyle>>({});
  // Выбранная ячейка в превью
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);

  const scheduleRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetCellId, setUploadTargetCellId] = useState<string | null>(null);

  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setProjects(prev => {
        const existing = prev.find(p => p.id === currentProject.id);
        if (existing) {
          return prev.map(p => p.id === currentProject.id ? { ...currentProject, updatedAt: Date.now() } : p);
        }
        return [{ ...currentProject, updatedAt: Date.now() }, ...prev].slice(0, 50);
      });
    }, 1000);
    return () => clearTimeout(timeout);
  }, [currentProject]);

  const filteredPictograms = searchQuery
    ? PICTOGRAMS.filter(p =>
        p.ru.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.en.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : PICTOGRAMS.filter(p => p.category === selectedCategory);

  const getCellStyle = (cellId: string): CellStyle => {
    return cellStyles[cellId] || DEFAULT_STYLE;
  };

  const updateSelectedStyle = (updates: Partial<CellStyle>) => {
    if (!selectedCellId) return;
    setCellStyles(prev => {
      const current = prev[selectedCellId] || DEFAULT_STYLE;
      return { ...prev, [selectedCellId]: { ...current, ...updates } };
    });
  };

  const applyStyleToAll = () => {
    if (!selectedCellId) return;
    const source = getCellStyle(selectedCellId);
    setCellStyles(prev => {
      const updated = { ...prev };
      currentProject.cells.forEach(c => {
        updated[c.id] = { ...source };
      });
      return updated;
    });
    setAlertMsg('Настройки применены ко всем ячейкам ✅');
  };

  const resetSelectedStyle = () => {
    if (!selectedCellId) return;
    setCellStyles(prev => ({ ...prev, [selectedCellId]: DEFAULT_STYLE }));
    setAlertMsg('Настройки сброшены');
  };

  const handleTemplateChange = (template: TemplateType) => {
    setConfirmState({
      title: 'Сменить шаблон?',
      message: 'Текущее расписание будет очищено.',
      confirmLabel: 'Сменить',
      danger: false,
      action: () => {
        setCurrentProject(prev => ({
          ...prev,
          template,
          cells: createEmptyCells(template),
        }));
        setCellStyles({});
        setSelectedCellId(null);
      },
    });
  };

  const handleAddPictogramToCell = (cellId: string, pictogram: Pictogram) => {
    setCurrentProject(prev => ({
      ...prev,
      cells: prev.cells.map(cell =>
        cell.id === cellId
          ? { ...cell, type: 'pictogram', pictogramId: pictogram.id, imageData: undefined }
          : cell
      ),
    }));
  };

  const handleDragStart = (pictogram: Pictogram) => setDraggedPictogram(pictogram);

  const handleDragOver = (e: React.DragEvent, cellId: string) => {
    e.preventDefault();
    setDragOverCellId(cellId);
  };

  const handleDragLeave = () => setDragOverCellId(null);

  const handleDrop = (cellId: string) => {
    if (draggedPictogram) {
      handleAddPictogramToCell(cellId, draggedPictogram);
    }
    setDraggedPictogram(null);
    setDragOverCellId(null);
  };

  const handleClearCell = (cellId: string) => {
    setCurrentProject(prev => ({
      ...prev,
      cells: prev.cells.map(cell =>
        cell.id === cellId ? { id: cell.id, type: 'empty' } : cell
      ),
    }));
  };

  const handleEditLabel = (cellId: string, currentLabel?: string) => {
    setEditingCellId(cellId);
    setEditingLabel(currentLabel || '');
  };

  const handleSaveLabel = () => {
    if (editingCellId) {
      setCurrentProject(prev => ({
        ...prev,
        cells: prev.cells.map(cell =>
          cell.id === editingCellId ? { ...cell, customLabel: editingLabel } : cell
        ),
      }));
      setEditingCellId(null);
      setEditingLabel('');
    }
  };

  const handlePreviewEditLabel = (cellId: string) => {
    const cell = currentProject.cells.find(c => c.id === cellId);
    if (!cell) return;
    const pictogram = cell.pictogramId ? PICTOGRAMS.find(p => p.id === cell.pictogramId) : null;
    const currentLabel = cell.customLabel || (pictogram ? pictogram[previewLanguage] : '');
    setEditingPreviewCellId(cellId);
    setEditingLabel(currentLabel || '');
  };

  const handleSavePreviewLabel = () => {
    if (editingPreviewCellId) {
      setCurrentProject(prev => ({
        ...prev,
        cells: prev.cells.map(cell =>
          cell.id === editingPreviewCellId ? { ...cell, customLabel: editingLabel } : cell
        ),
      }));
      setEditingPreviewCellId(null);
      setEditingLabel('');
    }
  };

  const handleUploadImage = (cellId: string) => {
    setUploadTargetCellId(cellId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetCellId) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCurrentProject(prev => ({
        ...prev,
        cells: prev.cells.map(cell =>
          cell.id === uploadTargetCellId
            ? { id: cell.id, type: 'image', imageData: dataUrl }
            : cell
        ),
      }));
      setUploadTargetCellId(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleToggleLanguage = () => {
    setCurrentProject(prev => ({
      ...prev,
      language: prev.language === 'ru' ? 'en' : 'ru',
    }));
  };

  const handleOpenPreview = () => {
    setPreviewLanguage(currentProject.language);
    setShowPreview(true);
  };

  const generatePreviewCanvas = async () => {
    if (!previewRef.current) return null;

    const originalTransform = previewRef.current.style.transform;
    previewRef.current.style.transform = 'scale(1)';

    await document.fonts.ready;

    const canvas = await html2canvas(previewRef.current, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      imageTimeout: 15000,
      onclone: (_clonedDoc: Document, element: HTMLElement) => {
        const allElements = element.querySelectorAll('*');
        allElements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          const isEmojiSpan = htmlEl.dataset.emoji === 'true';
          if (isEmojiSpan) {
            htmlEl.style.fontFamily = EMOJI_FONTS;
          } else {
            const currentFont = htmlEl.style.fontFamily;
            if (!currentFont || currentFont.trim() === '') {
              htmlEl.style.fontFamily = UNICODE_FONTS;
            }
          }
          htmlEl.style.webkitFontSmoothing = 'auto';
          (htmlEl.style as any).mozOsxFontSmoothing = 'auto';
        });
        element.style.fontFamily = UNICODE_FONTS;
      },
      ignoreElements: (element) => {
        return element.classList?.contains('preview-controls') || false;
      },
    });

    previewRef.current.style.transform = originalTransform;
    return canvas;
  };

  const handleExportPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const canvas = await generatePreviewCanvas();
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        setAlertMsg('Не удалось создать изображение');
        setIsExporting(false);
        return;
      }

      const imgData = canvas.toDataURL('image/png', 0.95);
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;
      const aspectRatio = canvas.width / canvas.height;
      let imgWidth = maxWidth;
      let imgHeight = imgWidth / aspectRatio;
      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = imgHeight * aspectRatio;
      }
      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);

      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const fileName = `${currentProject.name || 'расписание'}.pdf`;

      let opened = false;
      try {
        const newWindow = window.open(blobUrl, '_blank');
        if (newWindow) {
          opened = true;
          try { newWindow.document.title = fileName; } catch {}
        }
      } catch (e) {
        console.error('Window open failed:', e);
      }

      if (opened) {
        setAlertMsg('PDF открыт ✅ Используйте меню для сохранения');
        setTimeout(() => { try { URL.revokeObjectURL(blobUrl); } catch {} }, 10 * 60 * 1000);
      } else {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => { try { URL.revokeObjectURL(blobUrl); } catch {} }, 1000);
        setAlertMsg('PDF скачивается ✅');
      }
    } catch (error) {
      console.error('Export PDF error:', error);
      setAlertMsg('Ошибка создания PDF');
    }

    setIsExporting(false);
  };

  // 🆕 ПРЕДУПРЕЖДЕНИЕ перед скачиванием PDF: стабильно работает только с компьютера
  const handleExportPDFRequest = () => {
    const mobile = isMobileDevice();
    setConfirmState({
      title: '⚠️ Скачивание PDF',
      message: mobile
        ? 'Вы работаете с мобильного устройства. Функция скачивания PDF стабильно работает только при работе с компьютера. На телефоне или в мини-апе ВКонтакте файл может не сохраниться. Для гарантированного результата откройте приложение на компьютере. Всё равно продолжить?'
        : 'Функция скачивания PDF стабильно работает только при работе с компьютера. На мобильных устройствах и в мини-апе ВКонтакте файл может не сохраниться. Продолжить скачивание?',
      confirmLabel: 'Скачать PDF',
      danger: false,
      action: () => {
        handleExportPDF();
      },
    });
  };

  const handlePrint = async () => {
    try {
      const canvas = await generatePreviewCanvas();
      if (!canvas) return;
      const imgData = canvas.toDataURL('image/png');
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        setAlertMsg('Разрешите всплывающие окна для печати');
        return;
      }
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Печать - ${currentProject.name}</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
            img { max-width: 100%; max-height: 100vh; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <img src="${imgData}" onload="window.print(); window.close();" />
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error('Print error:', error);
      setAlertMsg('Ошибка печати');
    }
  };

  const handleSaveProject = () => {
    setProjects(prev => {
      const existing = prev.find(p => p.id === currentProject.id);
      if (existing) {
        return prev.map(p => p.id === currentProject.id ? { ...currentProject, updatedAt: Date.now() } : p);
      }
      return [{ ...currentProject, updatedAt: Date.now() }, ...prev];
    });
    setAlertMsg('Проект сохранён ✅');
  };

  const handleLoadProject = (project: SavedProject) => {
    setCurrentProject(project);
    setShowProjects(false);
  };

  const handleDeleteProject = (id: string) => {
    setConfirmState({
      title: 'Удалить проект?',
      message: 'Это действие нельзя отменить.',
      confirmLabel: 'Удалить',
      danger: true,
      action: () => {
        setProjects(prev => prev.filter(p => p.id !== id));
      },
    });
  };

  const handleNewProject = () => {
    setCurrentProject({
      id: generateId(),
      name: 'Новое расписание',
      template: 'horizontal',
      cells: createEmptyCells('horizontal'),
      language: 'ru',
      updatedAt: Date.now(),
    });
    setCellStyles({});
    setSelectedCellId(null);
    setShowProjects(false);
  };

  const renderCell = (cell: ScheduleCell) => {
    const pictogram = cell.pictogramId ? PICTOGRAMS.find(p => p.id === cell.pictogramId) : null;
    const label = cell.customLabel || (pictogram ? pictogram[currentProject.language] : '');
    const isDragOver = dragOverCellId === cell.id;

    return (
      <div
        key={cell.id}
        onDragOver={(e) => handleDragOver(e, cell.id)}
        onDragLeave={handleDragLeave}
        onDrop={() => handleDrop(cell.id)}
        className={`relative aspect-square rounded-xl border-2 border-dashed transition-all overflow-hidden flex flex-col ${
          isDragOver ? 'border-purple-500 bg-purple-100 scale-105' : 'border-purple-200 bg-white'
        } ${cell.type !== 'empty' ? 'border-solid' : ''}`}
      >
        {cell.type === 'empty' ? (
          <div className="w-full h-full flex items-center justify-center text-purple-300">
            <Plus className="w-6 h-6" />
          </div>
        ) : (
          <>
            <div className="flex-[7] flex items-center justify-center overflow-hidden px-1 pt-1 relative group">
              {cell.type === 'pictogram' && pictogram && (
                <span
                  className="select-none leading-none"
                  style={{
                    fontSize: 'clamp(28px, 5vw, 48px)',
                    lineHeight: 1,
                    fontFamily: EMOJI_FONTS,
                  }}
                >
                  {pictogram.emoji}
                </span>
              )}
              {cell.type === 'image' && cell.imageData && (
                <img src={cell.imageData} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
              )}
            </div>

            {label && (
              <div className="flex-[3] flex items-center justify-center px-1.5 pb-1.5 border-t border-gray-100">
                <p
                  className="text-[10px] sm:text-xs font-semibold text-gray-700 text-center w-full leading-tight"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    textOverflow: 'ellipsis',
                    fontFamily: UNICODE_FONTS,
                  }}
                >
                  {label}
                </p>
              </div>
            )}

            <div className="action-buttons-overlay absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <button
                onClick={(e) => { e.stopPropagation(); handleEditLabel(cell.id, cell.customLabel); }}
                className="p-1 bg-white rounded-full shadow hover:bg-purple-50"
                title="Подпись"
              >
                <Languages className="w-3 h-3 text-purple-600" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleUploadImage(cell.id); }}
                className="p-1 bg-white rounded-full shadow hover:bg-purple-50"
                title="Загрузить фото"
              >
                <Image className="w-3 h-3 text-purple-600" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleClearCell(cell.id); }}
                className="p-1 bg-white rounded-full shadow hover:bg-red-50"
                title="Очистить"
              >
                <Trash2 className="w-3 h-3 text-red-500" />
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  // Рендер ячейки предпросмотра:
  // • клик по картинке/эмодзи — выделение плитки для настройки
  // • клик по подписи — редактирование подписи
  const renderPreviewCell = (cell: ScheduleCell) => {
    const pictogram = cell.pictogramId ? PICTOGRAMS.find(p => p.id === cell.pictogramId) : null;
    const label = cell.customLabel || (pictogram ? pictogram[previewLanguage] : '');
    const style = getCellStyle(cell.id);
    const isSelected = selectedCellId === cell.id;

    const baseEmojiSize = 80;
    const baseTextSize = 18;
    const emojiSize = baseEmojiSize * style.emojiScale;
    const textSize = baseTextSize * style.textScale;

    const emojiAlignClasses = getEmojiAlignClasses(style.emojiAlign);
    const textAlignClass =
      style.textAlign === 'left' ? 'text-left justify-start' :
      style.textAlign === 'right' ? 'text-right justify-end' :
      'text-center justify-center';

    return (
      <div
        key={cell.id}
        onClick={() => setSelectedCellId(cell.id)}
        className={`group relative aspect-square rounded-2xl border-4 bg-white overflow-hidden transition-all cursor-pointer flex flex-col ${
          isSelected
            ? 'border-purple-600 ring-4 ring-purple-300 scale-[1.02] shadow-xl'
            : 'border-gray-300 hover:border-purple-400'
        }`}
        style={{ fontFamily: UNICODE_FONTS }}
      >
        {cell.type === 'empty' ? (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Plus className="w-16 h-16" />
          </div>
        ) : (
          <>
            {/* ЗОНА 1: картинка/эмодзи — клик выделяет плитку для настройки */}
            <div
              className={`flex-[7] flex overflow-hidden p-0 min-w-0 min-h-0 cursor-pointer ${emojiAlignClasses}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCellId(cell.id);
              }}
              title="Клик по картинке — настройка плитки"
            >
              {cell.type === 'pictogram' && pictogram && (
                <span
                  data-emoji="true"
                  className="select-none leading-none transition-all duration-200"
                  style={{
                    fontSize: `${emojiSize}px`,
                    lineHeight: 1,
                    fontFamily: EMOJI_FONTS,
                  }}
                >
                  {pictogram.emoji}
                </span>
              )}
              {cell.type === 'image' && cell.imageData && (
                <img
                  src={cell.imageData}
                  alt=""
                  className="max-w-full max-h-full object-contain transition-all duration-200"
                  style={{
                    transform: `scale(${style.emojiScale})`,
                    transformOrigin: 'center center',
                  }}
                />
              )}
            </div>

            {/* ЗОНА 2: подпись — клик редактирует её */}
            {label && (
              <div
                className={`flex-[3] flex p-0 min-w-0 min-h-0 border-t border-gray-100 cursor-text ${textAlignClass}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreviewEditLabel(cell.id);
                }}
                title="Клик по тексту — редактирование подписи"
              >
                <p
                  className="font-semibold text-gray-800 w-full leading-tight transition-all duration-200 px-2"
                  style={{
                    fontSize: `${textSize}px`,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    textOverflow: 'ellipsis',
                    fontFamily: UNICODE_FONTS,
                  }}
                >
                  {label}
                </p>
              </div>
            )}

            {/* Если подписи нет — кнопка добавления (не попадает в PDF-экспорт) */}
            {!label && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreviewEditLabel(cell.id);
                }}
                className={`preview-controls absolute bottom-1 left-1/2 -translate-x-1/2 bg-purple-600 hover:bg-purple-700 text-white rounded-full px-2 py-1 text-[10px] font-semibold flex items-center gap-1 shadow-md transition-opacity ${
                  isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                title="Добавить подпись"
              >
                <Edit3 className="w-3 h-3" />
                Подпись
              </button>
            )}
          </>
        )}

        {/* Индикатор выделения */}
        {isSelected && (
          <div className="preview-controls absolute top-1 right-1 bg-purple-600 text-white rounded-full p-1 shadow-lg">
            <Check className="w-3 h-3" />
          </div>
        )}
      </div>
    );
  };

  // ЕДИНАЯ ПАНЕЛЬ УПРАВЛЕНИЯ размерами и позиционированием
  const renderStyleToolbar = () => {
    if (!selectedCellId) return null;

    const style = getCellStyle(selectedCellId);
    const selectedCell = currentProject.cells.find(c => c.id === selectedCellId);
    if (!selectedCell) return null;

    const pictogram = selectedCell.pictogramId ? PICTOGRAMS.find(p => p.id === selectedCell.pictogramId) : null;
    const cellLabel = selectedCell.customLabel || (pictogram ? pictogram[previewLanguage] : 'Пустая');

    // Матрица позиций для выравнивания иконки (3x3)
    const positions: AlignPosition[] = [
      'top-left', 'top-center', 'top-right',
      'center-left', 'center', 'center-right',
      'bottom-left', 'bottom-center', 'bottom-right',
    ];

    return (
      <div className="sticky top-0 z-20 bg-gradient-to-r from-purple-700 to-indigo-700 text-white rounded-xl shadow-xl mb-4 overflow-hidden">
        {/* Заголовок */}
        <div className="bg-black/20 px-4 py-2 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4" />
            <span className="font-semibold">Настройка плитки:</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-mono truncate max-w-[200px]">
              {selectedCell.type === 'empty' ? 'Пустая' : (cellLabel || 'Без подписи')}
            </span>
          </div>
          <button
            onClick={() => setSelectedCellId(null)}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            title="Снять выделение"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Контролы */}
        <div className="p-3 flex flex-wrap items-center gap-4">
          {/* Размер иконки */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-purple-200 font-semibold flex items-center gap-1">
              <Smile className="w-3 h-3" /> Иконка
            </label>
            <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
              <button
                onClick={() => updateSelectedStyle({ emojiScale: Math.max(MIN_SCALE, style.emojiScale - SCALE_STEP) })}
                disabled={style.emojiScale <= MIN_SCALE}
                className="w-7 h-7 bg-red-500 hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed rounded text-white flex items-center justify-center transition-colors"
                title="Уменьшить иконку"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono font-bold w-10 text-center">
                {Math.round(style.emojiScale * 100)}%
              </span>
              <button
                onClick={() => updateSelectedStyle({ emojiScale: Math.min(MAX_SCALE, style.emojiScale + SCALE_STEP) })}
                disabled={style.emojiScale >= MAX_SCALE}
                className="w-7 h-7 bg-green-500 hover:bg-green-600 disabled:opacity-30 disabled:cursor-not-allowed rounded text-white flex items-center justify-center transition-colors"
                title="Увеличить иконку"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Размер текста */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-purple-200 font-semibold flex items-center gap-1">
              <Type className="w-3 h-3" /> Текст
            </label>
            <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
              <button
                onClick={() => updateSelectedStyle({ textScale: Math.max(MIN_SCALE, style.textScale - SCALE_STEP) })}
                disabled={style.textScale <= MIN_SCALE}
                className="w-7 h-7 bg-red-500 hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed rounded text-white flex items-center justify-center transition-colors"
                title="Уменьшить текст"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono font-bold w-10 text-center">
                {Math.round(style.textScale * 100)}%
              </span>
              <button
                onClick={() => updateSelectedStyle({ textScale: Math.min(MAX_SCALE, style.textScale + SCALE_STEP) })}
                disabled={style.textScale >= MAX_SCALE}
                className="w-7 h-7 bg-green-500 hover:bg-green-600 disabled:opacity-30 disabled:cursor-not-allowed rounded text-white flex items-center justify-center transition-colors"
                title="Увеличить текст"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Позиционирование иконки (3x3 grid) */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-purple-200 font-semibold flex items-center gap-1">
              <AlignCenterVertical className="w-3 h-3" /> Позиция иконки
            </label>
            <div className="grid grid-cols-3 gap-0.5 bg-white/10 rounded-lg p-1">
              {positions.map((pos) => {
                const isActive = style.emojiAlign === pos;
                return (
                  <button
                    key={pos}
                    onClick={() => updateSelectedStyle({ emojiAlign: pos })}
                    className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-white text-purple-700'
                        : 'bg-white/5 hover:bg-white/20 text-white'
                    }`}
                    title={`Позиция: ${pos}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-purple-700' : 'bg-white'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Выравнивание текста */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-purple-200 font-semibold">
              Выравнивание текста
            </label>
            <div className="flex gap-0.5 bg-white/10 rounded-lg p-1">
              <button
                onClick={() => updateSelectedStyle({ textAlign: 'left' })}
                className={`w-9 h-7 rounded flex items-center justify-center transition-colors ${
                  style.textAlign === 'left' ? 'bg-white text-purple-700' : 'bg-white/5 hover:bg-white/20 text-white'
                }`}
                title="По левому краю"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => updateSelectedStyle({ textAlign: 'center' })}
                className={`w-9 h-7 rounded flex items-center justify-center transition-colors ${
                  style.textAlign === 'center' ? 'bg-white text-purple-700' : 'bg-white/5 hover:bg-white/20 text-white'
                }`}
                title="По центру"
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                onClick={() => updateSelectedStyle({ textAlign: 'right' })}
                className={`w-9 h-7 rounded flex items-center justify-center transition-colors ${
                  style.textAlign === 'right' ? 'bg-white text-purple-700' : 'bg-white/5 hover:bg-white/20 text-white'
                }`}
                title="По правому краю"
              >
                <AlignRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Разделитель */}
          <div className="w-px h-12 bg-white/20 self-end mb-1" />

          {/* Кнопки действий */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-purple-200 font-semibold">
              Действия
            </label>
            <div className="flex gap-1">
              <button
                onClick={applyStyleToAll}
                className="h-7 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-md"
                title="Применить ко всем"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Ко всем
              </button>
              <button
                onClick={resetSelectedStyle}
                className="h-7 px-3 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Сбросить"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Сброс
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSchedule = () => {
    const gridClass = {
      horizontal: 'grid-cols-4',
      vertical: 'grid-cols-2',
      grid3: 'grid-cols-3',
      grid4: 'grid-cols-4',
    }[currentProject.template];

    return (
      <div
        ref={scheduleRef}
        className={`grid ${gridClass} gap-2 p-4 bg-white rounded-2xl shadow-sm`}
      >
        {currentProject.cells.map(renderCell)}
      </div>
    );
  };

  const renderPreviewSchedule = () => {
    const gridClass = {
      horizontal: 'grid-cols-4',
      vertical: 'grid-cols-2',
      grid3: 'grid-cols-3',
      grid4: 'grid-cols-4',
    }[currentProject.template];

    return (
      <div
        ref={previewRef}
        className={`grid ${gridClass} gap-6 p-8 bg-white`}
        style={{
          fontFamily: UNICODE_FONTS,
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        {currentProject.cells.map(renderPreviewCell)}
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-purple-50 to-indigo-50 flex flex-col">
      {/* РАСШИРЕННАЯ ШАПКА с отступом от верхней границы (safe-area для мобильных) */}
      <header className="bg-purple-700 shadow-md sticky top-0 z-20 pt-[env(safe-area-inset-top)]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-white hover:bg-purple-600 rounded-lg transition-colors shrink-0"
            aria-label="Назад"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-purple-200 leading-tight">Визуальное расписание</h1>
            <input
              type="text"
              value={currentProject.name}
              onChange={(e) => setCurrentProject(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-transparent text-white font-bold text-lg border-b border-white/30 focus:border-white focus:outline-none"
              placeholder="Название проекта"
            />
          </div>
          <button
            onClick={handleToggleLanguage}
            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0"
          >
            <Languages className="w-4 h-4" />
            {currentProject.language === 'ru' ? 'RU' : 'EN'}
          </button>
          <button
            onClick={handleSaveProject}
            className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg shrink-0"
            title="Сохранить"
          >
            <Save className="w-5 h-5" />
          </button>
          <button
            onClick={handleOpenPreview}
            disabled={isExporting}
            className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg shrink-0 disabled:opacity-50 flex items-center gap-1"
            title="Предпросмотр и экспорт"
          >
            {isExporting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <FileDown className="w-5 h-5" />
                <span className="text-xs font-semibold hidden sm:inline">PDF</span>
              </>
            )}
          </button>
          <button
            onClick={() => setShowProjects(!showProjects)}
            className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg shrink-0"
            title="Мои проекты"
          >
            <FolderOpen className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        <aside className="bg-white rounded-2xl p-4 shadow-sm space-y-4 h-fit lg:sticky lg:top-24">
          <div>
            <h2 className="text-sm font-bold text-purple-700 mb-2">Шаблон</h2>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTemplateChange(t.id)}
                  className={`p-2 rounded-lg border-2 text-xs font-semibold flex flex-col items-center gap-1 ${
                    currentProject.template === t.id
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 text-gray-600 hover:border-purple-200'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-3 h-3 text-gray-500" />
                </button>
              )}
            </div>

            {!searchQuery && (
              <div className="flex flex-wrap gap-1 mb-2">
                {PICTOGRAM_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                    }`}
                  >
                    {cat.icon} {cat.ru}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-6 gap-1 max-h-[380px] overflow-y-auto">
              {filteredPictograms.map(p => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={() => handleDragStart(p)}
                  onClick={() => {
                    const emptyCell = currentProject.cells.find(c => c.type === 'empty');
                    if (emptyCell) handleAddPictogramToCell(emptyCell.id, p);
                  }}
                  className="aspect-square rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 flex flex-col items-center justify-center p-0.5 cursor-grab active:cursor-grabbing transition-colors"
                  title={`${p.ru} / ${p.en}`}
                >
                  <span className="text-xl" style={{ fontFamily: EMOJI_FONTS }}>{p.emoji}</span>
                  <span className="text-[9px] text-gray-600 text-center line-clamp-1 mt-0.5">
                    {p[currentProject.language]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Image className="w-4 h-4" />
            Загрузить своё фото
          </button>
        </aside>

        <section className="space-y-4">
          {renderSchedule()}

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-purple-700 mb-2">💡 Подсказки</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Перетащите пиктограмму из библиотеки в ячейку</li>
              <li>• Кликните на пиктограмму — добавится в первую пустую ячейку</li>
              <li>• 📥 Кнопка «PDF» откроет режим предпросмотра с настройкой</li>
              <li>• 🎯 В предпросмотре: клик по картинке — выделение, клик по подписи — правка текста</li>
              <li>• 🛠️ Сверху появится панель с регуляторами размера и позиции</li>
              <li>• ✨ «Ко всем» — применить текущие настройки ко всем плиткам</li>
              <li>• ⚠️ Скачивание PDF стабильно работает только с компьютера</li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setShowScenarios(!showScenarios)}
              className="w-full px-4 py-3 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-purple-700 text-sm">Сценарии использования</h3>
              </div>
              <ChevronDown className={`w-4 h-4 text-purple-600 transition-transform duration-200 ${showScenarios ? 'rotate-180' : ''}`} />
            </button>
            {showScenarios && (
              <div className="px-4 pb-4 space-y-3 text-sm text-gray-700">
                <div className="bg-purple-50 rounded-xl p-3">
                  <p className="font-bold text-purple-800 mb-1">🧩 Расписание дня для ребёнка с РАС</p>
                  <p className="text-xs leading-relaxed">Линейное расписание на 5–7 ячеек снижает тревожность и формирует предсказуемость.</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="font-bold text-blue-800 mb-1">🏫 Режим дня в детском саду</p>
                  <p className="text-xs leading-relaxed">Сетка 3×3. Распечатайте на A4 и ламинируйте.</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="font-bold text-green-800 mb-1">📝 Алгоритм выполнения задания</p>
                  <p className="text-xs leading-relaxed">Вертикальное расписание на 4–6 шагов.</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setShowFaq(!showFaq)}
              className="w-full px-4 py-3 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-purple-700 text-sm">Частые вопросы</h3>
              </div>
              <ChevronDown className={`w-4 h-4 text-purple-600 transition-transform duration-200 ${showFaq ? 'rotate-180' : ''}`} />
            </button>
            {showFaq && (
              <div className="px-4 pb-4 space-y-3 text-sm">
                <div>
                  <p className="font-bold text-gray-800 mb-1">❓ Как настроить размер и положение?</p>
                  <p className="text-xs text-gray-600 leading-relaxed">В предпросмотре кликните на картинку в плитке — она выделится, сверху появится панель с регуляторами размера иконки/текста, матрицей позиций 3×3 и выравниванием текста. Клик по подписи открывает её редактирование.</p>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="font-bold text-gray-800 mb-1">❓ Как применить ко всем плиткам?</p>
                  <p className="text-xs text-gray-600 leading-relaxed">Выделите плитку с нужными настройками и нажмите кнопку «✨ Ко всем» в панели инструментов.</p>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="font-bold text-gray-800 mb-1">❓ Как распечатать?</p>
                  <p className="text-xs text-gray-600 leading-relaxed">Нажмите 📥 PDF → «Печать» в панели предпросмотра. Внимание: скачивание PDF стабильно работает только при работе с компьютера — на телефоне файл может не сохраниться.</p>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="font-bold text-gray-800 mb-1">❓ Как изменить подписи?</p>
                  <p className="text-xs text-gray-600 leading-relaxed">В предпросмотре кликните на текст плитки — откроется редактор подписи. Если подписи нет — выделите плитку и нажмите кнопку «Подпись» внизу плитки.</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ПОЛНОЭКРАННЫЙ РЕЖИМ ПРЕДПРОСМОТРА */}
      {showPreview && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col">
          <div className="bg-purple-700 px-4 py-3 flex items-center justify-between gap-3 shadow-md pt-[calc(0.75rem+env(safe-area-inset-top))]">
            <div className="flex items-center gap-3">
              <Maximize2 className="w-5 h-5 text-white" />
              <h2 className="text-white font-bold text-lg">Предпросмотр и экспорт</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewLanguage(previewLanguage === 'ru' ? 'en' : 'ru')}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <Languages className="w-4 h-4" />
                {previewLanguage === 'ru' ? 'RU' : 'EN'}
              </button>
              <button
                onClick={() => { setShowPreview(false); setSelectedCellId(null); }}
                className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg"
                title="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
            <p className="text-sm text-amber-800">
              💡 <strong>Клик по картинке</strong> — выбор плитки для настройки, <strong>клик по подписи</strong> — редактирование текста
            </p>
          </div>

          <div className="flex-1 overflow-auto bg-gray-100 p-4 flex flex-col items-center">
            <div className="w-full max-w-[1200px]">
              {/* ЕДИНАЯ ПАНЕЛЬ УПРАВЛЕНИЯ (показывается только при выделении) */}
              {renderStyleToolbar()}

              {!selectedCellId && (
                <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-xl p-4 mb-4 text-center">
                  <p className="text-sm text-blue-800">
                    👆 Кликните на картинку в любой плитке ниже, чтобы настроить её размер и позицию
                  </p>
                </div>
              )}

              <div className="bg-white rounded-2xl shadow-lg p-4">
                {renderPreviewSchedule()}
              </div>
            </div>
          </div>

          <div className="bg-white border-t border-gray-200 p-4 shadow-lg">
            <div className="max-w-[1200px] mx-auto grid grid-cols-3 gap-3">
              <button
                onClick={handleExportPDFRequest}
                disabled={isExporting}
                className="py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold flex flex-col items-center justify-center gap-1 disabled:opacity-50 transition-colors"
              >
                {isExporting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <FileDown className="w-5 h-5" />
                )}
                <span className="text-xs">PDF</span>
              </button>
              <button
                onClick={handlePrint}
                disabled={isExporting}
                className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex flex-col items-center justify-center gap-1 disabled:opacity-50 transition-colors"
              >
                <Printer className="w-5 h-5" />
                <span className="text-xs">Печать</span>
              </button>
              <button
                onClick={() => { setShowPreview(false); setSelectedCellId(null); }}
                className="py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <Minimize2 className="w-5 h-5" />
                <span className="text-xs">Закрыть</span>
              </button>
            </div>
            {/* 🆕 Постоянное предупреждение под кнопками */}
            <p className="mt-3 text-center text-[11px] text-gray-500 flex items-center justify-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              Скачивание PDF стабильно работает только при работе с компьютера. На мобильных устройствах файл может не сохраниться.
            </p>
          </div>
        </div>
      )}

      {editingPreviewCellId && (
        <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-purple-700 flex items-center gap-2">
              <Edit3 className="w-5 h-5" />
              Редактирование подписи
            </h3>
            <input
              type="text"
              value={editingLabel}
              onChange={(e) => setEditingLabel(e.target.value)}
              placeholder="Введите подпись..."
              className="w-full px-4 py-3 rounded-xl border-2 border-purple-200 focus:outline-none focus:border-purple-500 text-base"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSavePreviewLabel()}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setEditingPreviewCellId(null); setEditingLabel(''); }}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold"
              >
                Отмена
              </button>
              <button
                onClick={handleSavePreviewLabel}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {showProjects && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md max-h-[80vh] rounded-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-purple-700 flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                Мои проекты
              </h2>
              <button
                onClick={() => setShowProjects(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <button
                onClick={handleNewProject}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Новый проект
              </button>
              {projects.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">Пока нет сохранённых проектов</p>
              ) : (
                projects.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 p-3 rounded-xl border border-purple-200 hover:border-purple-400"
                  >
                    <button
                      onClick={() => handleLoadProject(p)}
                      className="flex-1 text-left"
                    >
                      <p className="font-semibold text-sm text-gray-800 truncate">{p.name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(p.updatedAt).toLocaleString('ru-RU')}
                      </p>
                    </button>
                    <button
                      onClick={() => handleDeleteProject(p.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {editingCellId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-purple-700">Подпись к ячейке</h3>
            <input
              type="text"
              value={editingLabel}
              onChange={(e) => setEditingLabel(e.target.value)}
              placeholder="Введите подпись..."
              className="w-full px-4 py-3 rounded-xl border-2 border-purple-200 focus:outline-none focus:border-purple-500"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveLabel()}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEditingCellId(null)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveLabel}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <ConfirmDialog
        isOpen={confirmState !== null}
        title={confirmState?.title ?? ''}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        danger={confirmState?.danger}
        onConfirm={() => { confirmState?.action(); setConfirmState(null); }}
        onCancel={() => setConfirmState(null)}
      />
      <AlertDialog
        isOpen={alertMsg !== null}
        message={alertMsg ?? ''}
        onClose={() => setAlertMsg(null)}
      />
    </div>
  );
}
