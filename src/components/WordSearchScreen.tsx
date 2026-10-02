import { useState } from 'react';
import { RefreshCw, Check, AlertTriangle, Grid3x3, FileText, Download, Share2, HelpCircle, ChevronDown, Globe } from 'lucide-react';
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

// 🆕 Готовые наборы слов
const WORD_PRESETS: Record<'ru' | 'en', { name: string; words: string }[]> = {
  ru: [
    { name: 'Математика', words: 'СЛОЖЕНИЕ\nВЫЧИТАНИЕ\nУМНОЖЕНИЕ\nДЕЛЕНИЕ\nДРОБЬ\nПРОЦЕНТ\nФОРМУЛА\nУРАВНЕНИЕ' },
    { name: 'Русский язык', words: 'СУЩЕСТВИТЕЛЬНОЕ\nПРИЛАГАТЕЛЬНОЕ\nГЛАГОЛ\nНАРЕЧИЕ\nПРЕДЛОГ\nСОЮЗ\nПОДЛЕЖАЩЕЕ\nСКАЗУЕМОЕ' },
    { name: 'Окружающий мир', words: 'ПЛАНЕТА\nОКЕАН\nКОНТИНЕНТ\nВУЛКАН\nРЕКА\nОЗЕРО\nЛЕС\nПУСТЫНЯ' },
    { name: 'Животные', words: 'ЛЕВ\nТИГР\nСЛОН\nЖИРАФ\nПАНДА\nКОАЛА\nДЕЛЬФИН\nОРЕЛ' },
    { name: 'Профессии', words: 'ВРАЧ\nУЧИТЕЛЬ\nИНЖЕНЕР\nПОВАР\nПИЛОТ\nХУДОЖНИК\nМУЗЫКАНТ\nПРОГРАММИСТ' },
    { name: 'Еда', words: 'ХЛЕБ\nМОЛОКО\nСЫР\nМАСЛО\nЯБЛОКО\nБАНАН\nТОМАТ\nОГУРЕЦ' },
  ],
  en: [
    { name: 'Math', words: 'ADDITION\nSUBTRACTION\nMULTIPLY\nDIVISION\nFRACTION\nPERCENT\nFORMULA\nEQUATION' },
    { name: 'Animals', words: 'LION\nTIGER\nELEPHANT\nGIRAFFE\nPANDA\nKOALA\nDOLPHIN\nEAGLE' },
    { name: 'Food', words: 'BREAD\nMILK\nCHEESE\nBUTTER\nAPPLE\nBANANA\nTOMATO\nCUCUMBER' },
    { name: 'Colors', words: 'RED\nBLUE\nGREEN\nYELLOW\nPURPLE\nORANGE\nBLACK\nWHITE' },
    { name: 'School', words: 'MATH\nSCIENCE\nHISTORY\nENGLISH\nART\nMUSIC\nSPORTS\nREADING' },
    { name: 'Jobs', words: 'DOCTOR\nTEACHER\nENGINEER\nCHEF\nPILOT\nARTIST\nMUSICIAN\nNURSE' },
  ],
};

