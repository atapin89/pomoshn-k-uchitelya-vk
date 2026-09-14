import { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Upload,
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
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PICTOGRAMS, PICTOGRAM_CATEGORIES, type Pictogram } from '@/data/pictograms';
import { ConfirmDialog, AlertDialog } from './ConfirmDialog';

type TemplateType = 'horizontal' | 'vertical' | 'grid3' | 'grid4';
type Language = 'ru' | 'en';

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
  
  // 🆕 Режим предпросмотра
  const [showPreview, setShowPreview] = useState(false);
  const [previewLanguage, setPreviewLanguage] = useState<Language>('ru');
  const [editingPreviewCellId, setEditingPreviewCellId] = useState<string | null>(null);

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

  const handleDragStart = (pictogram: Pictogram) => {
    setDraggedPictogram(pictogram);
  };

  const handleDragOver = (e: React.DragEvent, cellId: string) => {
    e.preventDefault();
    setDragOverCellId(cellId);
  };

  const handleDragLeave = () => {
    setDragOverCellId(null);
  };

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

  // 🆕 Редактирование подписи в режиме предпросмотра
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

  // 🆕 Открыть режим предпросмотра
  const handleOpenPreview = () => {
    setPreviewLanguage(currentProject.language);
    setShowPreview(true);
  };

  // 🆕 Генерация canvas с правильными пропорциями для A4
  const generatePreviewCanvas = async () => {
    if (!previewRef.current) return null;

    // Временно увеличиваем размер для лучшего качества
    const originalTransform = previewRef.current.style.transform;
    previewRef.current.style.transform = 'scale(1)';

    const canvas = await html2canvas(previewRef.current, {
      backgroundColor: '#ffffff',
      scale: 2, // Меньше scale для стабильности
      useCORS: true,
      allowTaint: true,
      logging: false,
      imageTimeout: 15000,
      ignoreElements: (element) => {
        // Скрываем элементы управления в превью
        return element.classList?.contains('preview-controls') || false;
      },
    });

    previewRef.current.style.transform = originalTransform;
    return canvas;
  };

  // 🆕 Экспорт в PDF
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
      
      // A4 альбомная: 297 × 210 мм
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Оставляем поля 15мм с каждой стороны
      const margin = 15;
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;
      
      // Сохраняем пропорции
      const aspectRatio = canvas.width / canvas.height;
      let imgWidth = maxWidth;
      let imgHeight = imgWidth / aspectRatio;
      
      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = imgHeight * aspectRatio;
      }
      
      // Центрируем на странице
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
        setTimeout(() => {
          try { URL.revokeObjectURL(blobUrl); } catch {}
        }, 10 * 60 * 1000);
      } else {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => {
          try { URL.revokeObjectURL(blobUrl); } catch {}
        }, 1000);
        setAlertMsg('PDF скачивается ✅');
      }
    } catch (error) {
      console.error('Export PDF error:', error);
      setAlertMsg('Ошибка создания PDF');
    }

    setIsExporting(false);
  };

  // 🆕 Печать
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

  // 🆕 Поделиться (Web Share API)
  const handleShare = async () => {
    try {
      const canvas = await generatePreviewCanvas();
      if (!canvas) return;

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setAlertMsg('Не удалось создать изображение');
          return;
        }

        const file = new File([blob], `${currentProject.name}.png`, { type: 'image/png' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: currentProject.name,
              text: 'Визуальное расписание',
            });
          } catch (err) {
            console.error('Share cancelled:', err);
          }
        } else {
          setAlertMsg('Функция «Поделиться» недоступна в этом браузере');
        }
      }, 'image/png');
    } catch (error) {
      console.error('Share error:', error);
      setAlertMsg('Ошибка отправки');
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
    setShowProjects(false);
  };

  // Рендер ячейки для основного редактора
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
        className={`relative aspect-square rounded-xl border-2 border-dashed transition-all overflow-hidden ${
          isDragOver ? 'border-purple-500 bg-purple-100 scale-105' : 'border-purple-200 bg-white'
        } ${cell.type !== 'empty' ? 'border-solid' : ''}`}
      >
        {cell.type === 'empty' ? (
          <div className="w-full h-full flex items-center justify-center text-purple-300">
            <Plus className="w-6 h-6" />
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-1.5 relative group">
            {cell.type === 'pictogram' && pictogram && (
              <span className="text-4xl sm:text-5xl select-none flex-shrink-0">{pictogram.emoji}</span>
            )}
            {cell.type === 'image' && cell.imageData && (
              <img src={cell.imageData} alt="" className="w-full h-full object-contain rounded-lg" />
            )}
            {label && (
              <p
                className="text-xs sm:text-sm font-semibold text-gray-700 text-center mt-1 w-full px-1"
                style={{
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                }}
              >
                {label}
              </p>
            )}

            <div className="action-buttons-overlay absolute top-[50pt] right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleEditLabel(cell.id, cell.customLabel)}
                className="p-1 bg-white rounded-full shadow hover:bg-purple-50"
                title="Подпись"
              >
                <Languages className="w-3 h-3 text-purple-600" />
              </button>
              <button
                onClick={() => handleUploadImage(cell.id)}
                className="p-1 bg-white rounded-full shadow hover:bg-purple-50"
                title="Загрузить фото"
              >
                <Image className="w-3 h-3 text-purple-600" />
              </button>
              <button
                onClick={() => handleClearCell(cell.id)}
                className="p-1 bg-white rounded-full shadow hover:bg-red-50"
                title="Очистить"
              >
                <Trash2 className="w-3 h-3 text-red-500" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 🆕 Рендер ячейки для предпросмотра (с пропорциями A4)
  const renderPreviewCell = (cell: ScheduleCell) => {
    const pictogram = cell.pictogramId ? PICTOGRAMS.find(p => p.id === cell.pictogramId) : null;
    const label = cell.customLabel || (pictogram ? pictogram[previewLanguage] : '');

    return (
      <div
        key={cell.id}
        className="relative aspect-square rounded-2xl border-4 border-gray-300 bg-white overflow-hidden flex flex-col items-center justify-center p-4 hover:border-purple-500 cursor-pointer transition-colors group"
        onClick={() => handlePreviewEditLabel(cell.id)}
      >
        {cell.type === 'empty' ? (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Plus className="w-16 h-16" />
          </div>
        ) : (
          <>
            {cell.type === 'pictogram' && pictogram && (
              <span className="text-7xl sm:text-8xl select-none mb-3">{pictogram.emoji}</span>
            )}
            {cell.type === 'image' && cell.imageData && (
              <img src={cell.imageData} alt="" className="w-full h-3/4 object-contain rounded-xl mb-2" />
            )}
            {label && (
              <p
                className="text-lg sm:text-xl font-semibold text-gray-800 text-center w-full px-2"
                style={{
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                }}
              >
                {label}
              </p>
            )}
          </>
        )}
        
        {/* Индикатор редактирования */}
        <div className="preview-controls absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <Edit3 className="w-3 h-3" />
            Изменить
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

  // 🆕 Рендер предпросмотра (для PDF)
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
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, 'Noto Sans', sans-serif",
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
      <header className="bg-purple-700 shadow-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
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
            title="Проекты"
          >
            <Upload className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        <aside className="bg-white rounded-2xl p-4 shadow-sm space-y-4 h-fit lg:sticky lg:top-20">
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
                  <span className="text-xl">{p.emoji}</span>
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
              <li>• 📥 Кнопка «PDF» откроет режим предпросмотра с редактированием</li>
              <li>• В предпросмотре кликните на ячейку для изменения подписи</li>
              <li>• Экспортируйте в PDF, распечатайте или отправьте в мессенджер</li>
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
                  <p className="font-bold text-gray-800 mb-1">❓ Как распечатать расписание?</p>
                  <p className="text-xs text-gray-600 leading-relaxed">Нажмите 📥 PDF → «Предпросмотр» → «Печать».</p>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="font-bold text-gray-800 mb-1">❓ Можно ли изменить подписи перед экспортом?</p>
                  <p className="text-xs text-gray-600 leading-relaxed">Да! В режиме предпросмотра кликните на любую ячейку — откроется редактор подписи.</p>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="font-bold text-gray-800 mb-1">❓ Как отправить расписание в чат?</p>
                  <p className="text-xs text-gray-600 leading-relaxed">В предпросмотре нажмите «Поделиться» → выберите мессенджер.</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* 🆕 ПОЛНОЭКРАННЫЙ РЕЖИМ ПРЕДПРОСМОТРА */}
      {showPreview && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col">
          {/* Панель управления превью */}
          <div className="bg-purple-700 px-4 py-3 flex items-center justify-between gap-3 shadow-md">
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
                onClick={() => setShowPreview(false)}
                className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg"
                title="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Подсказка */}
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
            <p className="text-sm text-amber-800">
              💡 <strong>Кликните на любую ячейку</strong>, чтобы изменить подпись перед экспортом
            </p>
          </div>

          {/* Область предпросмотра (прокручиваемая) */}
          <div className="flex-1 overflow-auto bg-gray-100 p-4 flex items-start justify-center">
            <div className="bg-white rounded-2xl shadow-lg w-full max-w-[1200px] p-4">
              {renderPreviewSchedule()}
            </div>
          </div>

          {/* Панель действий */}
          <div className="bg-white border-t border-gray-200 p-4 shadow-lg">
            <div className="max-w-[1200px] mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={handleExportPDF}
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
                onClick={handleShare}
                disabled={isExporting}
                className="py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold flex flex-col items-center justify-center gap-1 disabled:opacity-50 transition-colors"
              >
                <Upload className="w-5 h-5" />
                <span className="text-xs">Поделиться</span>
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <Minimize2 className="w-5 h-5" />
                <span className="text-xs">Закрыть</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка редактирования подписи в предпросмотре */}
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
                onClick={() => {
                  setEditingPreviewCellId(null);
                  setEditingLabel('');
                }}
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
              <h2 className="text-lg font-bold text-purple-700">Мои проекты</h2>
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
        onConfirm={() => {
          confirmState?.action();
          setConfirmState(null);
        }}
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
