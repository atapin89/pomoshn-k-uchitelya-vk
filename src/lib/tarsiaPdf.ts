// src/lib/tarsiaPdf.ts

import { jsPDF } from 'jspdf';
import type { TarsiaPuzzle, TarsiaPair, TarsiaShape } from '@/types/tarsia';
import { CARD_SIZES } from '@/types/tarsia';
import { sanitizeFileName } from '@/lib/eduGameStorage';

// ===== ГЕНЕРАЦИЯ РАСПОЛОЖЕНИЯ ФИГУР =====

interface TarsiaCell {
  pair: TarsiaPair;
  rotation: number; // 0, 60, 120, 180, 240, 300 градусов
  x: number;
  y: number;
}

function generateTriangleLayout(pairs: TarsiaPair[]): TarsiaCell[] {
  const cells: TarsiaCell[] = [];
  const side = Math.ceil(Math.sqrt(pairs.length));
  
  let index = 0;
  for (let row = 0; row < side && index < pairs.length; row++) {
    for (let col = 0; col <= row && index < pairs.length; col++) {
      cells.push({
        pair: pairs[index],
        rotation: (index * 60) % 360,
        x: col * 30 - row * 15,
        y: row * 26,
      });
      index++;
    }
  }
  
  return cells;
}

function generateHexagonLayout(pairs: TarsiaPair[]): TarsiaCell[] {
  const cells: TarsiaCell[] = [];
  const perRing = [1, 6, 12, 18, 24, 30];
  
  let index = 0;
  let ring = 0;
  
  while (index < pairs.length && ring < perRing.length) {
    const count = Math.min(perRing[ring], pairs.length - index);
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI;
      const radius = ring * 35;
      cells.push({
        pair: pairs[index],
        rotation: (i * 60) % 360,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
      index++;
    }
    ring++;
  }
  
  return cells;
}

function generateDominoLayout(pairs: TarsiaPair[]): TarsiaCell[] {
  const cells: TarsiaCell[] = [];
  const perRow = 4;
  
  pairs.forEach((pair, index) => {
    const row = Math.floor(index / perRow);
    const col = index % perRow;
    cells.push({
      pair,
      rotation: 0,
      x: col * 70,
      y: row * 35,
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
  
  const scale = CARD_SIZES.find((s) => s.id === puzzle.cardSize)?.scale || 1;
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  
  // Загружаем шрифт с поддержкой кириллицы
  await loadRobotoFont(doc);
  doc.setFont('Roboto', 'normal');
  
  // ===== СТРАНИЦА 1: РЕШЕНИЕ (если включено) =====
  if (puzzle.showSolution) {
    doc.setFontSize(16);
    doc.setTextColor(107, 33, 168);
    doc.text(puzzle.solutionTitle, W / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    
    const solutionCells = generateLayout(puzzle.shape, validPairs);
    
    solutionCells.forEach((cell) => {
      const cx = W / 2 + cell.x * scale;
      const cy = H / 2 + cell.y * scale;
      
      drawShape(doc, puzzle.shape, cx, cy, cell.rotation, scale, cell.pair);
    });
    
    if (puzzle.showSolution) {
      doc.addPage();
    }
  }
  
  // ===== СТРАНИЦА 2 (или 1): ЗАДАНИЕ (перемешанное) =====
  doc.setFontSize(16);
  doc.setTextColor(107, 33, 168);
  doc.text(puzzle.puzzleTitle || puzzle.title, W / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(31, 41, 55);
  
  // Перемешиваем
  const shuffledPairs = [...validPairs].sort(() => Math.random() - 0.5);
  const puzzleCells = generateLayout(puzzle.shape, shuffledPairs);
  
  puzzleCells.forEach((cell) => {
    const cx = W / 2 + cell.x * scale;
    const cy = H / 2 + cell.y * scale;
    
    drawShape(doc, puzzle.shape, cx, cy, cell.rotation, scale, cell.pair);
  });
  
  doc.save(sanitizeFileName(`тарсия_${puzzle.title}.pdf`));
}

function generateLayout(shape: TarsiaShape, pairs: TarsiaPair[]): TarsiaCell[] {
  switch (shape) {
    case 'triangle':
      return generateTriangleLayout(pairs);
    case 'hexagon':
      return generateHexagonLayout(pairs);
    case 'domino':
      return generateDominoLayout(pairs);
  }
}

function drawShape(
  doc: jsPDF,
  shape: TarsiaShape,
  cx: number,
  cy: number,
  rotation: number,
  scale: number,
  pair: TarsiaPair,
): void {
  const size = 25 * scale;
  
  doc.saveGraphicsState();
  doc.translate(cx, cy);
  doc.rotate(rotation);
  
  if (shape === 'triangle') {
    drawTriangle(doc, size);
    drawTriangleText(doc, size, pair);
  } else if (shape === 'hexagon') {
    drawHexagon(doc, size);
    drawHexagonText(doc, size, pair);
  } else {
    drawDomino(doc, size, pair);
  }
  
  doc.restoreGraphicsState();
}

function drawTriangle(doc: jsPDF, size: number): void {
  const h = size * Math.sqrt(3) / 2;
  
  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(1.5);
  doc.line(-size / 2, h / 2, size / 2, h / 2);
  doc.line(size / 2, h / 2, 0, -h / 2);
  doc.line(0, -h / 2, -size / 2, h / 2);
}

function drawTriangleText(doc: jsPDF, size: number, pair: TarsiaPair): void {
  const h = size * Math.sqrt(3) / 2;
  
  // Текст на гранях
  doc.setFontSize(7);
  doc.setTextColor(31, 41, 55);
  
  // Нижняя грань
  doc.text(pair.left, 0, h / 2 - 5, { align: 'center', maxWidth: size - 8 });
  
  // Левая грань
  doc.text(pair.right, -size / 2 + 5, 2, { align: 'center', maxWidth: 18, angle: 60 });
  
  // Правая грань
  doc.text(pair.right, size / 2 - 5, 2, { align: 'center', maxWidth: 18, angle: -60 });
}

function drawHexagon(doc: jsPDF, size: number): void {
  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(1.5);
  
  const sides = 6;
  const angleStep = (2 * Math.PI) / sides;
  
  for (let i = 0; i < sides; i++) {
    const angle1 = i * angleStep;
    const angle2 = (i + 1) * angleStep;
    
    const x1 = Math.cos(angle1) * size;
    const y1 = Math.sin(angle1) * size;
    const x2 = Math.cos(angle2) * size;
    const y2 = Math.sin(angle2) * size;
    
    doc.line(x1, y1, x2, y2);
  }
}

function drawHexagonText(doc: jsPDF, size: number, pair: TarsiaPair): void {
  doc.setFontSize(7);
  doc.setTextColor(31, 41, 55);
  
  // Верхняя грань
  doc.text(pair.left, 0, -size + 4, { align: 'center', maxWidth: size * 1.5 });
  
  // Нижняя грань
  doc.text(pair.right, 0, size - 4, { align: 'center', maxWidth: size * 1.5 });
}

function drawDomino(doc: jsPDF, size: number, pair: TarsiaPair): void {
  const w = size * 2.5;
  const h = size;
  
  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(1.5);
  doc.rect(-w / 2, -h / 2, w, h);
  
  // Разделитель
  doc.line(0, -h / 2, 0, h / 2);
  
  doc.setFontSize(8);
  doc.setTextColor(31, 41, 55);
  
  // Левая часть
  doc.text(pair.left, -w / 4, 0, { align: 'center', maxWidth: w / 2 - 6 });
  
  // Правая часть
  doc.text(pair.right, w / 4, 0, { align: 'center', maxWidth: w / 2 - 6 });
}

// ===== ЭКСПОРТ В PNG =====

export async function exportTarsiaToPNG(puzzle: TarsiaPuzzle): Promise<void> {
  const validPairs = puzzle.pairs.filter((p) => p.left.trim() && p.right.trim());
  
  if (validPairs.length === 0) {
    alert('Добавьте хотя бы одну пару «Вопрос — Ответ»');
    return;
  }
  
  const scale = CARD_SIZES.find((s) => s.id === puzzle.cardSize)?.scale || 1;
  const canvas = document.createElement('canvas');
  const size = 800 * scale;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  
  // Белый фон
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  
  // Заголовок
  ctx.fillStyle = '#6d28d9';
  ctx.font = `bold ${24 * scale}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(puzzle.puzzleTitle || puzzle.title, size / 2, 40 * scale);
  
  // Перемешиваем
  const shuffledPairs = [...validPairs].sort(() => Math.random() - 0.5);
  const cells = generateLayout(puzzle.shape, shuffledPairs);
  
  ctx.strokeStyle = '#7c3aed';
  ctx.lineWidth = 1.5;
  ctx.fillStyle = '#1f2937';
  
  cells.forEach((cell) => {
    const cx = size / 2 + cell.x * scale;
    const cy = size / 2 + cell.y * scale;
    
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((cell.rotation * Math.PI) / 180);
    
    if (puzzle.shape === 'triangle') {
      drawTriangleCanvas(ctx, 25 * scale, cell.pair);
    } else if (puzzle.shape === 'hexagon') {
      drawHexagonCanvas(ctx, 25 * scale, cell.pair);
    } else {
      drawDominoCanvas(ctx, 25 * scale, cell.pair);
    }
    
    ctx.restore();
  });
  
  // Скачивание
  const link = document.createElement('a');
  link.download = sanitizeFileName(`тарсия_${puzzle.title}.png`);
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function drawTriangleCanvas(ctx: CanvasRenderingContext2D, size: number, pair: TarsiaPair): void {
  const h = size * Math.sqrt(3) / 2;
  
  ctx.beginPath();
  ctx.moveTo(-size / 2, h / 2);
  ctx.lineTo(size / 2, h / 2);
  ctx.lineTo(0, -h / 2);
  ctx.closePath();
  ctx.stroke();
  
  ctx.font = `${7}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(pair.left, 0, h / 2 - 5);
  
  ctx.save();
  ctx.translate(-size / 2 + 5, 2);
  ctx.rotate(Math.PI / 3);
  ctx.fillText(pair.right, 0, 0);
  ctx.restore();
  
  ctx.save();
  ctx.translate(size / 2 - 5, 2);
  ctx.rotate(-Math.PI / 3);
  ctx.fillText(pair.right, 0, 0);
  ctx.restore();
}

function drawHexagonCanvas(ctx: CanvasRenderingContext2D, size: number, pair: TarsiaPair): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const x = Math.cos(angle) * size;
    const y = Math.sin(angle) * size;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  
  ctx.font = `${7}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(pair.left, 0, -size + 4);
  ctx.fillText(pair.right, 0, size - 4);
}

function drawDominoCanvas(ctx: CanvasRenderingContext2D, size: number, pair: TarsiaPair): void {
  const w = size * 2.5;
  const h = size;
  
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.beginPath();
  ctx.moveTo(0, -h / 2);
  ctx.lineTo(0, h / 2);
  ctx.stroke();
  
  ctx.font = `${8}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(pair.left, -w / 4, 0);
  ctx.fillText(pair.right, w / 4, 0);
}

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
    console.warn('Не удалось загрузить шрифт Roboto. Кириллица может не отображаться.');
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