// 🆕 Переводы интерфейса
const TRANSLATIONS = {
  ru: {
    title: 'Генератор филвордов',
    tool: 'Инструмент',
    search: 'Поиск слов',
    variants: 'Вариантов',
    wordsLabel: 'Слова (каждое с новой строки)',
    wordsPlaceholder: 'Введите слова...',
    gridSize: 'Размер сетки',
    difficulty: 'Сложность',
    easy: '10 x 10 (Легко)',
    medium: '15 x 15 (Средне)',
    hard: '20 x 20 (Сложно)',
    easyLevel: 'Простая (→, ↓)',
    mediumLevel: 'Средняя (+ диагонали)',
    hardLevel: 'Сложная (+ задом наперед)',
    generate: 'Создать 1 вариант',
    generating: 'Генерация...',
    batchGeneration: 'Пакетная генерация',
    pieces: 'шт.',
    create: 'Создать',
    pdfWarning: 'Скачивание PDF стабильно работает только с компьютера.',
    answers: 'Ответы',
    words: 'Слова',
    variant: 'Вариант',
    findWords: 'Найди слова:',
    wordList: 'Список слов:',
    download: 'Скачать',
    share: 'Отправить',
    notPlaced: 'Не поместились:',
    tryIncrease: 'Попробуйте увеличить размер сетки или уменьшить количество слов.',
    faqTitle: 'Частые вопросы',
    presetLabel: 'Готовый набор',
    selectPreset: 'Выбрать...',
    imageDownloaded: 'Изображение скачано',
    imageSent: 'Изображение отправлено',
    pdfDownloaded: 'PDF скачан! Проверьте загрузки устройства',
    pdfError: 'Ошибка при создании PDF. Попробуйте еще раз.',
    pdfWarningTitle: '⚠️ Скачивание PDF',
    pdfWarningMobile: 'Вы работаете с мобильного устройства. Скачивание PDF стабильно работает только при работе с компьютера. На телефоне или в мини-апе ВКонтакте файл может не сохраниться, а кириллица может отобразиться некорректно. Для гарантированного результата откройте приложение на компьютере. Всё равно продолжить?',
    pdfWarningDesktop: 'Скачивание PDF стабильно работает при работе с компьютера. В мобильном браузере или мини-апе ВКонтакте файл может не сохраниться. Продолжить?',
    confirmDownload: 'Скачать PDF',
    language: 'Язык',
  },
  en: {
    title: 'Word Search Generator',
    tool: 'Tool',
    search: 'Word Search',
    variants: 'Variants',
    wordsLabel: 'Words (each on a new line)',
    wordsPlaceholder: 'Enter words...',
    gridSize: 'Grid size',
    difficulty: 'Difficulty',
    easy: '10 x 10 (Easy)',
    medium: '15 x 15 (Medium)',
    hard: '20 x 20 (Hard)',
    easyLevel: 'Easy (→, ↓)',
    mediumLevel: 'Medium (+ diagonals)',
    hardLevel: 'Hard (+ reverse)',
    generate: 'Generate 1 variant',
    generating: 'Generating...',
    batchGeneration: 'Batch generation',
    pieces: 'pcs',
    create: 'Create',
    pdfWarning: 'PDF download works reliably only on desktop.',
    answers: 'Answers',
    words: 'Words',
    variant: 'Variant',
    findWords: 'Find the words:',
    wordList: 'Word list:',
    download: 'Download',
    share: 'Share',
    notPlaced: 'Not placed:',
    tryIncrease: 'Try increasing grid size or reducing word count.',
    faqTitle: 'FAQ',
    presetLabel: 'Preset',
    selectPreset: 'Select...',
    imageDownloaded: 'Image downloaded',
    imageSent: 'Image sent',
    pdfDownloaded: 'PDF downloaded! Check your downloads folder',
    pdfError: 'Error creating PDF. Try again.',
    pdfWarningTitle: '⚠️ PDF Download',
    pdfWarningMobile: 'You are using a mobile device. PDF download works reliably only on desktop. On a phone or in VK mini-app the file may not save, and text may display incorrectly. For guaranteed results, open the app on a computer. Continue anyway?',
    pdfWarningDesktop: 'PDF download works reliably on desktop. In mobile browser or VK mini-app the file may not save. Continue?',
    confirmDownload: 'Download PDF',
    language: 'Language',
  },
};

// 🆕 FAQ на двух языках
const FAQ_ITEMS = {
  ru: [
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
  ],
  en: [
    {
      q: 'How to use word searches in class?',
      a: 'Scenario 1: warm-up at the start of class — distribute a word search with terms from the previous topic. Scenario 2: reinforcing new material — words from the current lesson. Scenario 3: competition — who finds all words first. Scenario 4: homework — print and distribute to students.',
    },
    {
      q: 'What grid size should I choose?',
      a: '10×10 — for younger grades and simple words (5-8 words). 15×15 — medium level, suitable for most lessons (10-15 words). 20×20 — advanced level for older grades or many terms (15-25 words).',
    },
    {
      q: 'What does difficulty mean?',
      a: 'Easy — words placed only left to right (→) and top to bottom (↓). Medium — adds diagonals (↘, ↙, ↗, ↖). Hard — words can be reversed (←, ↑). Use easy for younger grades, hard for older.',
    },
    {
      q: 'Why batch generation?',
      a: 'Generating 30 variants gives you an individual word search for each student in the class. This prevents cheating — everyone has a different word arrangement. Use the PDF button to print for the whole class at once.',
    },
    {
      q: 'Why didn\'t some words fit?',
      a: 'Too many words for the chosen grid size, or words are too long. Increase grid size (e.g., from 10×10 to 15×15) or reduce word count. Optimal: 8-12 words for a 10×10 grid.',
    },
    {
      q: 'How to print for the whole class?',
      a: 'Set batch generation to the number of students (e.g., 25). Click "PDF" — a file with a separate page for each variant will download. Open the PDF on your computer and print. Note: PDF download works reliably only on desktop.',
    },
  ],
};

