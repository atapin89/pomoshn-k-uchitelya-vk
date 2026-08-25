// src/lib/tarsiaPdf.ts

import { jsPDF } from 'jspdf';
import type { TarsiaPuzzle, TarsiaPair, TarsiaShape } from '@/types/tarsia';
import { CARD_SIZES } from '@/types/tarsia';
import { sanitizeFileName } from '@/lib/eduGameStorage';

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
    
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    
    // ===== СТРАНИЦА 1: РЕШЕНИЕ =====
    if (puzzle.showSolution) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(107, 33, 168);
      doc.text(puzzle.solutionTitle, W / 2, 12, { align: 'center' });
      
      drawAllCards(doc, puzzle.shape, validPairs, false);
      
      doc.addPage();
    }
    
    // ===== СТРАНИЦА 2: ЗАДАНИЕ =====
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(107, 33, 168);
    doc.text(puzzle.puzzleTitle || puzzle.title, W / 2, 12, { align: 'center' });
    
    const shuffledPairs = [...validPairs].sort(() => Math.random() - 0.5);
    drawAllCards(doc, puzzle.shape, shuffledPairs, true);
    
    doc.save(sanitizeFileName(`тарсия_${puzzle.title}.pdf`));
  } catch (error) {
    console.error('Ошибка генерации PDF:', error);
    alert('Не удалось создать PDF: ' + (error instanceof Error ? error.message : 'неизвестная ошибка'));
  }
}

// ===== ОТРИСОВКА ВСЕХ КАРТОЧЕК =====

function drawAllCards(
  doc: jsPDF,
  shape: TarsiaShape,
  pairs: TarsiaPair[],
  isShuffled: boolean,
): void {
  if (shape === 'triangle') {
    drawTriangleLayout(doc, pairs, isShuffled);
  } else if (shape === 'hexagon') {
    drawHexagonLayout(doc, pairs, isShuffled);
  } else {
    drawDominoLayout(doc, pairs, isShuffled);
  }
}

// ===== ТРЕУГОЛЬНАЯ РАСКЛАДКА =====

function drawTriangleLayout(doc: jsPDF, pairs: TarsiaPair[], isShuffled: boolean): void {
  const cardSize = 45; // размер стороны
  const rowHeight = cardSize * Math.sqrt(3) / 2;
  const colWidth = cardSize;
  
  let index = 0;
  let row = 1;
  
  while (index < pairs.length) {
    const rowCount = row;
    const rowTotalWidth = rowCount * colWidth;
    const startX = 297 / 2 - rowTotalWidth / 2; // центр страницы
    
    for (let col = 0; col < rowCount && index < pairs.length; col++) {
      const pair = pairs[index];
      const cx = startX + col * colWidth + colWidth / 2;
      const cy = 20 + row * rowHeight;
      
      drawTriangleCard(doc, cx, cy, cardSize, pair, index, isShuffled);
      index++;
    }
    row++;
  }
}

function drawTriangleCard(
  doc: jsPDF,
  cx: number,
  cy: number,
  size: number,
  pair: TarsiaPair,
  index: number,
  isShuffled: boolean,
): void {
  const h = size * Math.sqrt(3) / 2;
  const halfW = size / 2;
  
  // Вершины (треугольник вершиной вверх)
  const topX = cx;
  const topY = cy;
  const leftX = cx - halfW;
  const leftY = cy + h;
  const rightX = cx + halfW;
  const rightY = cy + h;
  
  // Заливка
  doc.setFillColor(245, 243, 255);
  doc.triangle(leftX, leftY, rightX, rightY, topX, topY, 'F');
  
  // Контур
  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(0.4);
  doc.triangle(leftX, leftY, rightX, rightY, topX, topY, 'S');
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(31, 41, 55);
  
  // === НИЖНЯЯ ГРАНЬ (вопрос) ===
  const questionLines = doc.splitTextToSize(pair.left, size - 6);
  const questionY = cy + h - 4 - (questionLines.length - 1) * 3;
  doc.text(questionLines, cx, questionY, { align: 'center' });
  
  // === ЛЕВАЯ ГРАНЬ (ответ) — рисуем текст наклонно ===
  doc.setTextColor(76, 29, 149);
  const leftAnswerLines = doc.splitTextToSize(pair.right, size - 6);
  
  // Текст вдоль левой грани: от leftX,leftY к topX,topY
  // Рисуем каждую строку с ручным смещением
  leftAnswerLines.forEach((line, i) => {
    const t = 0.15 + i * 0.15; // позиция вдоль грани
    const textX = leftX + (topX - leftX) * t + 3;
    const textY = leftY + (topY - leftY) * t + 3;
    
    // Поворачиваем текст вручную (приблизительно 60°)
    doc.saveGraphicsState();
    // Не используем translate/rotate — просто рисуем текст горизонтально
    // с небольшим смещением
    doc.text(line, textX, textY, { align: 'left' });
    doc.restoreGraphicsState();
  });
  
  // === ПРАВАЯ ГРАНЬ (ответ) ===
  const rightAnswerLines = doc.splitTextToSize(pair.right, size - 6);
  
  rightAnswerLines.forEach((line, i) => {
    const t = 0.15 + i * 0.15;
    const textX = rightX + (topX - rightX) * t - 3;
    const textY = rightY + (topY - rightY) * t + 3;
    
    doc.text(line, textX, textY, { align: 'right' });
  });
  
  // Номер (для задания)
  if (isShuffled) {
    doc.setFontSize(4);
    doc.setTextColor(180, 180, 180);
    doc.text(String(index + 1), cx, cy + h / 2, { align: 'center' });
  }
  
  // Сброс цвета
  doc.setTextColor(31, 41, 55);
}

