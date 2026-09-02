import { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  BookOpen,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Edit3,
  Printer,
  X,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Save,
  Undo2,
  Eraser,
  Pencil,
  Image as ImageIcon,
  Inbox,
} from 'lucide-react';
import BackButton from './BackButton';

type Direction = 'up' | 'down' | 'left' | 'right';

interface Step {
  direction: Direction;
  cells: number;
}

interface Dictation {
  id: string;
  name: string;
  startOffset: { x: number; y: number };
  steps: Step[];
  difficulty: 'easy' | 'medium' | 'hard';
}

const CELL_SIZE = 20;
const GRID_WIDTH = 20;
const GRID_HEIGHT = 20;

const DIRECTION_LABELS: Record<Direction, string> = {
  up: '↑ вверх',
  down: '↓ вниз',
  left: '← влево',
  right: '→ вправо',
};

const DIRECTION_ICONS: Record<Direction, React.ReactNode> = {
  up: <ArrowUp className="w-4 h-4" />,
  down: <ArrowDown className="w-4 h-4" />,
  left: <ArrowLeft className="w-4 h-4" />,
  right: <ArrowRight className="w-4 h-4" />,
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Легко',
  medium: 'Средне',
  hard: 'Сложно',
};

const FAQ_ITEMS = [
  {
    q: 'Что такое графический диктант?',
    a: 'Это развивающее упражнение, где ребёнок рисует линии по клеткам тетради, следуя устным инструкциям. В результате получается заданное изображение: животное, предмет или узор.',
  },
  {
    q: 'Какой возраст подходит?',
    a: 'Оптимально для детей 5–9 лет. Простые диктанты (5–8 шагов) — для 5–6 лет, средние (10–15 шагов) — для 6–7 лет, сложные (20+ шагов) — для 8–9 лет.',
  },
  {
    q: 'Как создать свой диктант?',
    a: 'Нажмите «Создать» и рисуйте прямо на поле: зажмите мышку (или палец) и ведите линию по клеткам. Программа сама запишет последовательность шагов. Первый клик задаёт начальную точку.',
  },
  {
    q: 'Можно ли исправить нарисованное?',
    a: 'Да: кнопка ↺ отменяет последний шаг, «Ластик» очищает всё. Также можно добавлять шаги кнопками направлений или удалить любой шаг из списка.',
  },
  {
    q: 'Как распечатать несколько диктантов?',
    a: 'Нажмите «Печать», отметьте галочками нужные диктанты, укажите имя ученика, класс и дату — каждый диктант распечатается на отдельной странице с пустой сеткой и инструкцией в 3 столбца.',
  },
  {
    q: 'Как сохранить диктант картинкой?',
    a: 'Нажмите «Картинка» и выберите вариант: пустое поле (сетка + точка), с ответом (сетка + фигура) или фигура без поля (только линии). Скачается PNG в высоком разрешении.',
  },
  {
    q: 'Что развивает это упражнение?',
    a: 'Мелкую моторику, пространственное восприятие (право-лево, верх-низ), слуховое внимание, память, навык работы по инструкции и самоконтроль.',
  },
  {
    q: 'Где использовать графический диктант?',
    a: 'Универсальное упражнение для любого предмета:\n• Математика — счёт, геометрия, координаты\n• Русский — подготовка руки к письму\n• Окружающий мир — образы природы\n• Разминка и физкультминутка\n• Итог урока — визуальный конспект\n• Диагностика пространственного восприятия\n\nПодробные сценарии — в разделе ниже «Сценарии использования на занятиях».',
  },
];

