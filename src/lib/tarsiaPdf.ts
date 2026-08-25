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
  let row = 1;
  
  while (index < pairs.length) {
    const rowCount = Math.min(row, pairs.length - index);
    
    for (let col = 0; col < rowCount; col++) {
      cells.push({
        pair: pairs[index],
        rotation: (col * 60) % 360,
        x: col * 70 - row * 35,
        y: row * 55,
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
      const radius = ring * 60;
      cells.push({
        pair: pairs[index],
        rotation: 0,
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
  const perRow = 3;
  
  pairs.forEach((pair, index) => {
    const row = Math.floor(index / perRow);
    const col = index % perRow;
    cells.push({
      pair,
      rotation: 0,
      x: col * 85 - (perRow - 1) * 42.5,
      y: row * 45,
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

// ===== ЭКСПОРТ В PDF (одна фигура на страницу) =====

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
    const centerX = W / 2;
    const centerY = H / 2;
    
    // ===== ПЕРЕМЕШИВАЕМ ПАРЫ ДЛЯ ЗАДАНИЯ =====
    const shuffledPairs = [...validPairs].sort(() => Math.random() - 0.5);
    
    let firstPage = true;
    
    // ===== СТРАНИЦЫ С РЕШЕНИЕМ (если включено) =====
    if (puzzle.showSolution) {
      validPairs.forEach((pair, index) => {
        if (!firstPage) doc.addPage();
        firstPage = false;
        
        // Заголовок
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(107, 33, 168);
        doc.text(
          `${puzzle.solutionTitle} — карточка ${index + 1} из ${validPairs.length}`,
          centerX,
          20,
          { align: 'center' },
        );
        
        // Одна фигура по центру
        const shapeSize = 55 * scale;
        drawShapeOnPdf(doc, puzzle.shape, centerX, centerY, shapeSize, pair);
        
        // Подпись
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(156, 163, 175);
        doc.text(
          'Вырежьте по контуру',
          centerX,
          H - 15,
          { align: 'center' },
        );
      });
    }
    
    // ===== СТРАНИЦЫ С ЗАДАНИЕМ =====
    shuffledPairs.forEach((pair, index) => {
      if (!firstPage) doc.addPage();
      firstPage = false;
      
      // Заголовок
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(107, 33, 168);
      doc.text(
        `${puzzle.puzzleTitle || puzzle.title} — карточка ${index + 1} из ${shuffledPairs.length}`,
        centerX,
        20,
        { align: 'center' },
      );
      
      // Одна фигура по центру
      const shapeSize = 55 * scale;
      drawShapeOnPdf(doc, puzzle.shape, centerX, centerY, shapeSize, pair);
      
      // Подпись
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(156, 163, 175);
      doc.text(
        'Вырежьте по контуру',
        centerX,
        H - 15,
        { align: 'center' },
      );
    });
    
    doc.save(sanitizeFileName(`тарсия_${puzzle.title}.pdf`));
  } catch (error) {
    console.error('Ошибка генерации PDF:', error);
    alert('Не удалось создать PDF: ' + (error instanceof Error ? error.message : 'неизвестная ошибка'));
  }
}

function drawShapeOnPdf(
  doc: jsPDF,
  shape: TarsiaShape,
  cx: number,
  cy: number,
  size: number,
  pair: TarsiaPair,
): void {
  if (shape === 'triangle') {
    drawTriangleOnPdf(doc, cx, cy, size, pair);
  } else if (shape === 'hexagon') {
    drawHexagonOnPdf(doc, cx, cy, size, pair);
  } else {
    drawDominoOnPdf(doc, cx, cy, size, pair);
  }
}

function drawTriangleOnPdf(doc: jsPDF, cx: number, cy: number, size: number, pair: TarsiaPair): void {
  const h = size * Math.sqrt(3) / 2;
  const halfW = size / 2;
  
  // Вершины треугольника
  const topX = cx;
  const topY = cy - h / 2;
  const leftX = cx - halfW;
  const leftY = cy + h / 2;
  const rightX = cx + halfW;
  const rightY = cy + h / 2;
  
  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(0.8);
  
  // Стороны
  doc.line(leftX, leftY, rightX, rightY);
  doc.line(rightX, rightY, topX, topY);
  doc.line(topX, topY, leftX, leftY);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(31, 41, 55);
  
  // Вопрос на нижней грани
  const leftLines = doc.splitTextToSize(pair.left, size - 10);
  doc.text(leftLines, cx, cy + h / 2 - 8, { align: 'center' });
  
  // Ответ на верхней грани
  doc.setTextColor(76, 29, 149);
  const rightLines = doc.splitTextToSize(pair.right, size - 10);
  doc.text(rightLines, cx, cy - h / 2 + 10, { align: 'center' });
}

function drawHexagonOnPdf(doc: jsPDF, cx: number, cy: number, size: number, pair: TarsiaPair): void {
  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(0.8);
  
  const sides = 6;
  const points: [number, number][] = [];
  
  for (let i = 0; i < sides; i++) {
    const angle = (i * Math.PI) / 3;
    points.push([
      cx + Math.cos(angle) * size,
      cy + Math.sin(angle) * size,
    ]);
  }
  
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides;
    doc.line(points[i][0], points[i][1], points[next][0], points[next][1]);
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(31, 41, 55);
  
  // Вопрос сверху
  const leftLines = doc.splitTextToSize(pair.left, size * 1.3);
  doc.text(leftLines, cx, cy - size + 8, { align: 'center' });
  
  // Ответ снизу
  doc.setTextColor(76, 29, 149);
  const rightLines = doc.splitTextToSize(pair.right, size * 1.3);
  doc.text(rightLines, cx, cy + size - 8, { align: 'center' });
}

function drawDominoOnPdf(doc: jsPDF, cx: number, cy: number, size: number, pair: TarsiaPair): void {
  const w = size * 1.8;
  const h = size;
  const left = cx - w / 2;
  const top = cy - h / 2;
  
  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(0.8);
  
  // Прямоугольник
  doc.rect(left, top, w, h);
  
  // Разделитель
  doc.line(cx, top, cx, top + h);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(31, 41, 55);
  
  // Вопрос слева
  const leftLines = doc.splitTextToSize(pair.left, w / 2 - 8);
  doc.text(leftLines, cx - w / 4, cy, { align: 'center' });
  
  // Ответ справа
  doc.setTextColor(76, 29, 149);
  const rightLines = doc.splitTextToSize(pair.right, w / 2 - 8);
  doc.text(rightLines, cx + w / 4, cy, { align: 'center' });
}

// ===== ЭКСПОРТ В PNG (высокое качество, все фигуры на одном листе) =====

export async function exportTarsiaToPNG(puzzle: TarsiaPuzzle): Promise<void> {
  const validPairs = puzzle.pairs.filter((p) => p.left.trim() && p.right.trim());
  
  if (validPairs.length === 0) {
    alert('Добавьте хотя бы одну пару «Вопрос — Ответ»');
    return;
  }
  
  const scale = CARD_SIZES.find((s) => s.id === puzzle.cardSize)?.scale || 1;
  
  try {
    const cells = generateLayout(puzzle.shape, validPairs);
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    cells.forEach((cell) => {
      minX = Math.min(minX, cell.x);
      maxX = Math.max(maxX, cell.x);
      minY = Math.min(minY, cell.y);
      maxY = Math.max(maxY, cell.y);
    });
    
    const RESOLUTION = 2;
    const spacing = 80 * scale * RESOLUTION;
    
    const width = Math.ceil((maxX - minX) * scale * RESOLUTION + spacing * 4);
    const height = Math.ceil((maxY - minY) * scale * RESOLUTION + spacing * 4);
    
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(800, width);
    canvas.height = Math.max(800, height);
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#6d28d9';
    ctx.font = `bold ${36 * scale}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(
      puzzle.puzzleTitle || puzzle.title,
      canvas.width / 2,
      30 * scale,
    );
    
    const shuffledPairs = [...validPairs].sort(() => Math.random() - 0.5);
    const shuffledCells = generateLayout(puzzle.shape, shuffledPairs);
    
    const offsetX = canvas.width / 2 - ((minX + maxX) / 2) * scale * RESOLUTION;
    const offsetY = canvas.height / 2 + 50 * scale - ((minY + maxY) / 2) * scale * RESOLUTION;
    
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 3;
    ctx.fillStyle = '#1f2937';
    ctx.textBaseline = 'middle';
    
    shuffledCells.forEach((cell) => {
      const cx = offsetX + cell.x * scale * RESOLUTION;
      const cy = offsetY + cell.y * scale * RESOLUTION;
      
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((cell.rotation * Math.PI) / 180);
      
      const shapeSize = 40 * scale * RESOLUTION;
      
      if (puzzle.shape === 'triangle') {
        drawTriangleOnCanvas(ctx, shapeSize, cell.pair);
      } else if (puzzle.shape === 'hexagon') {
        drawHexagonOnCanvas(ctx, shapeSize, cell.pair);
      } else {
        drawDominoOnCanvas(ctx, shapeSize, cell.pair);
      }
      
      ctx.restore();
    });
    
    const link = document.createElement('a');
    link.download = sanitizeFileName(`тарсия_${puzzle.title}.png`);
    link.href = canvas.toDataURL('image/png', 1.0);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Ошибка генерации PNG:', error);
    alert('Не удалось создать PNG: ' + (error instanceof Error ? error.message : 'неизвестная ошибка'));
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
  ctx.font = `bold ${Math.max(12, size * 0.25)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  wrapText(ctx, pair.left, 0, h / 2 - size * 0.18, size - size * 0.25);
  
  ctx.fillStyle = '#4c1d95';
  wrapText(ctx, pair.right, 0, -h / 2 + size * 0.18, size - size * 0.25);
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
  ctx.font = `bold ${Math.max(12, size * 0.25)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  wrapText(ctx, pair.left, 0, -size + size * 0.2, size * 1.2);
  
  ctx.fillStyle = '#4c1d95';
  wrapText(ctx, pair.right, 0, size - size * 0.2, size * 1.2);
}

function drawDominoOnCanvas(ctx: CanvasRenderingContext2D, size: number, pair: TarsiaPair): void {
  const w = size * 1.8;
  const h = size;
  
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  
  ctx.beginPath();
  ctx.moveTo(0, -h / 2);
  ctx.lineTo(0, h / 2);
  ctx.stroke();
  
  ctx.fillStyle = '#1f2937';
  ctx.font = `bold ${Math.max(12, size * 0.28)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  wrapText(ctx, pair.left, -w / 4, 0, w / 2 - size * 0.25);
  
  ctx.fillStyle = '#4c1d95';
  wrapText(ctx, pair.right, w / 4, 0, w / 2 - size * 0.25);
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
  const lineHeight = 18;
  
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
