import { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Download,
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
  FileImage,
  Check,
  ChevronDown,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PICTOGRAMS, PICTOGRAM_CATEGORIES, type Pictogram } from '@/data/pictograms';
import { ConfirmDialog, AlertDialog } from './ConfirmDialog';

// ===== ТИПЫ =====

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

// ===== КОНСТАНТЫ =====

const STORAGE_KEY = 'visual-schedule-projects';

const TEMPLATES: { id: TemplateType; label: string; icon: React.ReactNode; maxCells: number }[] = [
  { id: 'horizontal', label: 'Линейный', icon: <LayoutList className="w-3 h-3" />, maxCells: 8 },
  { id: 'vertical', label: 'Вертикальный', icon: <LayoutList className="w-3 h-3 rotate-90" />, maxCells: 8 },
  { id: 'grid3', label: '3×3', icon: <Grid3x3 className="w-3 h-3" />, maxCells: 9 },
  { id: 'grid4', label: '4×4', icon: <LayoutGrid className="w-3 h-3" />, maxCells: 16 },
];

// ===== УТИЛИТЫ =====

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

// ===== КОМПОНЕНТ =====

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
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [draggedPictogram, setDraggedPictogram] = useState<Pictogram | null>(null);
  const [dragOverCellId, setDragOverCellId] = useState<string | null>(null);
  const [showFaq, setShowFaq] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);

  const scheduleRef = useRef<HTMLDivElement>(null);
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

  const currentTemplate = TEMPLATES.find(t => t.id === currentProject.template)!;
  
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
        cell.id === cellId
          ? { id: cell.id, type: 'empty' }
          : cell
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
          cell.id === editingCellId
            ? { ...cell, customLabel: editingLabel }
            : cell
        ),
      }));
      setEditingCellId(null);
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

  const handleExportPNG = async () => {
    if (!scheduleRef.current) return;
    try {
      const canvas = await html2canvas(scheduleRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = `${currentProject.name}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setAlertMsg('PNG сохранён ✅');
    } catch (error) {
      setAlertMsg('Ошибка экспорта PNG');
    }
    setShowExportMenu(false);
  };

  const handleExportPDF = async () => {
    if (!scheduleRef.current) return;
    try {
      const canvas = await html2canvas(scheduleRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, Math.min(imgHeight, pageHeight - 20));
      pdf.save(`${currentProject.name}.pdf`);
      setAlertMsg('PDF сохранён ✅');
    } catch (error) {
      setAlertMsg('Ошибка экспорта PDF');
    }
    setShowExportMenu(false);
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
        className={`relative aspect-square rounded-lg border-2 border-dashed transition-all ${
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
              <span className="text-3xl sm:text-4xl select-none">{pictogram.emoji}</span>
            )}
            {cell.type === 'image' && cell.imageData && (
              <img src={cell.imageData} alt="" className="w-full h-full object-contain rounded" />
            )}
            {label && (
              <p className="text-[10px] sm:text-xs font-semibold text-gray-700 text-center mt-0.5 line-clamp-2">
                {label}
              </p>
            )}
            
            <div className="absolute top-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleEditLabel(cell.id, cell.customLabel)}
                className="p-0.5 bg-white rounded-full shadow hover:bg-purple-50"
                title="Подпись"
              >
                <Languages className="w-2.5 h-2.5 text-purple-600" />
              </button>
              <button
                onClick={() => handleUploadImage(cell.id)}
                className="p-0.5 bg-white rounded-full shadow hover:bg-purple-50"
                title="Загрузить фото"
              >
                <Image className="w-2.5 h-2.5 text-purple-600" />
              </button>
              <button
                onClick={() => handleClearCell(cell.id)}
                className="p-0.5 bg-white rounded-full shadow hover:bg-red-50"
                title="Очистить"
              >
                <Trash2 className="w-2.5 h-2.5 text-red-500" />
              </button>
            </div>
          </div>
        )}
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
        className={`grid ${gridClass} gap-1.5 p-3 bg-white rounded-xl shadow-sm`}
      >
        {currentProject.cells.map(renderCell)}
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-purple-50 to-indigo-50 flex flex-col">
      {/* Header */}
      <header className="bg-purple-700 shadow-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-3 py-2 flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 text-white hover:bg-purple-600 rounded-lg transition-colors"
            aria-label="Назад"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={currentProject.name}
              onChange={(e) => setCurrentProject(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-transparent text-white font-semibold text-sm border-b border-white/30 focus:border-white focus:outline-none"
              placeholder="Название"
            />
          </div>
          <button
            onClick={handleToggleLanguage}
            className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-[10px] font-semibold"
          >
            {currentProject.language === 'ru' ? 'RU' : 'EN'}
          </button>
          <button
            onClick={handleSaveProject}
            className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded"
            title="Сохранить"
          >
            <Save className="w-4 h-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded"
              title="Экспорт"
            >
              <Download className="w-4 h-4" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-purple-200 py-1 z-30">
                <button
                  onClick={handleExportPNG}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-purple-50 flex items-center gap-1.5"
                >
                  <FileImage className="w-3 h-3 text-purple-600" />
                  PNG
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-purple-50 flex items-center gap-1.5"
                >
                  <FileDown className="w-3 h-3 text-purple-600" />
                  PDF
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowProjects(!showProjects)}
            className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded"
            title="Проекты"
          >
            <Upload className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-3 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-3">
        {/* Левая панель: библиотека */}
        <aside className="bg-white rounded-xl p-3 shadow-sm space-y-3 h-fit lg:sticky lg:top-16">
          <div>
            <h2 className="text-xs font-bold text-purple-700 mb-1.5">Шаблон</h2>
            <div className="grid grid-cols-4 gap-1">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTemplateChange(t.id)}
                  className={`p-1.5 rounded border-2 text-[10px] font-semibold flex flex-col items-center gap-0.5 ${
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
            <div className="relative mb-1.5">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск..."
                className="w-full pl-7 pr-2 py-1.5 rounded-lg border border-purple-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded"
                >
                  <X className="w-2.5 h-2.5 text-gray-500" />
                </button>
              )}
            </div>

            {!searchQuery && (
              <div className="flex flex-wrap gap-0.5 mb-1.5">
                {PICTOGRAM_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
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

            <div className="grid grid-cols-5 gap-1 max-h-[300px] overflow-y-auto">
              {filteredPictograms.map(p => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={() => handleDragStart(p)}
                  onClick={() => {
                    const emptyCell = currentProject.cells.find(c => c.type === 'empty');
                    if (emptyCell) handleAddPictogramToCell(emptyCell.id, p);
                  }}
                  className="aspect-square rounded bg-purple-50 hover:bg-purple-100 border border-purple-200 flex flex-col items-center justify-center p-0.5 cursor-grab active:cursor-grabbing transition-colors"
                  title={`${p.ru} / ${p.en}`}
                >
                  <span className="text-xl">{p.emoji}</span>
                  <span className="text-[8px] text-gray-600 text-center line-clamp-1">
                    {p[currentProject.language]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <Image className="w-3 h-3" />
            Загрузить фото
          </button>
        </aside>

        {/* Правая панель: расписание */}
        <section className="space-y-2">
          {renderSchedule()}
          
          <div className="bg-white rounded-xl p-2.5 shadow-sm">
            <h3 className="text-xs font-bold text-purple-700 mb-1">💡 Подсказки</h3>
            <ul className="text-[10px] text-gray-600 space-y-0.5">
              <li>• Перетащите пиктограмму в ячейку</li>
              <li>• Кликните — добавится в пустую ячейку</li>
              <li>• Наведите — кнопки действий</li>
              <li>• RU/EN — переключение языка</li>
            </ul>
          </div>

          {/* СЦЕНАРИИ */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={() => setShowScenarios(!showScenarios)}
              className="w-full px-3 py-2 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-purple-700 text-xs">Сценарии</h3>
              </div>
              <ChevronDown className={`w-3 h-3 text-purple-600 transition-transform ${showScenarios ? 'rotate-180' : ''}`} />
            </button>
            {showScenarios && (
              <div className="px-3 pb-2.5 space-y-2">
                <div className="bg-purple-50 rounded-lg p-2">
                  <p className="font-bold text-purple-800 text-[11px] mb-0.5">🧩 Расписание для РАС</p>
                  <p className="text-[10px] text-gray-600 leading-relaxed">Линейное 5-7 ячеек с фото. Снижает тревожность.</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2">
                  <p className="font-bold text-blue-800 text-[11px] mb-0.5">🏫 Режим дня ДОУ</p>
                  <p className="text-[10px] text-gray-600 leading-relaxed">Сетка 3×3. Ламинировать, дети двигают маркер.</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2">
                  <p className="font-bold text-green-800 text-[11px] mb-0.5">📝 Алгоритм задания</p>
                  <p className="text-[10px] text-gray-600 leading-relaxed">Вертикальное 4-6 шагов. Для планирования.</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-2">
                  <p className="font-bold text-amber-800 text-[11px] mb-0.5">📅 Уроки на неделю</p>
                  <p className="text-[10px] text-gray-600 leading-relaxed">Сетка 4×4. Экспорт PDF для раздачи.</p>
                </div>
                <div className="bg-pink-50 rounded-lg p-2">
                  <p className="font-bold text-pink-800 text-[11px] mb-0.5">💬 Социальная история</p>
                  <p className="text-[10px] text-gray-600 leading-relaxed">Подготовка к событию. Снижает стресс.</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-2">
                  <p className="font-bold text-indigo-800 text-[11px] mb-0.5">🔄 Адаптация 1 класса</p>
                  <p className="text-[10px] text-gray-600 leading-relaxed">Утро школьника. Первые 2 недели.</p>
                </div>
              </div>
            )}
          </div>

          {/* FAQ */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={() => setShowFaq(!showFaq)}
              className="w-full px-3 py-2 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-purple-700 text-xs">FAQ</h3>
              </div>
              <ChevronDown className={`w-3 h-3 text-purple-600 transition-transform ${showFaq ? 'rotate-180' : ''}`} />
            </button>
            {showFaq && (
              <div className="px-3 pb-2.5 space-y-2">
                <div>
                  <p className="font-bold text-gray-800 text-[11px] mb-0.5">❓ Возраст?</p>
                  <p className="text-[10px] text-gray-600">От 2 лет до подростков с ОВЗ.</p>
                </div>
                <div className="border-t border-gray-100 pt-1.5">
                  <p className="font-bold text-gray-800 text-[11px] mb-0.5">❓ Свои картинки?</p>
                  <p className="text-[10px] text-gray-600">Да, загрузка JPG/PNG.</p>
                </div>
                <div className="border-t border-gray-100 pt-1.5">
                  <p className="font-bold text-gray-800 text-[11px] mb-0.5">❓ Печать?</p>
                  <p className="text-[10px] text-gray-600">PDF → A4 → ламинировать.</p>
                </div>
                <div className="border-t border-gray-100 pt-1.5">
                  <p className="font-bold text-gray-800 text-[11px] mb-0.5">❓ Сохранение?</p>
                  <p className="text-[10px] text-gray-600">Автоматически, локально.</p>
                </div>
                <div className="border-t border-gray-100 pt-1.5">
                  <p className="font-bold text-gray-800 text-[11px] mb-0.5">❓ Язык?</p>
                  <p className="text-[10px] text-gray-600">RU/EN в шапке, мгновенно.</p>
                </div>
                <div className="border-t border-gray-100 pt-1.5">
                  <p className="font-bold text-gray-800 text-[11px] mb-0.5">❓ Ячейки?</p>
                  <p className="text-[10px] text-gray-600">8 (линейный), 9 (3×3), 16 (4×4).</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Модалка проектов */}
      {showProjects && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm max-h-[75vh] rounded-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-gray-200">
              <h2 className="text-sm font-bold text-purple-700">Проекты</h2>
              <button
                onClick={() => setShowProjects(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              <button
                onClick={handleNewProject}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Новый
              </button>
              {projects.length === 0 ? (
                <p className="text-center text-gray-400 py-6 text-xs">Нет проектов</p>
              ) : (
                projects.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center gap-1.5 p-2 rounded-lg border border-purple-200 hover:border-purple-400"
                  >
                    <button
                      onClick={() => handleLoadProject(p)}
                      className="flex-1 text-left"
                    >
                      <p className="font-semibold text-xs text-gray-800 truncate">{p.name}</p>
                      <p className="text-[10px] text-gray-500">
                        {new Date(p.updatedAt).toLocaleString('ru-RU')}
                      </p>
                    </button>
                    <button
                      onClick={() => handleDeleteProject(p.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модалка подписи */}
      {editingCellId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-xs rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-purple-700">Подпись</h3>
            <input
              type="text"
              value={editingLabel}
              onChange={(e) => setEditingLabel(e.target.value)}
              placeholder="Введите..."
              className="w-full px-3 py-2 rounded-lg border-2 border-purple-200 focus:outline-none focus:border-purple-500 text-sm"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveLabel()}
            />
            <div className="flex gap-1.5">
              <button
                onClick={() => setEditingCellId(null)}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveLabel}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
              >
                <Check className="w-4 h-4" />
                ОК
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
