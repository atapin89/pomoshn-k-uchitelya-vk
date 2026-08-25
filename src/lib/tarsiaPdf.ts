// src/lib/tarsiaPdf.ts

import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import type { TarsiaPuzzle, TarsiaPair, TarsiaShape } from '@/types/tarsia';
import { sanitizeFileName } from '@/lib/eduGameStorage';

// ===== КОНСТАНТЫ (из config.js оригинала) =====

const TRIANGLE_SIDE = 250; // px (как в оригинале)
const TRIANGLE_HEIGHT = Math.sqrt(3) / 2 * TRIANGLE_SIDE;
const FONT_SIZE = 13;
const LINE_LENGTHS = [25, 18, 10, 5];
const MAX_LINES = 3;
const PADDING_Y = 8;
const Y_HEIGHT_STEP = FONT_SIZE * 1.1;

// ===== ШРИФТ =====

let fontLoaded = false;
const FONT_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf';

async function loadRobotoFont(doc: jsPDF): Promise<void> {
  if (fontLoaded) return;
  try {
    const response = await fetch(FONT_URL);
    const arrayBuffer = await response.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);
    doc.addFileToVFS('Roboto-Regular.ttf', base64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    fontLoaded = true;
  } catch {
    fontLoaded = true;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

// ===== РАЗБИЕНИЕ ТЕКСТА НА СТРОКИ (из grid.js оригинала) =====

function smartSplitByNChars(text: string, n: number): [string, string] {
  if (text.length > n) {
    try {
      const r = new RegExp('(^|\\s).{0,' + (n + 1) + '}$');
      const matchedString = text.match(r)![0].trim();
      const remainingString = text.replace(r, '');
      return [remainingString, matchedString];
    } catch {
      const matchedString = text.substring(text.length - n);
      const remainingString = text.substring(0, text.length - n) + '-';
      return [remainingString, matchedString];
    }
  }
  return ['', text];
}

function splitUpText(text: string): string[] {
  if (!text) return [''];
  let textArray: string[] = [text];
  
  if (text.length > LINE_LENGTHS[0]) {
    for (let i = 0; i < MAX_LINES; i++) {
      const lineLength = LINE_LENGTHS[Math.min(i, LINE_LENGTHS.length - 1)];
      const textToSplit = textArray.shift()!;
      
      if (textToSplit.length <= lineLength) {
        textArray = [textToSplit, ...textArray];
        return textArray;
      } else {
        const [remaining, matched] = smartSplitByNChars(textToSplit, lineLength);
        textArray = [matched, remaining, ...textArray];
      }
    }
  }
  
  return textArray;
}

// ===== СОЗДАНИЕ ОДНОГО БОЛЬШОГО SVG (как TarsiaGrid) =====

function createTarsiaSVG(
  grid: { row: number; col: number; values: [string | null, string | null, string | null] }[],
): SVGSVGElement {
  const side = TRIANGLE_SIDE;
  const height = TRIANGLE_HEIGHT;
  
  // Вычисляем размеры всего SVG
  const rows = grid.map(g => g.row);
  const cols = grid.map(g => g.col);
  const minRow = Math.min(...rows);
  const minCol = Math.min(...cols);
  const totalWidth = (Math.max(...cols) - minCol + 1) * side / 2 + side / 2;
  const totalHeight = (Math.max(...rows) - minRow + 1) * height;
  
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('width', String(totalWidth));
  svg.setAttribute('height', String(totalHeight));
  svg.setAttribute('viewBox', `${(minCol - 1) * side / 2} 0 ${totalWidth} ${totalHeight}`);
  
  // Добавляем каждый треугольник в SVG
  grid.forEach((cell) => {
    const triangleGroup = createTriangleGroup(cell.row, cell.col, cell.values);
    svg.appendChild(triangleGroup);
  });
  
  return svg;
}

function createTriangleGroup(
  row: number,
  col: number,
  values: [string | null, string | null, string | null],
): SVGGElement {
  const side = TRIANGLE_SIDE;
  const height = TRIANGLE_HEIGHT;
  
  const orientation = (col + row) % 2 === 0 ? 'down' : 'up';
  const rotate = orientation === 'up' ? 180 : 0;
  const translateX = (col - 1) * side / 2;
  const translateY = (row - 1) * height;
  
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('transform', `translate(${translateX},${translateY}) rotate(${rotate} ${side/2},${height/2})`);
  
  // Полигон
  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  polygon.setAttribute('points', `0,0 ${side},0 ${side/2},${height}`);
  polygon.setAttribute('fill', '#F5F3FF');
  polygon.setAttribute('stroke', '#7C3AED');
  polygon.setAttribute('stroke-width', '2');
  group.appendChild(polygon);
  
  // Три грани — тексты с поворотом (как в Triangle/index.jsx)
  const textConfigs = [
    { transform: `rotate(180 ${side/2},0)`, value: values[0], fill: '#1F2937' },
    { transform: `rotate(60 0,0)`, value: values[1], fill: '#4C1D95' },
    { transform: `rotate(300 ${side},0)`, value: values[2], fill: '#4C1D95' },
  ];
  
  textConfigs.forEach((config) => {
    if (!config.value) return;
    
    const textGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    textGroup.setAttribute('transform', config.transform);
    group.appendChild(textGroup);
    
    // Разбиваем на строки
    const lines = splitUpText(config.value).reverse();
    
    lines.forEach((line, index) => {
      const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textEl.setAttribute('x', String(side / 2));
      textEl.setAttribute('y', String(-PADDING_Y - index * Y_HEIGHT_STEP));
      textEl.setAttribute('text-anchor', 'middle');
      textEl.setAttribute('font-size', String(FONT_SIZE));
      textEl.setAttribute('fill', config.fill);
      textEl.setAttribute('font-family', 'Roboto, Arial, sans-serif');
      textEl.textContent = line;
      textGroup.appendChild(textEl);
    });
  });
  
  return group;
}

// ===== ПОСТРОЕНИЕ СЕТКИ =====

function buildGrid(pairs: TarsiaPair[]): { row: number; col: number; values: [string | null, string | null, string | null] }[] {
  const grid: { row: number; col: number; values: [string | null, string | null, string | null] }[] = [];
  
  pairs.forEach((pair, i) => {
    const prevPair = pairs[(i - 1 + pairs.length) % pairs.length];
    grid.push({
      row: Math.floor(i / 4) + 1,
      col: (i % 4) * 2 + 1,
      values: [
        pair.left || null,
        prevPair.right || null,
        pair.right || null,
      ],
    });
  });
  
  return grid;
}

// ===== ЭКСПОРТ В PDF =====

export async function exportTarsiaToPDF(puzzle: TarsiaPuzzle): Promise<void> {
  const validPairs = puzzle.pairs.filter((p) => p.left.trim() && p.right.trim());
  
  if (validPairs.length === 0) {
    alert('Добавьте хотя бы одну пару «Вопрос — Ответ»');
    return;
  }
  
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });
    
    await loadRobotoFont(doc);
    
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    
    // ===== СТРАНИЦА 1: РЕШЕНИЕ =====
    if (puzzle.showSolution) {
      doc.setFont('Roboto', 'normal');
      doc.setFontSize(14);
      doc.setTextColor(107, 33, 168);
      doc.text(puzzle.solutionTitle, W / 2, 10, { align: 'center' });
      
      // Создаём ОДИН большой SVG со всеми треугольниками
      const grid = buildGrid(validPairs);
      const svg = createTarsiaSVG(grid);
      
      // Рендерим весь SVG на страницу
      await svg2pdf(svg, doc, {
        x: 7,
        y: 15,
        width: W - 14,
        height: H - 25,
      });
      
      doc.addPage();
    }
    
    // ===== СТРАНИЦА 2: ЗАДАНИЕ =====
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(107, 33, 168);
    doc.text(puzzle.puzzleTitle || puzzle.title, W / 2, 10, { align: 'center' });
    
    const shuffledPairs = [...validPairs].sort(() => Math.random() - 0.5);
    const shuffledGrid = buildGrid(shuffledPairs);
    const shuffledSvg = createTarsiaSVG(shuffledGrid);
    
    await svg2pdf(shuffledSvg, doc, {
      x: 7,
      y: 15,
      width: W - 14,
      height: H - 25,
    });
    
    doc.save(sanitizeFileName(`тарсия_${puzzle.title}.pdf`));
  } catch (error) {
    console.error('Ошибка генерации PDF:', error);
    alert('Не удалось создать PDF: ' + (error instanceof Error ? error.message : 'неизвестная ошибка'));
  }
}
