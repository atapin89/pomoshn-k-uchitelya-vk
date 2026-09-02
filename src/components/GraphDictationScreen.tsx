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
  Download,
  BookOpen,
  HelpCircle,
  ChevronDown,
  ChevronUp,
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

const PRESET_DICTATIONS: Dictation[] = [
  {
    id: 'flower',
    name: 'Цветочек',
    difficulty: 'easy',
    startOffset: { x: 8, y: 8 },
    steps: [
      { direction: 'right', cells: 2 },
      { direction: 'down', cells: 1 },
      { direction: 'right', cells: 1 },
      { direction: 'up', cells: 1 },
      { direction: 'right', cells: 1 },
      { direction: 'up', cells: 2 },
      { direction: 'left', cells: 1 },
      { direction: 'up', cells: 1 },
      { direction: 'left', cells: 1 },
      { direction: 'down', cells: 1 },
      { direction: 'left', cells: 2 },
      { direction: 'down', cells: 1 },
      { direction: 'left', cells: 1 },
      { direction: 'up', cells: 1 },
      { direction: 'left', cells: 1 },
      { direction: 'down', cells: 2 },
      { direction: 'right', cells: 1 },
      { direction: 'down', cells: 1 },
    ],
  },
  {
    id: 'house',
    name: 'Домик',
    difficulty: 'easy',
    startOffset: { x: 6, y: 10 },
    steps: [
      { direction: 'right', cells: 6 },
      { direction: 'up', cells: 4 },
      { direction: 'left', cells: 3 },
      { direction: 'up', cells: 2 },
      { direction: 'left', cells: 3 },
      { direction: 'down', cells: 2 },
      { direction: 'down', cells: 4 },
    ],
  },
  {
    id: 'cat',
    name: 'Котик',
    difficulty: 'medium',
    startOffset: { x: 7, y: 8 },
    steps: [
      { direction: 'right', cells: 1 },
      { direction: 'up', cells: 1 },
      { direction: 'right', cells: 1 },
      { direction: 'up', cells: 2 },
      { direction: 'right', cells: 2 },
      { direction: 'down', cells: 1 },
      { direction: 'right', cells: 1 },
      { direction: 'down', cells: 1 },
      { direction: 'right', cells: 1 },
      { direction: 'down', cells: 2 },
      { direction: 'left', cells: 1 },
      { direction: 'down', cells: 1 },
      { direction: 'left', cells: 2 },
      { direction: 'up', cells: 1 },
      { direction: 'left', cells: 1 },
      { direction: 'down', cells: 1 },
      { direction: 'left', cells: 2 },
      { direction: 'up', cells: 2 },
    ],
  },
  {
    id: 'star',
    name: 'Звезда',
    difficulty: 'hard',
    startOffset: { x: 10, y: 6 },
    steps: [
      { direction: 'down', cells: 2 },
      { direction: 'right', cells: 2 },
      { direction: 'down', cells: 1 },
      { direction: 'left', cells: 2 },
      { direction: 'down', cells: 2 },
      { direction: 'left', cells: 1 },
      { direction: 'up', cells: 2 },
      { direction: 'left', cells: 2 },
      { direction: 'up', cells: 1 },
      { direction: 'right', cells: 2 },
      { direction: 'up', cells: 2 },
      { direction: 'right', cells: 1 },
    ],
  },
];

const DIRECTION_LABELS: Record<Direction, string> = {
  up: '↑ вверх',
  down: '↓ вниз',
  left: '← влево',
  right: '→ вправо',
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
    q: 'Что развивает это упражнение?',
    a: 'Мелкую моторику, пространственное восприятие (право-лево, верх-низ), слуховое внимание, память, навык работы по инструкции и самоконтроль.',
  },
  {
    q: 'Как проводить диктант?',
    a: '1. Ребёнок ставит точку в начальной позиции\n2. Вы диктуете команды: "2 клетки вправо, 1 вниз..."\n3. Ребёнок рисует, не отрывая карандаш\n4. После завершения сравниваете с образцом',
  },
  {
    q: 'Можно ли использовать на уроке?',
    a: 'Да, отлично подходит для:\n• Разминки перед уроком (5 минут)\n• Физкультминутки\n• Индивидуальной работы\n• Подготовки к письму',
  },
  {
    q: 'Как проверить результат?',
    a: 'Нажмите кнопку "Показать ответ" — появится готовый рисунок. Сравните с тем, что нарисовал ребёнок. Если есть ошибки — найдите шаг, где линия пошла не туда.',
  },
];

