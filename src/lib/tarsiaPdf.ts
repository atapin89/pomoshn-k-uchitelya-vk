// src/lib/tarsiaPdf.ts

import { jsPDF } from 'jspdf';
import type { TarsiaPuzzle, TarsiaPair, TarsiaShape } from '@/types/tarsia';
import { CARD_SIZES } from '@/types/tarsia';
import { sanitizeFileName } from '@/lib/eduGameStorage';

// ===== РАСКЛАДКА ФИГУР =====

interface TarsiaCell {
  pair: TarsiaPair;
  rotation: number;
  x: number;
  y: number;
}

function generateTriangleLayout(pairs: TarsiaPair[]): TarsiaCell[] {
  const cells: TarsiaCell[] = [];
  let index = 0;
  
  // Строим треугольник рядами
  // Каждый ряд: количество карточек = номер ряда
  let row = 1;
  let rowStart = 0;
  
  while (index < pairs.length) {
    const rowCount = Math.min(row, pairs.length - index);
    
    for (let col = 0; col < rowCount; col++) {
      cells.push({
        pair: pairs[index],
        rotation: (col * 60) % 360,
        x: col * 60 - row * 30,
        y: row * 52,
      });
      index++;
    }
    row++;
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
      const radius = ring * 55;
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
      x: col * 120,
      y: row * 60,
    });
  });
  
  return cells;
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

// ===== ЭКСПОРТ В PDF =====

export async function exportTarsiaToPDF(puzzle: TarsiaPuzzle): Promise<void> {
  const validPairs = puzzle.pairs.filter((p) => p.left.trim() && p.right.trim());
  
  if (validPairs.length === 0) {
    alert('Добавьте хотя бы одну пару «Вопрос — Ответ»');
    return;
  }
  
  const scale = CARD_SIZES.find((s) => s.id === puzzle.cardSize)?.scale || 1;
  
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    
    // Загружаем шрифт
    await loadRobotoFont(doc);
    
    // ===== СТРАНИЦА 1: РЕШЕНИЕ =====
    if (puzzle.showSolution) {
      doc.setFont('Roboto', 'normal');
      doc.setFontSize(16);
      doc.setTextColor(107, 33, 168);
      doc.text(puzzle.solutionTitle, W / 2, 20, { align: 'center' });
      
      const solutionCells = generateLayout(puzzle.shape, validPairs);
      
      solutionCells.forEach((cell) => {
        const cx = W / 2 + cell.x * scale * 0.35;
        const cy = H / 2 - 20 + cell.y * scale * 0.35;
        
        drawShapeOnPdf(doc, puzzle.shape, cx, cy, cell.rotation, scale, cell.pair);
      });
      
      doc.addPage();
    }
    
    // ===== СТРАНИЦА 2: ЗАДАНИЕ =====
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(16);
    doc.setTextColor(107, 33, 168);
    doc.text(puzzle.puzzleTitle || puzzle.title, W / 2, 20, { align: 'center' });
    
    const shuffledPairs = [...validPairs].sort(() => Math.random() - 0.5);
    const puzzleCells = generateLayout(puzzle.shape, shuffledPairs);
    
    puzzleCells.forEach((cell) => {
      const cx = W / 2 + cell.x * scale * 0.35;
      const cy = H / 2 - 20 + cell.y * scale * 0.35;
      
      drawShapeOnPdf(doc, puzzle.shape, cx, cy, cell.rotation, scale, cell.pair);
    });
    
    doc.save(sanitizeFileName(`тарсия_${puzzle.title}.pdf`));
  } catch (error) {
    console.error('Ошибка генерации PDF:', error);
    alert('Не удалось создать PDF. Попробуйте PNG.');
  }
}