// ===== ШЕСТИУГОЛЬНАЯ РАСКЛАДКА =====

function drawHexagonLayout(doc: jsPDF, pairs: TarsiaPair[], isShuffled: boolean): void {
  const cardSize = 28;
  
  pairs.forEach((pair, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const cx = 30 + col * cardSize * 1.8;
    const cy = 25 + row * cardSize * 2.2;
    
    drawHexagonCard(doc, cx, cy, cardSize, pair, index, isShuffled);
  });
}

function drawHexagonCard(
  doc: jsPDF,
  cx: number,
  cy: number,
  size: number,
  pair: TarsiaPair,
  index: number,
  isShuffled: boolean,
): void {
  const sides = 6;
  const points: [number, number][] = [];
  
  for (let i = 0; i < sides; i++) {
    const angle = (i * Math.PI) / 3;
    points.push([
      cx + Math.cos(angle) * size,
      cy + Math.sin(angle) * size,
    ]);
  }
  
  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(0.4);
  
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides;
    doc.line(points[i][0], points[i][1], points[next][0], points[next][1]);
  }
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(31, 41, 55);
  
  // Верх — вопрос
  const qLines = doc.splitTextToSize(pair.left, size * 1.4);
  const qY = cy - size + 4 - (qLines.length - 1) * 3;
  doc.text(qLines, cx, qY, { align: 'center' });
  
  // Низ — ответ
  doc.setTextColor(76, 29, 149);
  const aLines = doc.splitTextToSize(pair.right, size * 1.4);
  const aY = cy + size - 4 - (aLines.length - 1) * 3;
  doc.text(aLines, cx, aY, { align: 'center' });
  
  if (isShuffled) {
    doc.setFontSize(4);
    doc.setTextColor(180, 180, 180);
    doc.text(String(index + 1), cx, cy, { align: 'center' });
  }
  
  doc.setTextColor(31, 41, 55);
}

// ===== ДОМИНО =====

function drawDominoLayout(doc: jsPDF, pairs: TarsiaPair[], isShuffled: boolean): void {
  const cardW = 70;
  const cardH = 22;
  const perRow = 3;
  
  pairs.forEach((pair, index) => {
    const row = Math.floor(index / perRow);
    const col = index % perRow;
    const x = 25 + col * (cardW + 10);
    const y = 25 + row * (cardH + 10);
    
    drawDominoCard(doc, x, y, cardW, cardH, pair, index);
  });
}

function drawDominoCard(
  doc: jsPDF,
  cx: number,
  cy: number,
  w: number,
  h: number,
  pair: TarsiaPair,
  index: number,
): void {
  const left = cx - w / 2;
  const top = cy - h / 2;
  
  doc.setFillColor(245, 243, 255);
  doc.rect(left, top, w, h, 'F');
  
  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(0.4);
  doc.rect(left, top, w, h, 'S');
  
  doc.line(cx, top, cx, top + h);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(31, 41, 55);
  
  // Вопрос слева
  const qLines = doc.splitTextToSize(pair.left, w / 2 - 4);
  const qY = cy - ((qLines.length - 1) * 3) / 2;
  doc.text(qLines, cx - w / 4, qY, { align: 'center' });
  
  // Ответ справа
  doc.setTextColor(76, 29, 149);
  const aLines = doc.splitTextToSize(pair.right, w / 2 - 4);
  const aY = cy - ((aLines.length - 1) * 3) / 2;
  doc.text(aLines, cx + w / 4, aY, { align: 'center' });
  
  doc.setTextColor(31, 41, 55);
}
