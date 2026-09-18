import { useState } from 'react';
import { RefreshCw, Check, AlertTriangle, Grid3x3, FileText, Download, Share2, HelpCircle, ChevronDown } from 'lucide-react';
import { generateBatch } from '@/lib/wordSearchGenerator';
import type { WordSearchResult, WordSearchConfig } from '@/types';
import { triggerHaptic } from '@/lib/haptic';
import BackButton from './BackButton';
import YandexAdBlock from './YandexAdBlock';
import { jsPDF } from 'jspdf';
import { ConfirmDialog } from './ConfirmDialog';

interface ConfirmState {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  action: () => void;
}

const UNICODE_FONTS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', 'Noto Sans', 'Noto Sans Cyrillic', Arial, sans-serif";

// Универсальная функция для рисования филворда на Canvas
const generateCanvas = (
  result: WordSearchResult,
  showAnswers: boolean,
  showWords: boolean,
  variantNum: number,
  isMiniature: boolean = false
) => {
  const gridSize = result.gridSize;
  const cellSize = isMiniature ? (gridSize >= 20 ? 16 : gridSize === 15 ? 20 : 24) : (gridSize >= 20 ? 28 : gridSize === 15 ? 32 : 36);
  const fontSize = isMiniature ? (gridSize >= 20 ? 9 : gridSize === 15 ? 11 : 13) : (gridSize >= 20 ? 14 : gridSize === 15 ? 16 : 18);
  const gap = isMiniature ? 1 : 2;
  const padding = isMiniature ? 15 : 40;
  
  const gridWidth = gridSize * cellSize + (gridSize - 1) * gap;
  const gridHeight = gridWidth;
  const wordListHeight = showWords ? (isMiniature ? 40 : 80) : 0;
  
  const totalWidth = Math.max(gridWidth + padding * 2, isMiniature ? 300 : 600);
  const totalHeight = padding * 2 + (isMiniature ? 25 : 40) + gridHeight + (showWords ? 30 + wordListHeight : 20);
  
  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = totalWidth * scale;
  canvas.height = totalHeight * scale;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  
  ctx.scale(scale, scale);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, totalWidth, totalHeight);
  
  ctx.fillStyle = '#1f2937';
  ctx.font = `bold ${isMiniature ? 14 : 24}px ${UNICODE_FONTS}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Вариант ${variantNum}`, totalWidth / 2, padding + (isMiniature ? 8 : 12));
  
  const startX = (totalWidth - gridWidth) / 2;
  const startY = padding + (isMiniature ? 25 : 40);
  
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const x = startX + c * (cellSize + gap);
      const y = startY + r * (cellSize + gap);
      const letter = result.grid[r][c];
      const isAnswer = showAnswers && result.placedWords.some(pw => 
        pw.cells.some(cell => cell.row === r && cell.col === c)
      );
      
      ctx.fillStyle = isAnswer ? '#fde047' : '#f9fafb';
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(x, y, cellSize, cellSize, isMiniature ? 3 : 6);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(x, y, cellSize, cellSize);
        ctx.strokeRect(x, y, cellSize, cellSize);
      }
      
      ctx.fillStyle = isAnswer ? '#854d0e' : '#1f2937';
      ctx.font = `bold ${fontSize}px ${UNICODE_FONTS}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letter, x + cellSize / 2, y + cellSize / 2 + 1);
    }
  }
  
  if (showAnswers) {
    result.placedWords.forEach(pw => {
      if (pw.cells.length > 1) {
        const first = pw.cells[0];
        const last = pw.cells[pw.cells.length - 1];
        const dr = last.row - first.row;
        const dc = last.col - first.col;
        
        let arrow = '';
        if (dr === 0 && dc === 1) arrow = '→';
        else if (dr === 0 && dc === -1) arrow = '←';
        else if (dr === 1 && dc === 0) arrow = '↓';
        else if (dr === -1 && dc === 0) arrow = '↑';
        else if (dr === 1 && dc === 1) arrow = '↘';
        else if (dr === 1 && dc === -1) arrow = '↙';
        else if (dr === -1 && dc === 1) arrow = '↗';
        else if (dr === -1 && dc === -1) arrow = '↖';

        if (arrow) {
          const x = startX + last.col * (cellSize + gap);
          const y = startY + last.row * (cellSize + gap);
          ctx.fillStyle = '#dc2626';
          const arrowSize = isMiniature ? 14 : 18;
          ctx.font = `900 ${arrowSize}px ${UNICODE_FONTS}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(arrow, x + cellSize * 0.75, y + cellSize * 0.35);
        }
      }
    });
  }
  
  if (showWords) {
    const dividerY = startY + gridHeight + (isMiniature ? 15 : 30);
    ctx.beginPath();
    ctx.moveTo(padding, dividerY);
    ctx.lineTo(totalWidth - padding, dividerY);
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = isMiniature ? 1 : 2;
    ctx.setLineDash([isMiniature ? 3 : 6, isMiniature ? 2 : 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.fillStyle = '#4b5563';
    ctx.font = `bold ${isMiniature ? 11 : 16}px ${UNICODE_FONTS}`;
    ctx.fillText('Список слов:', totalWidth / 2, dividerY + (isMiniature ? 10 : 20));
    
    ctx.font = `${isMiniature ? 9 : 14}px ${UNICODE_FONTS}`;
    let currentX = padding;
    let currentY = dividerY + (isMiniature ? 28 : 50);
    const rowHeight = isMiniature ? 18 : 32;
    
    result.placedWords.forEach((pw) => {
      const textWidth = ctx.measureText(pw.word).width + (isMiniature ? 12 : 24);
      if (currentX + textWidth > totalWidth - padding && currentX > padding) {
        currentX = padding;
        currentY += rowHeight;
      }
      ctx.fillStyle = '#f3e8ff';
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(currentX, currentY - (isMiniature ? 9 : 14), textWidth, isMiniature ? 18 : 28, isMiniature ? 3 : 6);
        ctx.fill();
      } else {
        ctx.fillRect(currentX, currentY - (isMiniature ? 9 : 14), textWidth, isMiniature ? 18 : 28);
      }
      ctx.fillStyle = '#6b21a8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pw.word, currentX + textWidth / 2, currentY);
      currentX += textWidth + (isMiniature ? 5 : 8);
    });
  }
  
  return canvas;
};