function drawShapeOnPdf(
  doc: jsPDF,
  shape: TarsiaShape,
  cx: number,
  cy: number,
  rotation: number,
  scale: number,
  pair: TarsiaPair,
): void {
  const size = 20 * scale;
  
  doc.saveGraphicsState();
  doc.translate(cx, cy);
  doc.rotate(rotation);
  
  if (shape === 'triangle') {
    drawTriangleOnPdf(doc, size, pair);
  } else if (shape === 'hexagon') {
    drawHexagonOnPdf(doc, size, pair);
  } else {
    drawDominoOnPdf(doc, size, pair);
  }
  
  doc.restoreGraphicsState();
}

function drawTriangleOnPdf(doc: jsPDF, size: number, pair: TarsiaPair): void {
  const h = size * Math.sqrt(3) / 2;
  
  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(0.5);
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(31, 41, 55);
  
  // Рисуем треугольник
  doc.line(-size / 2, h / 2, size / 2, h / 2);
  doc.line(size / 2, h / 2, 0, -h / 2);
  doc.line(0, -h / 2, -size / 2, h / 2);
  
  // Текст на нижней грани
  const leftLines = doc.splitTextToSize(pair.left, size - 6);
  doc.text(leftLines, 0, h / 2 - 6, { align: 'center' });
  
  // Текст на левой грани
  const rightLines = doc.splitTextToSize(pair.right, size - 6);
  doc.text(rightLines, -size / 2 + 3, 4, { align: 'center', angle: 60 });
}

function drawHexagonOnPdf(doc: jsPDF, size: number, pair: TarsiaPair): void {
  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(0.5);
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(31, 41, 55);
  
  // Рисуем шестиугольник
  const sides = 6;
  for (let i = 0; i < sides; i++) {
    const angle1 = (i * Math.PI) / 3;
    const angle2 = ((i + 1) * Math.PI) / 3;
    
    const x1 = Math.cos(angle1) * size;
    const y1 = Math.sin(angle1) * size;
    const x2 = Math.cos(angle2) * size;
    const y2 = Math.sin(angle2) * size;
    
    doc.line(x1, y1, x2, y2);
  }
  
  // Текст
  const leftLines = doc.splitTextToSize(pair.left, size * 1.5);
  doc.text(leftLines, 0, -size + 4, { align: 'center' });
  
  const rightLines = doc.splitTextToSize(pair.right, size * 1.5);
  doc.text(rightLines, 0, size - 4, { align: 'center' });
}

function drawDominoOnPdf(doc: jsPDF, size: number, pair: TarsiaPair): void {
  const w = size * 2;
  const h = size;
  
  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(0.5);
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(31, 41, 55);
  
  // Прямоугольник
  doc.rect(-w / 2, -h / 2, w, h);
  
  // Разделитель
  doc.line(0, -h / 2, 0, h / 2);
  
  // Текст
  const leftLines = doc.splitTextToSize(pair.left, w / 2 - 6);
  doc.text(leftLines, -w / 4, 0, { align: 'center' });
  
  const rightLines = doc.splitTextToSize(pair.right, w / 2 - 6);
  doc.text(rightLines, w / 4, 0, { align: 'center' });
}

// ===== ЭКСПОРТ В PNG =====

