// src/lib/tarsiaPdf.ts

import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import type { TarsiaPuzzle, TarsiaPair, TarsiaShape } from '@/types/tarsia';
import { sanitizeFileName } from '@/lib/eduGameStorage';

// ===== КОНСТАНТЫ (как в оригинальном проекте) =====

const TRIANGLE_SIDE = 50;
const TRIANGLE_HEIGHT = TRIANGLE_SIDE * Math.sqrt(3) / 2;
const PRINT_GRID = [
  { row: 1, col: 2 }, { row: 1, col: 3 }, { row: 1, col: 4 }, { row: 1, col: 5 },
  { row: 2, col: 2 }, { row: 2, col: 3 }, { row: 2, col: 4 }, { row: 2, col: 5 },
];

// ===== ЗАГРУЗКА ШРИФТА =====

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

// ===== ГЕНЕРАЦИЯ SVG (по механике оригинала) =====

function createTriangleSVG(
  row: number,
  col: number,
  values: [string | null, string | null, string | null],
): SVGSVGElement {
  const side = TRIANGLE_SIDE;
  const height = TRIANGLE_HEIGHT;
  
  // Ориентация: чётная сумма = вершина вниз, нечётная = вершина вверх
  const orientation = (col + row) % 2 === 0 ? 'down' : 'up';
  const rotate = orientation === 'up' ? 180 : 0;
  const translateX = (col - 1) * side / 2;
  const translateY = (row - 1) * height;
  
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('width', String(side));
  svg.setAttribute('height', String(height));
  svg.setAttribute('viewBox', `0 0 ${side} ${height}`);
  
  // Группа с трансформацией
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('transform', `translate(${translateX},${translateY}) rotate(${rotate} ${side/2},${height/2})`);
  svg.appendChild(group);
  
  // Полигон (треугольник)
  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  polygon.setAttribute('points', `0,0 ${side},0 ${side/2},${height}`);
  polygon.setAttribute('fill', '#F5F3FF');
  polygon.setAttribute('stroke', '#7C3AED');
  polygon.setAttribute('stroke-width', '1.5');
  group.appendChild(polygon);
  
  // Три грани — три текста
  const texts = [
    { transform: `rotate(180 ${side/2},0)`, value: values[0] },  // нижняя грань
    { transform: `rotate(60 0,0)`, value: values[1] },            // левая грань
    { transform: `rotate(300 ${side},0)`, value: values[2] },     // правая грань
  ];
  
  texts.forEach((item, i) => {
    if (!item.value) return;
    
    const textGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    textGroup.setAttribute('transform', item.transform);
    group.appendChild(textGroup);
    
    // Строки (если текст длинный — перенос)
    const lines = splitTextIntoLines(item.value, 10);
    
    lines.reverse().forEach((line, lineIndex) => {
      const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textEl.setAttribute('x', String(side / 2));
      textEl.setAttribute('y', String(-3 - lineIndex * 5));
      textEl.setAttribute('text-anchor', 'middle');
      textEl.setAttribute('font-size', '7');
      textEl.setAttribute('fill', i === 0 ? '#1F2937' : '#4C1D95');
      textEl.setAttribute('font-family', 'Roboto, Arial, sans-serif');
      textEl.textContent = line;
      textGroup.appendChild(textEl);
    });
  });
  
  return svg;
}

function splitTextIntoLines(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= maxChars) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  
  return lines;
}

// ===== ПОСТРОЕНИЕ РАСКЛАДКИ =====

interface GridCell {
  row: number;
  col: number;
  values: [string | null, string | null, string | null];
}

function buildTriangleGrid(pairs: TarsiaPair[]): GridCell[] {
  const n = pairs.length;
  const cells: GridCell[] = [];
  
  // Каждая карточка: [вопрос, ответ_соседа_слева, ответ_соседа_справа]
  pairs.forEach((pair, i) => {
    const prevPair = pairs[(i - 1 + n) % n];
    cells.push({
      row: Math.floor(i / 4) + 1,
      col: (i % 4) * 2 + 1,
      values: [
        pair.left,        // нижняя грань — вопрос
        prevPair.right,   // левая грань — ответ предыдущего
        pair.right,       // правая грань — ответ текущего
      ],
    });
  });
  
  return cells;
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
      
      const grid = buildTriangleGrid(validPairs);
      await drawGridOnPdf(doc, grid, 15, 20);
      
      doc.addPage();
    }
    
    // ===== СТРАНИЦА 2: ЗАДАНИЕ (перемешанные) =====
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(107, 33, 168);
    doc.text(puzzle.puzzleTitle || puzzle.title, W / 2, 10, { align: 'center' });
    
    const shuffledPairs = [...validPairs].sort(() => Math.random() - 0.5);
    const shuffledGrid = buildTriangleGrid(shuffledPairs);
    await drawGridOnPdf(doc, shuffledGrid, 15, 20);
    
    doc.save(sanitizeFileName(`тарсия_${puzzle.title}.pdf`));
  } catch (error) {
    console.error('Ошибка генерации PDF:', error);
    alert('Не удалось создать PDF: ' + (error instanceof Error ? error.message : 'неизвестная ошибка'));
  }
}

// ===== ОТРИСОВКА СЕТКИ НА PDF =====

async function drawGridOnPdf(
  doc: jsPDF,
  grid: GridCell[],
  startX: number,
  startY: number,
): Promise<void> {
  const perRow = 4;
  
  for (let i = 0; i < grid.length; i++) {
    const cell = grid[i];
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    
    const svg = createTriangleSVG(cell.row, cell.col, cell.values);
    
    const x = startX + col * (TRIANGLE_SIDE + 5);
    const y = startY + row * (TRIANGLE_HEIGHT + 10);
    
    await svg2pdf(svg, doc, {
      x,
      y,
      width: TRIANGLE_SIDE,
      height: TRIANGLE_HEIGHT,
    });
  }
}