function formatStep(step: Step): string {
  return `${step.cells} ${step.cells === 1 ? 'клетка' : step.cells < 5 ? 'клетки' : 'клеток'} ${DIRECTION_LABELS[step.direction]}`;
}

export default function GraphDictationScreen({ onBack }: { onBack: () => void }) {
  const [dictations, setDictations] = useState<Dictation[]>(() => {
    try {
      const raw = localStorage.getItem('graph-dictations');
      if (raw) return JSON.parse(raw);
    } catch {}
    return PRESET_DICTATIONS;
  });

  const [selectedId, setSelectedId] = useState<string>(PRESET_DICTATIONS[0].id);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [openFaqItem, setOpenFaqItem] = useState<number | null>(null);
  const [autoPlaySpeed, setAutoPlaySpeed] = useState(2000);

  const selectedDictation = dictations.find((d) => d.id === selectedId) || dictations[0];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('graph-dictations', JSON.stringify(dictations));
    } catch {}
  }, [dictations]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = GRID_WIDTH * CELL_SIZE;
    const height = GRID_HEIGHT * CELL_SIZE;
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // Рисуем сетку
    ctx.strokeStyle = '#e5e7eb';
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

    // Начальная точка
    const startX = selectedDictation.startOffset.x * CELL_SIZE;
    const startY = selectedDictation.startOffset.y * CELL_SIZE;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(startX, startY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Рисуем линии по шагам
    ctx.strokeStyle = showAnswer ? '#10b981' : '#3b82f6';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let currentX = startX;
    let currentY = startY;

    const stepsToDraw = showAnswer ? selectedDictation.steps.length : currentStep;

    for (let i = 0; i < stepsToDraw; i++) {
      const step = selectedDictation.steps[i];
      let newX = currentX;
      let newY = currentY;

      switch (step.direction) {
        case 'up':
          newY -= step.cells * CELL_SIZE;
          break;
        case 'down':
          newY += step.cells * CELL_SIZE;
          break;
        case 'left':
          newX -= step.cells * CELL_SIZE;
          break;
        case 'right':
          newX += step.cells * CELL_SIZE;
          break;
      }

      ctx.beginPath();
      ctx.moveTo(currentX, currentY);
      ctx.lineTo(newX, newY);
      ctx.stroke();

      currentX = newX;
      currentY = newY;
    }

    // Конечная точка (если все шаги выполнены)
    if (currentStep === selectedDictation.steps.length || showAnswer) {
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(currentX, currentY, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [selectedDictation, currentStep, showAnswer]);

  useEffect(() => {
    if (isPlaying && currentStep < selectedDictation.steps.length) {
      intervalRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= selectedDictation.steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, autoPlaySpeed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, currentStep, selectedDictation.steps.length, autoPlaySpeed]);

  const handleNextStep = () => {
    if (currentStep < selectedDictation.steps.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
    setShowAnswer(false);
  };

  const handlePlayPause = () => {
    if (currentStep === selectedDictation.steps.length) {
      handleReset();
    }
    setIsPlaying(!isPlaying);
  };

  const handleDeleteDictation = (id: string) => {
    if (!confirm('Удалить этот диктант?')) return;
    setDictations((prev) => prev.filter((d) => d.id !== id));
    if (selectedId === id) {
      setSelectedId(dictations[0]?.id || '');
    }
  };

  const handleExportPDF = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Графический диктант: ${selectedDictation.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #7c3aed; }
            .instructions { margin: 20px 0; }
            .step { margin: 5px 0; }
            canvas { border: 2px solid #e5e7eb; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>Графический диктант: ${selectedDictation.name}</h1>
          <p><strong>Сложность:</strong> ${DIFFICULTY_LABELS[selectedDictation.difficulty]}</p>
          <p><strong>Начало:</strong> отступить ${selectedDictation.startOffset.x} клеток слева, ${selectedDictation.startOffset.y} клеток сверху</p>
          <div class="instructions">
            <h2>Инструкция:</h2>
            ${selectedDictation.steps.map((step, i) => `<div class="step">${i + 1}. ${formatStep(step)}</div>`).join('')}
          </div>
          <canvas id="canvas" width="${canvas.width}" height="${canvas.height}"></canvas>
          <script>
            const img = new Image();
            img.onload = () => {
              const canvas = document.getElementById('canvas');
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              setTimeout(() => window.print(), 100);
            };
            img.src = '${canvas.toDataURL()}';
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-green-50 to-blue-50 flex flex-col">
      <header className="bg-gradient-to-r from-green-700 to-emerald-600 shadow-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Графический диктант</h1>
            <p className="text-xs text-green-200">Развитие пространственного мышления</p>
          </div>
          <BookOpen className="w-6 h-6 text-white/70" />
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-3 space-y-3 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
          {/* ЛЕВАЯ КОЛОНКА: Сетка и управление */}
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">{selectedDictation.name}</h2>
                  <p className="text-xs text-gray-500">
                    {DIFFICULTY_LABELS[selectedDictation.difficulty]} · {selectedDictation.steps.length} шагов · Шаг {currentStep}/{selectedDictation.steps.length}
                  </p>
                </div>
                <button
                  onClick={() => setShowAnswer(!showAnswer)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                    showAnswer ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {showAnswer ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showAnswer ? 'Скрыть ответ' : 'Показать ответ'}
                </button>
              </div>

              <div className="flex justify-center mb-3">
                <canvas
                  ref={canvasRef}
                  className="border-2 border-gray-300 rounded-lg"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={handlePlayPause}
                    disabled={showAnswer}
                    className={`flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 ${
                      isPlaying
                        ? 'bg-yellow-500 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white disabled:opacity-50'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {isPlaying ? 'Пауза' : currentStep === selectedDictation.steps.length ? 'Заново' : 'Старт'}
                  </button>
                  <button
                    onClick={handleNextStep}
                    disabled={isPlaying || showAnswer || currentStep === selectedDictation.steps.length}
                    className="px-4 py-2.5 rounded-xl bg-blue-100 text-blue-700 font-semibold text-sm flex items-center gap-1 disabled:opacity-50"
                  >
                    <SkipForward className="w-4 h-4" />
                    Следующий
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm flex items-center gap-1"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Сброс
                  </button>
                </div>

                {!isPlaying && currentStep < selectedDictation.steps.length && !showAnswer && (
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-600 mb-1">Следующий шаг:</p>
                    <p className="text-lg font-bold text-blue-700">
                      {formatStep(selectedDictation.steps[currentStep])}
                    </p>
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
                    className="w-full accent-green-600"
                  />
                </div>
              </div>
            </div>

            {/* Инструкция */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-bold text-gray-800 mb-2">Полная инструкция</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {selectedDictation.steps.map((step, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 text-xs p-1.5 rounded ${
                      i < currentStep
                        ? 'bg-green-50 text-green-700'
                        : i === currentStep
                        ? 'bg-blue-100 text-blue-700 font-bold'
                        : 'text-gray-500'
                    }`}
                  >
                    <span className="w-6 text-right">{i + 1}.</span>
                    <span className="flex-1">{formatStep(step)}</span>
                    {i < currentStep && <span className="text-green-600">✓</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ПРАВАЯ КОЛОНКА: Выбор диктанта */}
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-3 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-800">Выбор диктанта</label>
                <button
                  onClick={handleExportPDF}
                  className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-lg font-semibold flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> PDF
                </button>
              </div>
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {dictations.map((d) => (
                  <div
                    key={d.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-colors ${
                      selectedId === d.id ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
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
                    {!PRESET_DICTATIONS.find((p) => p.id === d.id) && (
                      <button
                        onClick={() => handleDeleteDictation(d.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900">
              <b>Совет:</b> Диктуйте команды медленно и чётко. Дайте ребёнку время нарисовать каждую линию. После завершения сравните результат с образцом.
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowFaq(!showFaq)}
            className="w-full px-4 py-3 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-green-600" />
              <h3 className="font-bold text-green-700">Частые вопросы</h3>
              <span className="text-xs font-bold text-green-400">{FAQ_ITEMS.length}</span>
            </div>
            {showFaq ? <ChevronUp className="w-5 h-5 text-green-600" /> : <ChevronDown className="w-5 h-5 text-green-600" />}
          </button>
          {showFaq && (
            <div className="px-3 pb-3 space-y-2">
              {FAQ_ITEMS.map((item, idx) => (
                <div key={idx} className="border border-green-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaqItem(openFaqItem === idx ? null : idx)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-green-50 transition-colors"
                  >
                    <span className="font-semibold text-sm text-gray-800">{item.q}</span>
                    {openFaqItem === idx ? (
                      <ChevronUp className="w-4 h-4 text-green-600 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-green-600 shrink-0" />
                    )}
                  </button>
                  {openFaqItem === idx && (
                    <div className="px-4 pb-3 pt-1 text-sm text-gray-600 bg-green-50/50 border-t border-green-100 whitespace-pre-line">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