export async function exportTarsiaToPNG(puzzle: TarsiaPuzzle): Promise<void> {
  const validPairs = puzzle.pairs.filter((p) => p.left.trim() && p.right.trim());
  
  if (validPairs.length === 0) {
    alert('Добавьте хотя бы одну пару «Вопрос — Ответ»');
    return;
  }
  
  const scale = CARD_SIZES.find((s) => s.id === puzzle.cardSize)?.scale || 1;
  
  try {
    // Вычисляем размеры канваса на основе раскладки
    const cells = generateLayout(puzzle.shape, validPairs);
    const spacing = 55 * scale;
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    cells.forEach((cell) => {
      minX = Math.min(minX, cell.x);
      maxX = Math.max(maxX, cell.x);
      minY = Math.min(minY, cell.y);
      maxY = Math.max(maxY, cell.y);
    });
    
    const width = (maxX - minX) * scale + spacing * 4;
    const height = (maxY - minY) * scale + spacing * 4;
    
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(400, Math.ceil(width));
    canvas.height = Math.max(400, Math.ceil(height));
    const ctx = canvas.getContext('2d')!;
    
    // Белый фон
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Заголовок
    ctx.fillStyle = '#6d28d9';
    ctx.font = `bold ${18 * scale}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(puzzle.puzzleTitle || puzzle.title, canvas.width / 2, 30 * scale);
    
    // Перемешиваем для задания
    const shuffledPairs = [...validPairs].sort(() => Math.random() - 0.5);
    const shuffledCells = generateLayout(puzzle.shape, shuffledPairs);
    
    const offsetX = canvas.width / 2 - ((minX + maxX) / 2) * scale;
    const offsetY = canvas.height / 2 + 20 * scale - ((minY + maxY) / 2) * scale;
    
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#1f2937';
    
    shuffledCells.forEach((cell) => {
      const cx = offsetX + cell.x * scale;
      const cy = offsetY + cell.y * scale;
      
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((cell.rotation * Math.PI) / 180);
      
      if (puzzle.shape === 'triangle') {
        drawTriangleOnCanvas(ctx, 22 * scale, cell.pair);
      } else if (puzzle.shape === 'hexagon') {
        drawHexagonOnCanvas(ctx, 22 * scale, cell.pair);
      } else {
        drawDominoOnCanvas(ctx, 22 * scale, cell.pair);
      }
      
      ctx.restore();
    });
    
    // Скачивание
    const link = document.createElement('a');
    link.download = sanitizeFileName(`тарсия_${puzzle.title}.png`);
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Ошибка генерации PNG:', error);
    alert('Не удалось создать PNG');
  }
}

function drawTriangleOnCanvas(ctx: CanvasRenderingContext2D, size: number, pair: TarsiaPair): void {
  const h = size * Math.sqrt(3) / 2;
  
  ctx.beginPath();
  ctx.moveTo(-size / 2, h / 2);
  ctx.lineTo(size / 2, h / 2);
  ctx.lineTo(0, -h / 2);
  ctx.closePath();
  ctx.stroke();
  
  ctx.fillStyle = '#1f2937';
  ctx.font = `${Math.max(7, size * 0.3)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  
  // Нижняя грань — вопрос
  wrapText(ctx, pair.left, 0, h / 2 - 8, size - 10);
  
  // Левая грань — ответ
  ctx.save();
  ctx.translate(-size / 2 + 5, 3);
  ctx.rotate(Math.PI / 3);
  wrapText(ctx, pair.right, 0, 0, size - 10);
  ctx.restore();
}

function drawHexagonOnCanvas(ctx: CanvasRenderingContext2D, size: number, pair: TarsiaPair): void {
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
  
  ctx.fillStyle = '#1f2937';
  ctx.font = `${Math.max(7, size * 0.3)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  
  wrapText(ctx, pair.left, 0, -size + 5, size * 1.5);
  wrapText(ctx, pair.right, 0, size - 5, size * 1.5);
}

function drawDominoOnCanvas(ctx: CanvasRenderingContext2D, size: number, pair: TarsiaPair): void {
  const w = size * 2;
  const h = size;
  
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  
  ctx.beginPath();
  ctx.moveTo(0, -h / 2);
  ctx.lineTo(0, h / 2);
  ctx.stroke();
  
  ctx.fillStyle = '#1f2937';
  ctx.font = `${Math.max(8, size * 0.35)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  
  wrapText(ctx, pair.left, -w / 4, 0, w / 2 - 8);
  wrapText(ctx, pair.right, w / 4, 0, w / 2 - 8);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
): void {
  const words = text.split(' ');
  let line = '';
  let lineY = y;
  const lineHeight = 10;
  
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }
  
  if (line) {
    ctx.fillText(line, x, lineY);
  }
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
    console.warn('Не удалось загрузить шрифт Roboto. Использую стандартный.');
    fontLoaded = true; // Чтобы не пытаться снова
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
