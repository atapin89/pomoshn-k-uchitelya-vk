// src/lib/tarsiaPdf.ts

import { jsPDF } from 'jspdf';
import type { TarsiaPuzzle, TarsiaPair, TarsiaShape } from '@/types/tarsia';
import { CARD_SIZES } from '@/types/tarsia';
import { sanitizeFileName } from '@/lib/eduGameStorage';

// ===== ТИПЫ РАСКЛАДКИ =====

interface GridCell {
  row: number;
  col: number;
  // Три грани: [нижняя, левая, правая]
  // Каждая грань содержит ТЕКСТ, который будет напечатан
  values: [string | null, string | null, string | null];
}

// ===== КОНСТАНТЫ РАСКЛАДКИ =====

// Для треугольной Тарсии с 12 парами (как в демо)
const TRIANGLE_LAYOUT_12: { row: number; col: number }[] = [
  { row: 1, col: 4 },
  { row: 2, col: 3 }, { row: 2, col: 4 }, { row: 2, col: 5 },
  { row: 3, col: 2 }, { row: 3, col: 3 }, { row: 3, col: 4 }, { row: 3, col: 5 }, { row: 3, col: 6 },
  { row: 4, col: 1 }, { row: 4, col: 2 }, { row: 4, col: 3 }, { row: 4, col: 4 }, { row: 4, col: 5 }, { row: 4, col: 6 }, { row: 4, col: 7 },
];

// ===== ПОСТРОЕНИЕ ГРАНЕЙ =====

/**
 * Создаёт раскладку, где вопросы и ответы сопоставлены по граням.
 * 
 * Логика:
 * - Каждая пара "вопрос-ответ" создаёт ДВА текста: вопрос (Q) и ответ (A)
 * - Вопрос размещается на грани одной карточки
 * - Ответ размещается на грани СОСЕДНЕЙ карточки
 * - При сборке: грань с вопросом соприкасается с гранью с ответом
 */
function buildTriangleGrid(pairs: TarsiaPair[]): GridCell[] {
  const n = pairs.length;
  const cells: GridCell[] = [];
  
  // Для простоты используем паттерн:
  // Карточка i: [вопрос_i, ответ_{i-1}, ответ_{i-2}]
  // Или [ответ_i, вопрос_{i+1}, вопрос_{i+2}]
  
  // Создаём массив всех текстов
  const allTexts: string[] = [];
  pairs.forEach((pair, i) => {
    allTexts.push(pair.left);  // вопрос
    allTexts.push(pair.right); // ответ
  });
  
  // Перемешиваем для создания "задания"
  const shuffledPairs = [...pairs];
  
  // Для решения: каждая карточка имеет 3 грани
  // Грань 0 (низ): вопрос_i
  // Грань 1 (лево): ответ_{i-1} (ответ на вопрос предыдущей карточки)
  // Грань 2 (право): ответ_{i+1} (ответ на вопрос следующей карточки)
  
  shuffledPairs.forEach((pair, i) => {
    const prevPair = shuffledPairs[(i - 1 + n) % n];
    const nextPair = shuffledPairs[(i + 1) % n];
    
    cells.push({
      row: Math.floor(i / 4) + 1,
      col: (i % 4) * 2 + 1,
      values: [
        pair.left,       // Вопрос текущей пары (нижняя грань)
        prevPair.right,  // Ответ предыдущей пары (левая грань)
        nextPair.right,  // Ответ следующей пары (правая грань)
      ],
    });
  });
  
  return cells;
}

// ===== ЭКСПОРТ В PDF (правильная Тарсия) =====

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
    
    // ===== СТРАНИЦА 1: РЕШЕНИЕ (правильная раскладка) =====
    if (puzzle.showSolution) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(107, 33, 168);
      doc.text(puzzle.solutionTitle, W / 2, 12, { align: 'center' });
      
      // Рисуем все карточки в правильном порядке
      drawAllCards(doc, puzzle.shape, validPairs, false);
      
      doc.addPage();
    }
    
    // ===== СТРАНИЦА 2: ЗАДАНИЕ (перемешанные) =====
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

// ===== ОТРИСОВКА ВСЕХ КАРТОЧЕК НА ОДНОЙ СТРАНИЦЕ =====