// Универсальная функция для рисования филворда на Canvas
const generateCanvas = (
  result: WordSearchResult,
  showAnswers: boolean,
  showWords: boolean,
  variantNum: number,
  language: 'ru' | 'en',
  isMiniature: boolean = false
) => {
  const t = TRANSLATIONS[language];
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
  ctx.fillText(`${t.variant} ${variantNum}`, totalWidth / 2, padding + (isMiniature ? 8 : 12));
  
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
    ctx.fillText(t.wordList, totalWidth / 2, dividerY + (isMiniature ? 10 : 20));
    
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
      title: 'Word Search',
    });
    return true;
  } catch (err) {
    console.log('Share canceled or failed', err);
    return false;
  }
};

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export default function WordSearchScreen({ onBack }: { onBack: () => void }) {
  const [language, setLanguage] = useState<'ru' | 'en'>(() => {
    try {
      const saved = localStorage.getItem('wordsearch-language');
      if (saved === 'en') return 'en';
    } catch {}
    return 'ru';
  });
  
  const t = TRANSLATIONS[language];
  const faqItems = FAQ_ITEMS[language];
  const presets = WORD_PRESETS[language];
  
  const [wordsInput, setWordsInput] = useState(language === 'ru' 
    ? 'МАТЕМАТИКА\nУЧИТЕЛЬ\nШКОЛА\nУРОК\nЗНАНИЯ'
    : 'MATHEMATICS\nTEACHER\nSCHOOL\nLESSON\nKNOWLEDGE'
  );
  const [config, setConfig] = useState<WordSearchConfig>({ gridSize: 10, difficulty: 'medium', language });
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
  const [selectedPreset, setSelectedPreset] = useState('');

  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  // 🆕 Обработка смены языка
  const handleLanguageChange = (newLang: 'ru' | 'en') => {
    setLanguage(newLang);
    setConfig(prev => ({ ...prev, language: newLang }));
    try {
      localStorage.setItem('wordsearch-language', newLang);
    } catch {}
    
    // Если поле содержит только дефолтные слова — заменить на дефолтные другого языка
    const defaultRU = 'МАТЕМАТИКА\nУЧИТЕЛЬ\nШКОЛА\nУРОК\nЗНАНИЯ';
    const defaultEN = 'MATHEMATICS\nTEACHER\nSCHOOL\nLESSON\nKNOWLEDGE';
    
    if (wordsInput === defaultRU || wordsInput === defaultEN || !wordsInput.trim()) {
      setWordsInput(newLang === 'ru' ? defaultRU : defaultEN);
    }
    
    setSelectedPreset('');
    triggerHaptic('light');
  };

  // 🆕 Обработка выбора пресета
  const handlePresetChange = (presetName: string) => {
    setSelectedPreset(presetName);
    if (presetName) {
      const preset = presets.find(p => p.name === presetName);
      if (preset) {
        setWordsInput(preset.words);
        triggerHaptic('light');
      }
    }
  };

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
    const canvas = generateCanvas(result, showAnswers, showWordList, index + 1, language, false);
    const filename = language === 'ru' 
      ? `филворд_вариант_${index + 1}.png`
      : `wordsearch_variant_${index + 1}.png`;
    downloadImage(canvas, filename);
    setExportSuccess(t.imageDownloaded);
    setTimeout(() => setExportSuccess(''), 2000);
  };

  const handleShareImage = async (result: WordSearchResult, index: number) => {
    triggerHaptic('light');
    setExportError('');
    setExportSuccess('');
    const canvas = generateCanvas(result, showAnswers, showWordList, index + 1, language, false);
    const filename = language === 'ru' 
      ? `филворд_вариант_${index + 1}.png`
      : `wordsearch_variant_${index + 1}.png`;
    const success = await shareImage(canvas, filename);
    if (success) {
      setExportSuccess(t.imageSent);
    } else {
      downloadImage(canvas, filename);
      setExportSuccess(t.imageDownloaded);
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
        const canvas = generateCanvas(results[i], false, showWordList, i + 1, language, false);
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = usableWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        doc.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      }
      
      const filename = language === 'ru'
        ? `филворды_${results.length}шт.pdf`
        : `wordsearch_${results.length}pcs.pdf`;
      doc.save(filename);
      setExportSuccess(t.pdfDownloaded);
      
    } catch (err) {
      console.error('PDF generation error:', err);
      setExportError(t.pdfError);
    } finally {
      setIsExportingPDF(false);
      triggerHaptic('heavy');
    }
  };

  const handleExportPDFRequest = () => {
    const mobile = isMobileDevice();
    setConfirmState({
      title: t.pdfWarningTitle,
      message: mobile ? t.pdfWarningMobile : t.pdfWarningDesktop,
      confirmLabel: t.confirmDownload,
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
      <header className="bg-purple-700 shadow-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">{t.title}</h1>
          </div>
          <Grid3x3 className="w-6 h-6 text-white/70 shrink-0" />
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 space-y-4 pb-8">
        <div className="bg-white rounded-2xl shadow-sm p-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500">{t.tool}</p>
            <p className="text-sm font-bold text-purple-700 truncate">{t.search}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-gray-500">{t.variants}</p>
            <p className="text-sm font-bold text-purple-700">{results.length}</p>
          </div>
          <div className="shrink-0 w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
            <Grid3x3 className="w-5 h-5" />
          </div>
        </div>

        <section className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          {/* 🆕 Переключатель языка */}
          <div>
            <label className="text-sm font-semibold text-purple-700 block mb-2">{t.language}</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleLanguageChange('ru')}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  language === 'ru'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Globe className="w-4 h-4" />
                Русский
              </button>
              <button
                onClick={() => handleLanguageChange('en')}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  language === 'en'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Globe className="w-4 h-4" />
                English
              </button>
            </div>
          </div>

          {/* 🆕 Выбор пресета */}
          <div>
            <label className="text-sm font-semibold text-purple-700 block mb-2">{t.presetLabel}</label>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full rounded-xl border border-purple-200 p-3 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="">{t.selectPreset}</option>
              {presets.map((preset) => (
                <option key={preset.name} value={preset.name}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-purple-700 block mb-2">{t.wordsLabel}</label>
            <textarea
              value={wordsInput}
              onChange={(e) => setWordsInput(e.target.value)}
              className="w-full h-32 rounded-xl border border-purple-200 p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-y"
              placeholder={t.wordsPlaceholder}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-purple-700 block mb-2">{t.gridSize}</label>
              <select
                value={config.gridSize}
                onChange={(e) => setConfig({ ...config, gridSize: Number(e.target.value) })}
                className="w-full rounded-xl border border-purple-200 p-3 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value={10}>{t.easy}</option>
                <option value={15}>{t.medium}</option>
                <option value={20}>{t.hard}</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-purple-700 block mb-2">{t.difficulty}</label>
              <select
                value={config.difficulty}
                onChange={(e) => setConfig({ ...config, difficulty: e.target.value as any })}
                className="w-full rounded-xl border border-purple-200 p-3 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="easy">{t.easyLevel}</option>
                <option value="medium">{t.mediumLevel}</option>
                <option value="hard">{t.hardLevel}</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => handleGenerate(1)}
            disabled={isGenerating}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? t.generating : t.generate}
          </button>
          
          <div className="space-y-3 pt-2 border-t border-purple-100">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-purple-700">{t.batchGeneration}</span>
              <span className="text-sm font-bold text-purple-700">{batchCount} {t.pieces}</span>
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
                {t.create}
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
            
            <p className="text-center text-[11px] text-gray-500 flex items-center justify-center gap-1 px-2 leading-relaxed">
              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
              {t.pdfWarning}
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
                <span className="text-sm font-medium text-gray-700 truncate">{t.answers}</span>
                <button
                  onClick={() => { setShowAnswers(!showAnswers); triggerHaptic('light'); }}
                  className={`relative shrink-0 w-12 h-7 rounded-full transition-colors duration-200 ${
                    showAnswers ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                  aria-label="Toggle answers"
                >
                  <span
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                      showAnswers ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-700 truncate">{t.words}</span>
                <button
                  onClick={() => { setShowWordList(!showWordList); triggerHaptic('light'); }}
                  className={`relative shrink-0 w-12 h-7 rounded-full transition-colors duration-200 ${
                    showWordList ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                  aria-label="Toggle word list"
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
                  <h3 className="font-bold text-purple-700">{t.variant} #{index + 1}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownloadImage(result, index)}
                      className="flex items-center gap-1.5 text-sm font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-2 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" /> {t.download}
                    </button>
                    <button
                      onClick={() => handleShareImage(result, index)}
                      className="flex items-center gap-1.5 text-sm font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-2 rounded-lg transition-colors"
                    >
                      <Share2 className="w-4 h-4" /> {t.share}
                    </button>
                  </div>
                </div>

                {result.failedWords.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-700">
                      {t.notPlaced} {result.failedWords.join(', ')}. {t.tryIncrease}
                    </p>
                  </div>
                )}

                <div className="p-4 bg-white rounded-xl border border-gray-100">
                  <h4 className="text-center font-bold text-lg mb-4 text-gray-800">{t.findWords}</h4>
                  
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
                      <p className="text-center font-semibold text-gray-700 mb-3">{t.wordList}</p>
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

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-lg font-bold text-purple-700 mb-3 flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            {t.faqTitle}
          </h2>
          <div className="space-y-2">
            {faqItems.map((item, index) => (
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