const SCENARIO_ITEMS = [
  {
    icon: '🌅',
    title: 'Разминка перед уроком (3–5 минут)',
    description: 'Начните урок с короткого диктанта на 5–7 шагов. Это быстро включает внимание, настраивает детей на рабочую волну и помогает перейти от перемены к учёбе. Подходит для любого предмета.',
  },
  {
    icon: '✍️',
    title: 'Подготовка руки к письму (1 класс)',
    description: 'Используйте простые диктанты как упражнение в прописях. Дети тренируют нажим, ровные линии, чувство клетки. Особенно полезно в период обучения грамоте.',
  },
  {
    icon: '🧮',
    title: 'На уроке математики',
    description: 'Повторяйте счёт («три клетки вправо, две вниз»), направления, знакомство с координатами. Для 2–3 класса — рисуйте геометрические фигуры, симметричные узоры, прямоугольники по заданным сторонам.',
  },
  {
    icon: '🌿',
    title: 'Окружающий мир',
    description: 'Создайте диктанты с образами природы: лист, гриб, дерево, цветок, рыбка. После рисования обсудите тему урока. Дети запоминают материал через действие.',
  },
  {
    icon: '🎯',
    title: 'Физкультминутка с рисованием',
    description: 'В середине урока дайте диктант как смену деятельности. Дети встают из-за парт, подходят к доске или рисуют в тетрадях. Снимает утомление и восстанавливает концентрацию.',
  },
  {
    icon: '👥',
    title: 'Парная работа',
    description: 'Раздайте пары: один ученик диктует, другой рисует, затем меняются. Развивает речь, умение давать чёткие инструкции, слушать и понимать партнёра.',
  },
  {
    icon: '📚',
    title: 'Итог урока — что запомнилось',
    description: 'В конце занятия попросите детей нарисовать диктант по теме урока (в редакторе или в тетради). Получится визуальный конспект: что каждый вынес из занятия.',
  },
  {
    icon: '🔍',
    title: 'Диагностика пространственного восприятия',
    description: 'Дайте всем один и тот же диктант. Сравните результаты: у кого линии не сошлись — у того сложности с ориентацией «право-лево» или счётом. Полезно для школьного психолога.',
  },
  {
    icon: '🏠',
    title: 'Домашнее задание',
    description: 'Попросите детей нарисовать диктант дома для родителей или младших братьев и сестёр. Закрепление через обучение других — один из самых эффективных приёмов.',
  },
];

function formatStep(step: Step): string {
  return `${step.cells} ${step.cells === 1 ? 'клетка' : step.cells < 5 ? 'клетки' : 'клеток'} ${DIRECTION_LABELS[step.direction]}`;
}

function getEndPoint(d: Dictation): { x: number; y: number } {
  let x = d.startOffset.x;
  let y = d.startOffset.y;
  for (const s of d.steps) {
    if (s.direction === 'up') y -= s.cells;
    if (s.direction === 'down') y += s.cells;
    if (s.direction === 'left') x -= s.cells;
    if (s.direction === 'right') x += s.cells;
  }
  return { x, y };
}

function drawGridAndLines(
  ctx: CanvasRenderingContext2D,
  d: Dictation,
  stepsToDraw: number,
  lineColor: string,
) {
  const width = GRID_WIDTH * CELL_SIZE;
  const height = GRID_HEIGHT * CELL_SIZE;

  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = '#e9d5ff';
  ctx.lineWidth = 1;
  for (let x = 0; x <= GRID_WIDTH; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL_SIZE, 0);
    ctx.lineTo(x * CELL_SIZE, height);
    ctx.stroke();
  }
  for (let y = 0; y <= GRID_HEIGHT; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL_SIZE);
    ctx.lineTo(width, y * CELL_SIZE);
    ctx.stroke();
  }

  const startX = d.startOffset.x * CELL_SIZE;
  const startY = d.startOffset.y * CELL_SIZE;
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(startX, startY, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let cx = startX;
  let cy = startY;

  for (let i = 0; i < stepsToDraw && i < d.steps.length; i++) {
    const step = d.steps[i];
    let nx = cx;
    let ny = cy;
    if (step.direction === 'up') ny -= step.cells * CELL_SIZE;
    if (step.direction === 'down') ny += step.cells * CELL_SIZE;
    if (step.direction === 'left') nx -= step.cells * CELL_SIZE;
    if (step.direction === 'right') nx += step.cells * CELL_SIZE;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.stroke();
    cx = nx;
    cy = ny;
  }

  return { cx, cy };
}