const downloadImage = (canvas: HTMLCanvasElement, filename: string) => {
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const shareImage = async (canvas: HTMLCanvasElement, filename: string): Promise<boolean> => {
  if (!navigator.share || !navigator.canShare) return false;
  
  try {
    const blob = await new Promise<Blob | null>(resolve => 
      canvas.toBlob(resolve, 'image/png')
    );
    if (!blob) return false;
    
    const file = new File([blob], filename, { type: 'image/png' });
    if (!navigator.canShare({ files: [file] })) return false;
    
    await navigator.share({
      files: [file],
      title: 'Филворд',
    });
    return true;
  } catch (err) {
    console.log('Share canceled or failed', err);
    return false;
  }
};

// 🆕 Определение мобильного устройства
function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

const FAQ_ITEMS = [
  {
    q: 'Как использовать филворды на уроке?',
    a: 'Сценарий 1: разминка в начале урока — раздайте филворд с терминами из прошлой темы. Сценарий 2: закрепление нового материала — слова из текущего урока. Сценарий 3: соревнование — кто быстрее найдёт все слова. Сценарий 4: домашнее задание — распечатайте и раздайте ученикам.',
  },
  {
    q: 'Какой размер сетки выбрать?',
    a: '10×10 — для младших классов и простых слов (5-8 слов). 15×15 — средний уровень, подходит для большинства уроков (10-15 слов). 20×20 — сложный уровень для старших классов или большого количества терминов (15-25 слов).',
  },
  {
    q: 'Что означает сложность?',
    a: 'Простая — слова размещаются только слева направо (→) и сверху вниз (↓). Средняя — добавляются диагонали (↘, ↙, ↗, ↖). Сложная — слова могут быть задом наперёд (←, ↑). Для младших классов используйте простую, для старших — сложную.',
  },
  {
    q: 'Зачем пакетная генерация?',
    a: 'При генерации 30 вариантов вы получаете индивидуальный филворд для каждого ученика в классе. Это предотвращает списывание — у каждого своё расположение слов. Используйте кнопку PDF для печати всего класса сразу.',
  },
  {
    q: 'Почему некоторые слова не поместились?',
    a: 'Слишком много слов для выбранного размера сетки, или слова слишком длинные. Увеличьте размер сетки (например, с 10×10 на 15×15) или уменьшите количество слов. Оптимально: 8-12 слов для сетки 10×10.',
  },
  {
    q: 'Как распечатать на весь класс?',
    a: 'Установите пакетную генерацию на нужное количество учеников (например, 25). Нажмите «PDF» — скачается файл с отдельной страницей для каждого варианта. Откройте PDF на компьютере и распечатайте. Внимание: скачивание PDF стабильно работает только с компьютера.',
  },
];

export default function WordSearchScreen({ onBack }: { onBack: () => void }) {
  const [wordsInput, setWordsInput] = useState('МАТЕМАТИКА\nУЧИТЕЛЬ\nШКОЛА\nУРОК\nЗНАНИЯ');
  const [config, setConfig] = useState<WordSearchConfig>({ gridSize: 10, difficulty: 'medium' });
  const [results, setResults] = useState<WordSearchResult[]>([]);
  const [showAnswers, setShowAnswers] = useState(false);
  const [showWordList, setShowWordList] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [batchCount, setBatchCount] = useState(1);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportSuccess, setExportSuccess] = useState('');
  const [showFaq, setShowFaq] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const handleGenerate = async (count: number) => {
    if (!wordsInput.trim()) return;
    setIsGenerating(true);
    setExportError('');
    setExportSuccess('');
    triggerHaptic('medium');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const newResults = generateBatch(wordsInput, config, count);
    setResults(newResults);
    setShowAnswers(false);
    setIsGenerating(false);
  };

  const handleDownloadImage = (result: WordSearchResult, index: number) => {
    triggerHaptic('light');
    setExportError('');
    setExportSuccess('');
    const canvas = generateCanvas(result, showAnswers, showWordList, index + 1, false);
    downloadImage(canvas, `филворд_вариант_${index + 1}.png`);
    setExportSuccess('Изображение скачано');
    setTimeout(() => setExportSuccess(''), 2000);
  };

  const handleShareImage = async (result: WordSearchResult, index: number) => {
    triggerHaptic('light');
    setExportError('');
    setExportSuccess('');
    const canvas = generateCanvas(result, showAnswers, showWordList, index + 1, false);
    const success = await shareImage(canvas, `филворд_вариант_${index + 1}.png`);
    if (success) {
      setExportSuccess('Изображение отправлено');
    } else {
      downloadImage(canvas, `филворд_вариант_${index + 1}.png`);
      setExportSuccess('Изображение скачано');
    }
    setTimeout(() => setExportSuccess(''), 2000);
  };

  const downloadAsPDF = async () => {
    if (results.length === 0) return;
    setIsExportingPDF(true);
    setExportError('');
    setExportSuccess('');
    triggerHaptic('medium');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const usableWidth = pageWidth - margin * 2;
      
      for (let i = 0; i < results.length; i++) {
        if (i > 0) doc.addPage();
        const canvas = generateCanvas(results[i], false, showWordList, i + 1, false);
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = usableWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        doc.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      }
      
      doc.save(`филворды_${results.length}шт.pdf`);
      setExportSuccess('PDF скачан! Проверьте загрузки устройства');
      
    } catch (err) {
      console.error('PDF generation error:', err);
      setExportError('Ошибка при создании PDF. Попробуйте еще раз.');
    } finally {
      setIsExportingPDF(false);
      triggerHaptic('heavy');
    }
  };

  // 🆕 ПРЕДУПРЕЖДЕНИЕ перед скачиванием PDF
  const handleExportPDFRequest = () => {
    const mobile = isMobileDevice();
    setConfirmState({
      title: '⚠️ Скачивание PDF',
      message: mobile
        ? 'Вы работаете с мобильного устройства. Скачивание PDF стабильно работает только при работе с компьютера. На телефоне или в мини-апе ВКонтакте файл может не сохраниться, а кириллица может отобразиться некорректно. Для гарантированного результата откройте приложение на компьютере. Всё равно продолжить?'
        : 'Скачивание PDF стабильно работает при работе с компьютера. В мобильном браузере или мини-апе ВКонтакте файл может не сохраниться. Продолжить?',
      confirmLabel: 'Скачать PDF',
      danger: false,
      action: () => {
        downloadAsPDF();
      },
    });
  };

  const getGridStyles = (size: number) => {
    if (size >= 20) return { width: 'min(100%, 400px)', fontSize: 'text-[10px] sm:text-xs', cellSize: '20px' };
    if (size === 15) return { width: 'min(100%, 360px)', fontSize: 'text-xs sm:text-sm', cellSize: '24px' };
    return { width: 'min(100%, 320px)', fontSize: 'text-sm sm:text-base', cellSize: '32px' };
  };

  return (
    <div className="min-h-[100dvh] notebook-bg flex flex-col">
      {/* 🆕 ЕДИНАЯ ШАПКА: кнопка → название → иконка в одну линию */}
      <header className="bg-purple-700 shadow-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Генератор филвордов</h1>
          </div>
          <Grid3x3 className="w-6 h-6 text-white/70 shrink-0" />
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 space-y-4 pb-8">
        {/* 🆕 Информационная плашка: инструмент + количество вариантов */}
        <div className="bg-white rounded-2xl shadow-sm p-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500">Инструмент</p>
            <p className="text-sm font-bold text-purple-700 truncate">Поиск слов</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-gray-500">Вариантов</p>
            <p className="text-sm font-bold text-purple-700">{results.length}</p>
          </div>
          <div className="shrink-0 w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
            <Grid3x3 className="w-5 h-5" />
          </div>
        </div>

        <section className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <div>
            <label className="text-sm font-semibold text-purple-700 block mb-2">Слова (каждое с новой строки)</label>
            <textarea
              value={wordsInput}
              onChange={(e) => setWordsInput(e.target.value)}
              className="w-full h-32 rounded-xl border border-purple-200 p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-y"
              placeholder="Введите слова..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-purple-700 block mb-2">Размер сетки</label>
              <select
                value={config.gridSize}
                onChange={(e) => setConfig({ ...config, gridSize: Number(e.target.value) })}
                className="w-full rounded-xl border border-purple-200 p-3 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value={10}>10 x 10 (Легко)</option>
                <option value={15}>15 x 15 (Средне)</option>
                <option value={20}>20 x 20 (Сложно)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-purple-700 block mb-2">Сложность</label>
              <select
                value={config.difficulty}
                onChange={(e) => setConfig({ ...config, difficulty: e.target.value as any })}
                className="w-full rounded-xl border border-purple-200 p-3 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="easy">Простая (→, ↓)</option>
                <option value="medium">Средняя (+ диагонали)</option>
                <option value="hard">Сложная (+ задом наперед)</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => handleGenerate(1)}
            disabled={isGenerating}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Генерация...' : 'Создать 1 вариант'}
          </button>
          
          <div className="space-y-3 pt-2 border-t border-purple-100">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-purple-700">Пакетная генерация</span>
              <span className="text-sm font-bold text-purple-700">{batchCount} шт.</span>
            </div>
            
            <div className="flex items-center gap-2">
              <input 
                type="range" 
                min="1" 
                max="30" 
                value={batchCount} 
                onChange={(e) => setBatchCount(Number(e.target.value))}
                className="flex-1 accent-purple-600"
              />
              <button
                onClick={() => handleGenerate(batchCount)}
                disabled={isGenerating || batchCount === 1}
                className="bg-violet-100 hover:bg-violet-200 text-violet-700 font-semibold rounded-xl px-3 py-2 text-sm active:scale-95 transition-transform disabled:opacity-50 shrink-0"
              >
                Создать
              </button>
              <button
                onClick={handleExportPDFRequest}
                disabled={isExportingPDF || results.length === 0}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl px-3 py-2 text-sm flex items-center gap-1.5 active:scale-95 transition-transform disabled:opacity-50 shrink-0"
              >
                <FileText className="w-4 h-4" />
                <span>{isExportingPDF ? '...' : 'PDF'}</span>
              </button>
            </div>
            
            {/* 🆕 Постоянное предупреждение о стабильности PDF */}
            <p className="text-center text-[11px] text-gray-500 flex items-center justify-center gap-1 px-2 leading-relaxed">
              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
              Скачивание PDF стабильно работает только с компьютера.
            </p>
          </div>
        </section>

        {exportError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{exportError}</p>
          </div>
        )}

        {exportSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-2">
            <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
            <p className="text-xs text-green-700">{exportSuccess}</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-700 truncate">Ответы</span>
                <button
                  onClick={() => { setShowAnswers(!showAnswers); triggerHaptic('light'); }}
                  className={`relative shrink-0 w-12 h-7 rounded-full transition-colors duration-200 ${
                    showAnswers ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                  aria-label="Переключить ответы"
                >
                  <span
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                      showAnswers ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-700 truncate">Слова</span>
                <button
                  onClick={() => { setShowWordList(!showWordList); triggerHaptic('light'); }}
                  className={`relative shrink-0 w-12 h-7 rounded-full transition-colors duration-200 ${
                    showWordList ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                  aria-label="Переключить список слов"
                >
                  <span
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                      showWordList ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {results.map((result, index) => {
            const { width, fontSize, cellSize } = getGridStyles(result.gridSize);
            
            return (
              <div key={result.id} className="bg-white rounded-2xl shadow-md p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-purple-700">Вариант #{index + 1}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownloadImage(result, index)}
                      className="flex items-center gap-1.5 text-sm font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-2 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" /> Скачать
                    </button>
                    <button
                      onClick={() => handleShareImage(result, index)}
                      className="flex items-center gap-1.5 text-sm font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-2 rounded-lg transition-colors"
                    >
                      <Share2 className="w-4 h-4" /> Отправить
                    </button>
                  </div>
                </div>

                {result.failedWords.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-700">
                      Не поместились: {result.failedWords.join(', ')}. Попробуйте увеличить размер сетки или уменьшить количество слов.
                    </p>
                  </div>
                )}

                <div className="p-4 bg-white rounded-xl border border-gray-100">
                  <h4 className="text-center font-bold text-lg mb-4 text-gray-800">Найди слова:</h4>
                  
                  <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                    <div 
                      className="grid gap-0.5 sm:gap-1 mx-auto select-none"
                      style={{ 
                        gridTemplateColumns: `repeat(${result.gridSize}, 1fr)`,
                        width: width
                      }}
                    >
                      {result.grid.map((row, r) =>
                        row.map((letter, c) => {
                          const isAnswer = showAnswers && result.placedWords.some(pw => 
                            pw.cells.some(cell => cell.row === r && cell.col === c)
                          );
                          
                          return (
                            <div
                              key={`${r}-${c}`}
                              className={`flex items-center justify-center font-bold rounded border ${fontSize} ${
                                isAnswer 
                                  ? 'bg-yellow-200 border-yellow-400 text-yellow-900' 
                                  : 'bg-gray-50 border-gray-200 text-gray-800'
                              }`}
                              style={{ width: cellSize, height: cellSize }}
                            >
                              {letter}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {showWordList && (
                    <div className="border-t-2 border-dashed border-gray-300 pt-4 mt-4">
                      <p className="text-center font-semibold text-gray-700 mb-3">Список слов:</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {result.placedWords.map((pw, i) => (
                          <span key={i} className="bg-purple-100 text-purple-800 px-2.5 py-1 rounded-md text-sm font-medium">
                            {pw.word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 🆕 FAQ секция */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-lg font-bold text-purple-700 mb-3 flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Частые вопросы
          </h2>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, index) => (
              <div key={index} className="border border-purple-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between gap-2 hover:bg-purple-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-gray-800">{item.q}</span>
                  <ChevronDown className={`w-4 h-4 text-purple-600 shrink-0 transition-transform duration-200 ${openFaq === index ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === index && (
                  <div className="px-4 py-3 bg-purple-50 border-t border-purple-100">
                    <p className="text-sm text-gray-700 leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <YandexAdBlock />
        </div>
      </main>

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
    </div>
  );
}
