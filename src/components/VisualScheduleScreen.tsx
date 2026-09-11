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
  { id: 'vertical', label: 'Верт.', icon: <LayoutList className="w-3 h-3 rotate-90" />, maxCells: 8 },
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
        className={`relative aspect-square rounded-xl border-2 border-dashed transition-all ${
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
              <span className="text-4xl sm:text-5xl select-none">{pictogram.emoji}</span>
            )}
            {cell.type === 'image' && cell.imageData && (
              <img src={cell.imageData} alt="" className="w-full h-full object-contain rounded-lg" />
            )}
            {label && (
              <p className="text-xs sm:text-sm font-semibold text-gray-700 text-center mt-1 line-clamp-2">
                {label}
              </p>
            )}
            
            {/* Кнопки действий — отступ от верхней границы 50 пт */}
            <div className="absolute top-[50pt] right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-purple-50 to-indigo-50 flex flex-col">
      {/* Header с названием раздела */}
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
          <div className="relative shrink-0">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg"
              title="Экспорт"
            >
              <Download className="w-5 h-5" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-purple-200 py-1 z-30">
                <button
                  onClick={handleExportPNG}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-purple-50 flex items-center gap-2"
                >
                  <FileImage className="w-4 h-4 text-purple-600" />
                  Скачать PNG
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-purple-50 flex items-center gap-2"
                >
                  <FileDown className="w-4 h-4 text-purple-600" />
                  Скачать PDF
                </button>
              </div>
            )}
          </div>
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
        {/* Левая панель: библиотека */}
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

            {/* Уменьшенные плитки — grid-cols-6 вместо grid-cols-5 */}
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

        {/* Правая панель: расписание */}
        <section className="space-y-4">
          {renderSchedule()}
          
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-purple-700 mb-2">💡 Подсказки</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Перетащите пиктограмму из библиотеки в ячейку</li>
              <li>• Кликните на пиктограмму — добавится в первую пустую ячейку</li>
              <li>• Наведите на ячейку — появятся кнопки действий</li>
              <li>• Переключайте язык RU/EN в шапке</li>
              <li>• Экспортируйте в PNG для доски или PDF для печати</li>
            </ul>
          </div>

          {/* ===== СЦЕНАРИИ ИСПОЛЬЗОВАНИЯ ===== */}
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
                  <p className="text-xs leading-relaxed">Создайте линейное расписание на 5–7 ячеек: проснулся → завтрак → школа → обед → прогулка → дом → сон. Используйте конкретные фото ребёнка и знакомых мест. Повесьте на уровне глаз. Перемещайте «галочку» по мере выполнения — это снижает тревожность и формирует предсказуемость.</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="font-bold text-blue-800 mb-1">🏫 Режим дня в детском саду</p>
                  <p className="text-xs leading-relaxed">Сетка 3×3 для группы: завтрак → занятие → прогулка → обед → сон → полдник → игры → родители. Распечатайте на A4 и ламинируйте. Дети сами передвигают маркер-магнит по ячейкам. Воспитатель озвучивает: «Сейчас мы…», ребёнок находит картинку.</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="font-bold text-green-800 mb-1">📝 Алгоритм выполнения задания</p>
                  <p className="text-xs leading-relaxed">Вертикальное расписание на 4–6 шагов: прочитай задание → подчеркни главное → реши → проверь → запиши ответ. Используйте для детей с трудностями планирования. Повесьте над партой — ребёнок следует по шагам самостоятельно.</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="font-bold text-amber-800 mb-1">📅 Расписание уроков на неделю</p>
                  <p className="text-xs leading-relaxed">Сетка 4×4: по строкам — дни недели, по столбцам — уроки. Используйте пиктограммы предметов: 📖 чтение, 🔢 математика, 🎨 рисование, ⚽ физкультура. Переключите на EN для билингвального класса. Экспортируйте в PDF и раздайте ученикам.</p>
                </div>
                <div className="bg-pink-50 rounded-xl p-3">
                  <p className="font-bold text-pink-800 mb-1">💬 Социальная история</p>
                  <p className="text-xs leading-relaxed">Линейное расписание для подготовки к новому событию: «Завтра мы идём в музей» → 🚌 автобус → 🏛 музей → 👀 смотрим → 🤫 ведём себя тихо → 🚌 возвращаемся. Помогает ребёнку с РАС подготовиться к непривычной ситуации и снизить стресс.</p>
                </div>
                <div className="bg-indigo-50 rounded-xl p-3">
                  <p className="font-bold text-indigo-800 mb-1">🔄 Адаптация первоклассника</p>
                  <p className="text-xs leading-relaxed">Создайте «Утро школьника»: ⏰ подъём → 🪥 зубы → 👕 форма → 🥣 завтрак → 🎒 портфель → 🏫 школа. Повесьте дома и в классе. Первые 2 недели ребёнок следует по картинкам, затем привыкает. Родители отмечают выполненное наклейками.</p>
                </div>
                <div className="bg-teal-50 rounded-xl p-3">
                  <p className="font-bold text-teal-800 mb-1">🎯 Визуальная инструкция для кружка</p>
                  <p className="text-xs leading-relaxed">Для кружка «Поделки»: 📋 план → ✂️ вырезать → 🎨 раскрасить → 🧩 собрать → 📷 показать. Каждый шаг — пиктограмма + подпись. Дети работают по карточке самостоятельно, педагог помогает только при необходимости.</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-3">
                  <p className="font-bold text-orange-800 mb-1">😊 Шкала эмоций и самопомощь</p>
                  <p className="text-xs leading-relaxed">Сетка 3×3 с эмоциями: 😊 рад → 😢 грусть → 😠 злость → 😨 страх → 😴 устал → 😌 спокоен. Рядом — действия-помощники: 💧 попить воды → 🚶 прогуляться → 🗣 поговорить → 🎵 музыка → 🤗 обнять. Ребёнок указывает свою эмоцию и выбирает стратегию.</p>
                </div>
              </div>
            )}
          </div>

          {/* ===== ЧАСТЫЕ ВОПРОСЫ ===== */}
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
                  <p className="font-bold text-gray-800 mb-1">❓ Для какого возраста подходит визуальное расписание?</p>
                  <p className="text-xs text-gray-600 leading-relaxed">От 2–3 лет (простые цепочки из 3 картинок) до 10–12 лет (сетка на неделю с подписями). Для подростков с РАС и ОВЗ расписание остаётся актуальным — меняются только пиктограммы и уровень сложности. Взрослые с ментальными особенностями также используют визуальные опоры.</p>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="font-bold text-gray-800 mb-1">❓ Можно ли использовать свои картинки вместо пиктограмм?</p>
                  <p className="text-xs text-gray-600 leading-relaxed">Да! Нажмите на ячейку → 🖼 → выберите фото с устройства. Это особенно важно для детей с РАС: конкретная фотография их чашки или кровати понятнее абстрактной пиктограммы. Поддерживаются JPG, PNG, WEBP.</p>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="font-bold text-gray-800 mb-1">❓ Как распечатать расписание?</p>
                  <p className="text-xs text-gray-600 leading-relaxed">Нажмите ⬇ Скачать → PDF. Файл откроется в формате A4 (альбомная ориентация). Распечатайте на обычном или цветном принтере. Для многоразового использования — ламинируйте и используйте маркеры-липучки для перемещения ячеек.</p>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="font-bold text-gray-800 mb-1">❓ Сохраняются ли мои проекты?</p>
                  <p className="text-xs text-gray-600 leading-relaxed">Да, автоматически. Все проекты хранятся локально в браузере и доступны между сессиями. Нажмите 📂 (иконку загрузки) в шапке — увидите список сохранённых расписаний. Можно создавать неограниченное количество проектов.</p>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="font-bold text-gray-800 mb-1">❓ Как сменить язык подписей?</p>
                  <p className="text-xs text-gray-600 leading-relaxed">В шапке нажмите кнопку RU/EN. Все подписи пиктограмм переключатся мгновенно. Это удобно для билингвальных классов и для изучения английского: ребёнок видит картинку и подписи на двух языках.</p>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="font-bold text-gray-800 mb-1">❓ Сколько ячеек можно заполнить?</p>
                  <p className="text-xs text-gray-600 leading-relaxed">Зависит от шаблона: линейный — до 8, вертикальный — до 8, сетка 3×3 — 9 ячеек, сетка 4×4 — 16 ячеек. Для ребёнка с РАС рекомендуется начинать с 3–5 ячеек и увеличивать постепенно.</p>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="font-bold text-gray-800 mb-1">❓ Как удалить пиктограмму из ячейки?</p>
                  <p className="text-xs text-gray-600 leading-relaxed">Наведите курсор на ячейку → нажмите 🗑 (корзину) в правом верхнем углу. Ячейка станет пустой. Чтобы заменить пиктограмму — просто перетащите новую поверх старой.</p>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="font-bold text-gray-800 mb-1">❓ Работает ли раздел без интернета?</p>
                  <p className="text-xs text-gray-600 leading-relaxed">Да. Все пиктограммы — встроенные эмодзи, они хранятся в коде приложения. Загрузка своих фото, сохранение проектов и экспорт работают полностью офлайн. Интернет нужен только для первой загрузки приложения.</p>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="font-bold text-gray-800 mb-1">❓ Можно ли отправить расписание в родительский чат?</p>
                  <p className="text-xs text-gray-600 leading-relaxed">Да! Нажмите ⬇ Скачать → PNG. Изображение сохранится на устройство — отправьте его в WhatsApp, Telegram или VK. PNG сохраняет высокое качество (масштаб 2×) и подходит для отправки в мессенджеры и для вставки в презентации.</p>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="font-bold text-gray-800 mb-1">❓ Как использовать расписание на интерактивной доске?</p>
                  <p className="text-xs text-gray-600 leading-relaxed">Экспортируйте в PNG → откройте на доске. Или откройте расписание прямо в браузере на проекторе — дети видят процесс заполнения в реальном времени. Используйте линейный шаблон для наглядной последовательности.</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Модалка проектов */}
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
                <p className="text-center text-gray-400 py-8 text-sm">
                  Пока нет сохранённых проектов
                </p>
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

      {/* Модалка редактирования подписи */}
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