export default function GraphDictationScreen({ onBack }: { onBack: () => void }) {
  const [dictations, setDictations] = useState<Dictation[]>(() => {
    try {
      const raw = localStorage.getItem('graph-dictations');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [selectedId, setSelectedId] = useState<string>('');
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [showScen, setShowScen] = useState(false);
  const [openFaqItem, setOpenFaqItem] = useState<number | null>(null);
  const [autoPlaySpeed, setAutoPlaySpeed] = useState(2000);

  const [editorMode, setEditorMode] = useState(false);
  const [editingDictation, setEditingDictation] = useState<Dictation | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [newStepDirection, setNewStepDirection] = useState<Direction>('right');
  const [newStepCells, setNewStepCells] = useState(1);

  const [showBatchPrint, setShowBatchPrint] = useState(false);
  const [showImageExport, setShowImageExport] = useState(false);
  const [selectedForPrint, setSelectedForPrint] = useState<Set<string>>(new Set());
  const [printStudentName, setPrintStudentName] = useState('');
  const [printClass, setPrintClass] = useState('');
  const [printDate, setPrintDate] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editorCanvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedDictation = dictations.find((d) => d.id === selectedId) || null;

  useEffect(() => {
    if (selectedId && !dictations.find((d) => d.id === selectedId)) {
      setSelectedId('');
    }
  }, [selectedId, dictations]);

  useEffect(() => {
    try {
      localStorage.setItem('graph-dictations', JSON.stringify(dictations));
    } catch {}
  }, [dictations]);

  useEffect(() => {
    if (!selectedDictation) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = GRID_WIDTH * CELL_SIZE;
    canvas.height = GRID_HEIGHT * CELL_SIZE;

    const stepsToDraw = showAnswer ? selectedDictation.steps.length : currentStep;
    const end = drawGridAndLines(ctx, selectedDictation, stepsToDraw, showAnswer ? '#10b981' : '#7c3aed');

    if (stepsToDraw === selectedDictation.steps.length && stepsToDraw > 0) {
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(end.cx, end.cy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [selectedDictation, currentStep, showAnswer]);

  useEffect(() => {
    if (!editorMode || !editingDictation) return;
    const canvas = editorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = GRID_WIDTH * CELL_SIZE;
    canvas.height = GRID_HEIGHT * CELL_SIZE;

    const end = drawGridAndLines(ctx, editingDictation, editingDictation.steps.length, '#7c3aed');

    ctx.fillStyle = '#7c3aed';
    ctx.beginPath();
    ctx.arc(end.cx, end.cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [editorMode, editingDictation]);

  useEffect(() => {
    if (!selectedDictation) return;
    if (isPlaying && currentStep < selectedDictation.steps.length) {
      intervalRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (!selectedDictation) return prev;
          if (prev >= selectedDictation.steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, autoPlaySpeed);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, currentStep, selectedDictation, autoPlaySpeed]);

  const handleNextStep = () => {
    if (selectedDictation && currentStep < selectedDictation.steps.length) setCurrentStep((p) => p + 1);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
    setShowAnswer(false);
  };

  const handlePlayPause = () => {
    if (!selectedDictation) return;
    if (currentStep === selectedDictation.steps.length) handleReset();
    setIsPlaying(!isPlaying);
  };

  const handleDeleteDictation = (id: string) => {
    if (!confirm('Удалить этот диктант?')) return;
    setDictations((prev) => prev.filter((d) => d.id !== id));
    if (selectedId === id) setSelectedId('');
  };

  const handleStartEditor = (dictation?: Dictation) => {
    if (dictation) {
      setEditingDictation({ ...dictation, steps: [...dictation.steps] });
    } else {
      setEditingDictation({
        id: `custom-${Date.now()}`,
        name: 'Новый диктант',
        difficulty: 'easy',
        startOffset: { x: 10, y: 10 },
        steps: [],
      });
    }
    setEditorMode(true);
    setNewStepDirection('right');
    setNewStepCells(1);
  };

  const getGridPoint = (e: React.PointerEvent): { x: number; y: number } | null => {
    const canvas = editorCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const gx = Math.round(x / CELL_SIZE);
    const gy = Math.round(y / CELL_SIZE);
    if (gx < 0 || gx > GRID_WIDTH || gy < 0 || gy > GRID_HEIGHT) return null;
    return { x: gx, y: gy };
  };

  const addStepsToward = (target: { x: number; y: number }) => {
    setEditingDictation((prev) => {
      if (!prev) return prev;
      let { x, y } = getEndPoint(prev);
      const steps = [...prev.steps];
      let guard = 0;
      while ((x !== target.x || y !== target.y) && guard < 60) {
        let dir: Direction;
        if (x < target.x) dir = 'right';
        else if (x > target.x) dir = 'left';
        else if (y < target.y) dir = 'down';
        else dir = 'up';

        const last = steps[steps.length - 1];
        if (last && last.direction === dir) {
          steps[steps.length - 1] = { ...last, cells: last.cells + 1 };
        } else {
          steps.push({ direction: dir, cells: 1 });
        }
        if (dir === 'right') x++;
        if (dir === 'left') x--;
        if (dir === 'down') y++;
        if (dir === 'up') y--;
        guard++;
      }
      return { ...prev, steps };
    });
  };

  const handleEditorPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = getGridPoint(e);
    if (!p || !editingDictation) return;
    setIsDrawing(true);
    if (editingDictation.steps.length === 0) {
      setEditingDictation({ ...editingDictation, startOffset: p });
    } else {
      addStepsToward(p);
    }
  };

  const handleEditorPointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    const p = getGridPoint(e);
    if (p) addStepsToward(p);
  };

  const handleEditorPointerUp = () => setIsDrawing(false);

  const handleUndoStep = () => {
    setEditingDictation((prev) => (prev ? { ...prev, steps: prev.steps.slice(0, -1) } : prev));
  };

  const handleClearSteps = () => {
    setEditingDictation((prev) => (prev ? { ...prev, steps: [] } : prev));
  };

  const handleRemoveStep = (index: number) => {
    setEditingDictation((prev) => (prev ? { ...prev, steps: prev.steps.filter((_, i) => i !== index) } : prev));
  };

  const handleAddStepButton = () => {
    setEditingDictation((prev) => {
      if (!prev) return prev;
      const steps = [...prev.steps];
      const last = steps[steps.length - 1];
      if (last && last.direction === newStepDirection) {
        steps[steps.length - 1] = { ...last, cells: last.cells + newStepCells };
      } else {
        steps.push({ direction: newStepDirection, cells: newStepCells });
      }
      return { ...prev, steps };
    });
  };

  const handleSaveDictation = () => {
    if (!editingDictation) return;
    if (!editingDictation.name.trim()) {
      alert('Введите название диктанта');
      return;
    }
    if (editingDictation.steps.length === 0) {
      alert('Нарисуйте фигуру на поле или добавьте шаги');
      return;
    }
    const stepsCount = editingDictation.steps.length;
    const finalDictation: Dictation = {
      ...editingDictation,
      difficulty: stepsCount <= 10 ? 'easy' : stepsCount <= 20 ? 'medium' : 'hard',
    };
    setDictations((prev) => {
      const exists = prev.find((d) => d.id === finalDictation.id);
      return exists ? prev.map((d) => (d.id === finalDictation.id ? finalDictation : d)) : [...prev, finalDictation];
    });
    setSelectedId(finalDictation.id);
    setEditorMode(false);
    setEditingDictation(null);
  };

  const handleCancelEditor = () => {
    setEditorMode(false);
    setEditingDictation(null);
    setIsDrawing(false);
  };

  const handleTogglePrintSelection = (id: string) => {
    setSelectedForPrint((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchPrint = () => {
    const selected = dictations.filter((d) => selectedForPrint.has(d.id));
    if (selected.length === 0) {
      alert('Выберите хотя бы один диктант для печати');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dictationBlocks = selected
      .map((d) => {
        const stepsHtml = d.steps.map((step, i) => `<div class="step">${i + 1}. ${formatStep(step)}</div>`).join('');
        return `
        <div class="dictation-block">
          <h2>${d.name}</h2>
          <p class="meta"><strong>Сложность:</strong> ${DIFFICULTY_LABELS[d.difficulty]} · <strong>Шагов:</strong> ${d.steps.length}</p>
          <p class="meta"><strong>Начало:</strong> отступить ${d.startOffset.x} клеток слева, ${d.startOffset.y} клеток сверху</p>
          ${printStudentName ? `<p class="meta"><strong>Ученик:</strong> ${printStudentName}</p>` : ''}
          ${printClass ? `<p class="meta"><strong>Класс:</strong> ${printClass}</p>` : ''}
          ${printDate ? `<p class="meta"><strong>Дата:</strong> ${printDate}</p>` : ''}
          <div class="grid-container">
            <svg width="${GRID_WIDTH * CELL_SIZE}" height="${GRID_HEIGHT * CELL_SIZE}" viewBox="0 0 ${GRID_WIDTH * CELL_SIZE} ${GRID_HEIGHT * CELL_SIZE}">
              ${Array.from({ length: GRID_WIDTH + 1 }, (_, i) => `<line x1="${i * CELL_SIZE}" y1="0" x2="${i * CELL_SIZE}" y2="${GRID_HEIGHT * CELL_SIZE}" stroke="#e9d5ff" stroke-width="1"/>`).join('')}
              ${Array.from({ length: GRID_HEIGHT + 1 }, (_, i) => `<line x1="0" y1="${i * CELL_SIZE}" x2="${GRID_WIDTH * CELL_SIZE}" y2="${i * CELL_SIZE}" stroke="#e9d5ff" stroke-width="1"/>`).join('')}
              <circle cx="${d.startOffset.x * CELL_SIZE}" cy="${d.startOffset.y * CELL_SIZE}" r="4" fill="#ef4444"/>
            </svg>
          </div>
          <div class="instructions">
            <h3>Инструкция:</h3>
            <div class="steps-grid">${stepsHtml}</div>
          </div>
        </div>`;
      })
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Графические диктанты (${selected.length})</title>
          <style>
            @page { size: A4; margin: 1.5cm; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
            .dictation-block { page-break-after: always; margin-bottom: 2cm; }
            .dictation-block:last-child { page-break-after: auto; }
            h1 { color: #7c3aed; text-align: center; margin-bottom: 1cm; }
            h2 { color: #7c3aed; margin-top: 0; }
            h3 { margin-top: 0.5cm; margin-bottom: 0.3cm; }
            .meta { font-size: 12px; color: #6b7280; margin: 0.2cm 0; }
            .grid-container { margin: 0.5cm 0; text-align: center; }
            .instructions { background: #f5f3ff; padding: 0.5cm; border-radius: 8px; margin-top: 0.5cm; }
            .steps-grid { columns: 3; column-gap: 0.8cm; }
            .step { margin: 3px 0; font-size: 13px; break-inside: avoid; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="no-print" style="text-align: center; margin-bottom: 1cm;">
            <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">🖨️ Печать</button>
            <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; margin-left: 10px;">Закрыть</button>
          </div>
          <h1>Графические диктанты</h1>
          ${dictationBlocks}
        </body>
      </html>
    `);
    printWindow.document.close();

    setShowBatchPrint(false);
    setSelectedForPrint(new Set());
  };

  const renderDictationImage = (d: Dictation, mode: 'blank' | 'answer' | 'lines') => {
    const scale = 2;
    const W = GRID_WIDTH * CELL_SIZE;
    const H = GRID_HEIGHT * CELL_SIZE;
    const canvas = document.createElement('canvas');
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    if (mode !== 'lines') {
      ctx.strokeStyle = '#e9d5ff';
      ctx.lineWidth = 1;
      for (let x = 0; x <= GRID_WIDTH; x++) {
        ctx.beginPath();
        ctx.moveTo(x * CELL_SIZE, 0);
        ctx.lineTo(x * CELL_SIZE, H);
        ctx.stroke();
      }
      for (let y = 0; y <= GRID_HEIGHT; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * CELL_SIZE);
        ctx.lineTo(W, y * CELL_SIZE);
        ctx.stroke();
      }
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(d.startOffset.x * CELL_SIZE, d.startOffset.y * CELL_SIZE, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    if (mode !== 'blank') {
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      let cx = d.startOffset.x * CELL_SIZE;
      let cy = d.startOffset.y * CELL_SIZE;
      for (const step of d.steps) {
        let nx = cx;
        let ny = cy;
        if (step.direction === 'up') ny -= step.cells * CELL_SIZE;
        if (step.direction === 'down') ny += step.cells * CELL_SIZE;
        if (step.direction === 'left') nx -= step.cells * CELL_SIZE;
        if (step.direction === 'right') nx += step.cells * CELL_SIZE;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        cx = nx;
        cy = ny;
      }
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    canvas.toBlob((b) => {
      if (!b) return;
      const u = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = u;
      const suffix = mode === 'blank' ? 'пустое-поле' : mode === 'answer' ? 'с-ответом' : 'фигура-без-поля';
      a.download = `${d.name}-${suffix}.png`;
      a.click();
      URL.revokeObjectURL(u);
    });
  };

  if (editorMode && editingDictation) {
    return (
      <div className="min-h-[100dvh] bg-purple-50 flex flex-col">
        <header className="bg-purple-700 shadow-md sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            <BackButton onClick={handleCancelEditor} variant="light" />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white truncate">Редактор диктанта</h1>
              <p className="text-xs text-purple-200">Рисуйте прямо на поле</p>
            </div>
            <Pencil className="w-6 h-6 text-white/70" />
          </div>
        </header>

        <main className="flex-1 max-w-4xl mx-auto w-full p-3 space-y-3 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
            <div className="space-y-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-purple-700">Поле для рисования</h2>
                  <div className="flex gap-1">
                    <button
                      onClick={handleUndoStep}
                      disabled={editingDictation.steps.length === 0}
                      className="p-2 bg-purple-50 text-purple-700 rounded-lg disabled:opacity-40"
                      title="Отменить последний шаг"
                    >
                      <Undo2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleClearSteps}
                      disabled={editingDictation.steps.length === 0}
                      className="p-2 bg-purple-50 text-purple-700 rounded-lg disabled:opacity-40"
                      title="Очистить всё"
                    >
                      <Eraser className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-center">
                  <canvas
                    ref={editorCanvasRef}
                    onPointerDown={handleEditorPointerDown}
                    onPointerMove={handleEditorPointerMove}
                    onPointerUp={handleEditorPointerUp}
                    onPointerLeave={handleEditorPointerUp}
                    className="border-2 border-purple-300 rounded-lg cursor-crosshair"
                    style={{ maxWidth: '100%', height: 'auto', touchAction: 'none' }}
                  />
                </div>
                <p className="text-[11px] text-purple-600 text-center mt-2">
                  ✏️ Зажмите мышку или палец и ведите линию по клеткам — шаги запишутся сами. Первый клик задаёт начальную точку.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
                <h3 className="text-sm font-bold text-purple-700">
                  Инструкция ({editingDictation.steps.length} шагов)
                </h3>
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {editingDictation.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs p-2 bg-purple-50 rounded">
                      <span className="w-6 text-right font-bold text-purple-700">{i + 1}.</span>
                      <span className="flex-1 text-gray-700">{formatStep(step)}</span>
                      <button onClick={() => handleRemoveStep(i)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {editingDictation.steps.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">Нарисуйте фигуру на поле — шаги появятся здесь</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-white rounded-2xl p-3 shadow-sm space-y-2">
                <label className="text-sm font-bold text-purple-700">Название</label>
                <input
                  type="text"
                  value={editingDictation.name}
                  onChange={(e) => setEditingDictation({ ...editingDictation, name: e.target.value })}
                  placeholder="Название диктанта"
                  className="w-full rounded-lg border border-purple-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div className="bg-white rounded-2xl p-3 shadow-sm space-y-2">
                <label className="text-sm font-bold text-purple-700">Начальная точка</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500">X (слева)</label>
                    <input
                      type="number"
                      min={0}
                      max={GRID_WIDTH}
                      value={editingDictation.startOffset.x}
                      onChange={(e) =>
                        setEditingDictation({
                          ...editingDictation,
                          startOffset: { ...editingDictation.startOffset, x: Math.max(0, Math.min(GRID_WIDTH, Number(e.target.value))) },
                        })
                      }
                      className="w-full rounded-lg border border-purple-200 p-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Y (сверху)</label>
                    <input
                      type="number"
                      min={0}
                      max={GRID_HEIGHT}
                      value={editingDictation.startOffset.y}
                      onChange={(e) =>
                        setEditingDictation({
                          ...editingDictation,
                          startOffset: { ...editingDictation.startOffset, y: Math.max(0, Math.min(GRID_HEIGHT, Number(e.target.value))) },
                        })
                      }
                      className="w-full rounded-lg border border-purple-200 p-1.5 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-3 shadow-sm space-y-2">
                <label className="text-sm font-bold text-purple-700">Добавить шаг кнопками</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="grid grid-cols-2 gap-1">
                      {(['up', 'down', 'left', 'right'] as const).map((d) => (
                        <button
                          key={d}
                          onClick={() => setNewStepDirection(d)}
                          className={`py-2 rounded-lg border-2 flex items-center justify-center ${
                            newStepDirection === d ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500'
                          }`}
                          title={DIRECTION_LABELS[d]}
                        >
                          {DIRECTION_ICONS[d]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Клеток</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={newStepCells}
                      onChange={(e) => setNewStepCells(Math.max(1, Number(e.target.value)))}
                      className="w-full rounded-lg border border-purple-200 p-2 text-sm"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddStepButton}
                  className="w-full py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm font-semibold flex items-center justify-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Добавить шаг
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleCancelEditor} className="py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold">
                  Отмена
                </button>
                <button
                  onClick={handleSaveDictation}
                  className="py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1"
                >
                  <Save className="w-4 h-4" />
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-purple-50 flex flex-col">
      <header className="bg-purple-700 shadow-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Графический диктант</h1>
            <p className="text-xs text-purple-200">Развитие пространственного мышления</p>
          </div>
          <BookOpen className="w-6 h-6 text-white/70" />
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-3 space-y-3 pb-8">
        {dictations.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-100 rounded-full">
              <Inbox className="w-10 h-10 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-purple-700 mb-2">Пока нет диктантов</h2>
              <p className="text-sm text-gray-600 max-w-md mx-auto">
                Создайте свой первый графический диктант — нарисуйте фигуру прямо на поле, и программа автоматически запишет пошаговую инструкцию.
              </p>
            </div>
            <button
              onClick={() => handleStartEditor()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold"
            >
              <Plus className="w-5 h-5" />
              Создать первый диктант
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
            <div className="space-y-3">
              {selectedDictation ? (
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-lg font-bold text-purple-700">{selectedDictation.name}</h2>
                      <p className="text-xs text-gray-500">
                        {DIFFICULTY_LABELS[selectedDictation.difficulty]} · {selectedDictation.steps.length} шагов · Шаг {currentStep}/{selectedDictation.steps.length}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAnswer(!showAnswer)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                        showAnswer ? 'bg-green-100 text-green-700' : 'bg-purple-50 text-purple-700'
                      }`}
                    >
                      {showAnswer ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showAnswer ? 'Скрыть ответ' : 'Показать ответ'}
                    </button>
                  </div>

                  <div className="flex justify-center mb-3">
                    <canvas ref={canvasRef} className="border-2 border-purple-200 rounded-lg" style={{ maxWidth: '100%', height: 'auto' }} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={handlePlayPause}
                        disabled={showAnswer}
                        className={`flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 ${
                          isPlaying ? 'bg-amber-500 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50'
                        }`}
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        {isPlaying ? 'Пауза' : currentStep === selectedDictation.steps.length ? 'Заново' : 'Старт'}
                      </button>
                      <button
                        onClick={handleNextStep}
                        disabled={isPlaying || showAnswer || currentStep === selectedDictation.steps.length}
                        className="px-4 py-2.5 rounded-xl bg-purple-100 text-purple-700 font-semibold text-sm flex items-center gap-1 disabled:opacity-50"
                      >
                        <SkipForward className="w-4 h-4" />
                        Следующий
                      </button>
                      <button onClick={handleReset} className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm flex items-center gap-1">
                        <RotateCcw className="w-4 h-4" />
                        Сброс
                      </button>
                    </div>

                    {!isPlaying && currentStep < selectedDictation.steps.length && !showAnswer && (
                      <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-600 mb-1">Следующий шаг:</p>
                        <p className="text-lg font-bold text-purple-700">{formatStep(selectedDictation.steps[currentStep])}</p>
                      </div>
                    )}

                    <div>
                      <label className="text-xs text-gray-500">Скорость автопроигрывания: {(autoPlaySpeed / 1000).toFixed(1)} сек</label>
                      <input
                        type="range"
                        min={500}
                        max={5000}
                        step={100}
                        value={autoPlaySpeed}
                        onChange={(e) => setAutoPlaySpeed(Number(e.target.value))}
                        className="w-full accent-purple-600"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                  <p className="text-gray-500 mb-3">Выберите диктант из списка справа</p>
                  <button
                    onClick={() => handleStartEditor()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Создать новый
                  </button>
                </div>
              )}

              {selectedDictation && (
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <h3 className="text-sm font-bold text-purple-700 mb-2">Полная инструкция</h3>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {selectedDictation.steps.map((step, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-2 text-xs p-1.5 rounded ${
                          i < currentStep ? 'bg-green-50 text-green-700' : i === currentStep ? 'bg-purple-100 text-purple-700 font-bold' : 'text-gray-500'
                        }`}
                      >
                        <span className="w-6 text-right">{i + 1}.</span>
                        <span className="flex-1">{formatStep(step)}</span>
                        {i < currentStep && <span className="text-green-600">✓</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="bg-white rounded-2xl p-3 shadow-sm space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-purple-700">
                    Диктанты ({dictations.length})
                  </label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleStartEditor()}
                      className="px-2 py-1 text-xs bg-purple-600 text-white rounded-lg font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Создать
                    </button>
                    {selectedDictation && (
                      <>
                        <button
                          onClick={() => setShowImageExport(true)}
                          className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-lg font-semibold flex items-center gap-1"
                        >
                          <ImageIcon className="w-3 h-3" />
                          Картинка
                        </button>
                        <button
                          onClick={() => setShowBatchPrint(true)}
                          className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-lg font-semibold flex items-center gap-1"
                        >
                          <Printer className="w-3 h-3" />
                          Печать
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {dictations.map((d) => (
                    <div
                      key={d.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-colors ${
                        selectedId === d.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-200'
                      }`}
                    >
                      <button
                        onClick={() => {
                          setSelectedId(d.id);
                          handleReset();
                        }}
                        className="flex-1 text-left"
                      >
                        <p className="text-sm font-semibold text-gray-800">{d.name}</p>
                        <p className="text-[10px] text-gray-500">
                          {DIFFICULTY_LABELS[d.difficulty]} · {d.steps.length} шагов
                        </p>
                      </button>
                      <button onClick={() => handleStartEditor(d)} className="p-1 text-purple-500 hover:bg-purple-50 rounded" title="Редактировать">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteDictation(d.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Удалить">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900">
                <b>Совет:</b> Диктуйте команды медленно и чётко. Дайте ребёнку время нарисовать каждую линию. После завершения сравните результат с образцом.
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button onClick={() => setShowFaq(!showFaq)} className="w-full px-4 py-3 flex items-center justify-between gap-2">
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
                    <div className="px-4 pb-3 pt-1 text-sm text-gray-600 bg-purple-50/50 border-t border-purple-100 whitespace-pre-line">{item.a}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button onClick={() => setShowScen(!showScen)} className="w-full px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-700">Сценарии использования на занятиях</h3>
              <span className="text-xs font-bold text-purple-400">{SCENARIO_ITEMS.length}</span>
            </div>
            {showScen ? <ChevronUp className="w-5 h-5 text-purple-600" /> : <ChevronDown className="w-5 h-5 text-purple-600" />}
          </button>
          {showScen && (
            <div className="px-3 pb-3 space-y-2">
              {SCENARIO_ITEMS.map((s, idx) => (
                <div key={idx} className="border border-purple-100 rounded-xl p-3 flex gap-3 hover:bg-purple-50/30 transition-colors">
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
      </main>

      {showImageExport && selectedDictation && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-purple-700">Сохранить картинку</h2>
              <button onClick={() => setShowImageExport(false)} className="p-2 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-xs text-gray-500">«{selectedDictation.name}» — выберите вариант:</p>
              <button
                onClick={() => { renderDictationImage(selectedDictation, 'blank'); setShowImageExport(false); }}
                className="w-full py-2.5 bg-purple-50 text-purple-700 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              >
                <ImageIcon className="w-4 h-4" /> Пустое поле
              </button>
              <button
                onClick={() => { renderDictationImage(selectedDictation, 'answer'); setShowImageExport(false); }}
                className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              >
                <ImageIcon className="w-4 h-4" /> С ответом
              </button>
              <button
                onClick={() => { renderDictationImage(selectedDictation, 'lines'); setShowImageExport(false); }}
                className="w-full py-2.5 bg-purple-100 text-purple-700 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              >
                <ImageIcon className="w-4 h-4" /> Фигура без поля
              </button>
            </div>
          </div>
        </div>
      )}

      {showBatchPrint && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-purple-700">Пакетная печать</h2>
              <button onClick={() => setShowBatchPrint(false)} className="p-2 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Имя ученика</label>
                  <input
                    type="text"
                    value={printStudentName}
                    onChange={(e) => setPrintStudentName(e.target.value)}
                    placeholder="Иванов Иван"
                    className="w-full rounded-lg border border-purple-200 p-2 text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Класс</label>
                  <input
                    type="text"
                    value={printClass}
                    onChange={(e) => setPrintClass(e.target.value)}
                    placeholder="1-А"
                    className="w-full rounded-lg border border-purple-200 p-2 text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Дата</label>
                  <input
                    type="text"
                    value={printDate}
                    onChange={(e) => setPrintDate(e.target.value)}
                    placeholder="02.09.2026"
                    className="w-full rounded-lg border border-purple-200 p-2 text-sm mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-purple-700 mb-2 block">Выберите диктанты ({selectedForPrint.size})</label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {dictations.map((d) => (
                    <label
                      key={d.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        selectedForPrint.has(d.id) ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedForPrint.has(d.id)}
                        onChange={() => handleTogglePrintSelection(d.id)}
                        className="w-5 h-5 accent-purple-600"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">{d.name}</p>
                        <p className="text-xs text-gray-500">
                          {DIFFICULTY_LABELS[d.difficulty]} · {d.steps.length} шагов
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-2">
              <button onClick={() => setShowBatchPrint(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold">
                Отмена
              </button>
              <button
                onClick={handleBatchPrint}
                disabled={selectedForPrint.size === 0}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Печать ({selectedForPrint.size})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