function drawAllCards(
  doc: jsPDF,
  shape: TarsiaShape,
  pairs: TarsiaPair[],
  isShuffled: boolean,
): void {
  const n = pairs.length;
  
  if (shape === 'triangle') {
    // Треугольная раскладка
    const cardSize = 40; // размер стороны треугольника в mm
    const rowHeight = cardSize * Math.sqrt(3) / 2;
    const colWidth = cardSize;
    
    // Раскладка по рядам
    const layout = getTriangleLayout(n);
    
    layout.forEach((cell, index) => {
      if (index >= pairs.length) return;
      
      const pair = pairs[index];
      const x = 20 + cell.col * colWidth / 2;
      const y = 25 + cell.row * rowHeight;
      
      drawTriangleCard(doc, x, y, cardSize, pair, index, isShuffled);
    });
  } else if (shape === 'hexagon') {
    // Шестиугольная раскладка
    const cardSize = 30;
    const layout = getHexagonLayout(n);
    
    layout.forEach((cell, index) => {
      if (index >= pairs.length) return;
      
      const pair = pairs[index];
      const x = 30 + cell.col * cardSize * 1.5;
      const y = 30 + cell.row * cardSize * 1.7;
      
      drawHexagonCard(doc, x, y, cardSize, pair, index, isShuffled);
    });
  } else {
    // Домино
    const cardW = 70;
    const cardH = 25;
    const perRow = 3;
    
    pairs.forEach((pair, index) => {
      const row = Math.floor(index / perRow);
      const col = index % perRow;
      const x = 25 + col * (cardW + 10);
      const y = 30 + row * (cardH + 15);
      
      drawDominoCard(doc, x, y, cardW, cardH, pair, index);
    });
  }
}

// ===== РАСКЛАДКИ =====

function getTriangleLayout(n: number): { row: number; col: number }[] {
  // Строим треугольную сетку
  const layout: { row: number; col: number }[] = [];
  let index = 0;
  let row = 1;
  
  while (index < n) {
    const rowCount = row; // в каждом ряду row карточек
    for (let col = 1; col <= rowCount && index < n; col++) {
      layout.push({ row, col });
      index++;
    }
    row++;
  }
  
  return layout;
}

function getHexagonLayout(n: number): { row: number; col: number }[] {
  const layout: { row: number; col: number }[] = [];
  const perRing = [1, 6, 12, 18, 24];
  
  let index = 0;
  let ring = 0;
  
  while (index < n && ring < perRing.length) {
    const count = Math.min(perRing[ring], n - index);
    const rows = Math.max(3, Math.ceil(count / 4));
    const cols = Math.ceil(count / rows);
    
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols) + 1 + ring * 3;
      const col = (i % cols) + 1 + ring * 2;
      layout.push({ row, col });
      index++;
    }
    ring++;
  }
  
  return layout;
}

// ===== ОТРИСОВКА КАРТОЧЕК =====

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
  doc.setLineWidth(0.5);
  doc.triangle(leftX, leftY, rightX, rightY, topX, topY, 'S');
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(31, 41, 55);
  
  // Нижняя грань — ВОПРОС
  const questionLines = doc.splitTextToSize(pair.left, size - 8);
  doc.text(questionLines, cx, cy + h - 6, { align: 'center' });
  
  // Левая грань — ОТВЕТ (повёрнут на 60°)
  doc.setTextColor(76, 29, 149);
  const leftAnswerLines = doc.splitTextToSize(pair.right, size - 8);
  
  // Поворачиваем текст для левой грани
  doc.saveGraphicsState();
  doc.translate(leftX + 4, cy + h / 2);
  doc.rotate(60);
  doc.text(leftAnswerLines, 0, 0, { align: 'center' });
  doc.restoreGraphicsState();
  
  // Правая грань — ОТВЕТ (повёрнут на -60°)
  const rightAnswerLines = doc.splitTextToSize(pair.right, size - 8);
  
  doc.saveGraphicsState();
  doc.translate(rightX - 4, cy + h / 2);
  doc.rotate(-60);
  doc.text(rightAnswerLines, 0, 0, { align: 'center' });
  doc.restoreGraphicsState();
  
  // Номер карточки (только для задания — чтобы легче проверять)
  if (isShuffled) {
    doc.setFontSize(5);
    doc.setTextColor(200, 200, 200);
    doc.text(String(index + 1), cx, cy + h / 2, { align: 'center' });
  }
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
  doc.setLineWidth(0.5);
  
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides;
    doc.line(points[i][0], points[i][1], points[next][0], points[next][1]);
  }
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(31, 41, 55);
  
  // Верхняя грань — вопрос
  const questionLines = doc.splitTextToSize(pair.left, size * 1.5);
  doc.text(questionLines, cx, cy - size + 5, { align: 'center' });
  
  // Нижняя грань — ответ
  doc.setTextColor(76, 29, 149);
  const answerLines = doc.splitTextToSize(pair.right, size * 1.5);
  doc.text(answerLines, cx, cy + size - 5, { align: 'center' });
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
  doc.setLineWidth(0.5);
  doc.rect(left, top, w, h, 'S');
  
  // Разделитель
  doc.line(cx, top, cx, top + h);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(31, 41, 55);
  
  // Вопрос слева
  const questionLines = doc.splitTextToSize(pair.left, w / 2 - 6);
  doc.text(questionLines, cx - w / 4, cy, { align: 'center' });
  
  // Ответ справа
  doc.setTextColor(76, 29, 149);
  const answerLines = doc.splitTextToSize(pair.right, w / 2 - 6);
  doc.text(answerLines, cx + w / 4, cy, { align: 'center' });
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
    console.warn('Шрифт Roboto не загрузился');
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
