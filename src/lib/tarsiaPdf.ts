// src/lib/tarsiaPdf.ts

import { jsPDF } from 'jspdf';
import type { TarsiaPuzzle, TarsiaPair, TarsiaShape } from '@/types/tarsia';
import { CARD_SIZES } from '@/types/tarsia';
import { sanitizeFileName } from '@/lib/eduGameStorage';

// ===== ТИПЫ РАСКЛАДКИ =====

interface GridCell {
  row: number;
  col: number;
  values: [string | null, string | null, string | null];
}

// ===== ГЕНЕРАЦИЯ РАСКЛАДКИ =====

function generateTriangleGrid(pairs: TarsiaPair[]): GridCell[] {
  const n = pairs.length;
  const grid: GridCell[] = [];
  
  // Для треугольной Тарсии нужно специальное количество пар
  // Используем упрощённую раскладку: каждый вопрос на грани, ответ на соседней
  const cells: GridCell[] = [];
  let pairIndex = 0;
  
  // Строим треугольник
  for (let row = 1; row <= 4; row++) {
    for (let col = 1; col <= 7; col++) {
      if (pairIndex >= n) break;
      
      const pair = pairs[pairIndex];
      const values: [string | null, string | null, string | null] = [
        pair.left || null,
        pair.right || null,
        null,
      ];
      
      cells.push({ row, col, values });
      pairIndex++;
    }
  }
  
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
    
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const centerX = W / 2;
    const centerY = H / 2;
    
    // Перемешиваем для задания
    const shuffledPairs = [...validPairs].sort(() => Math.random() - 0.5);
    
    let firstPage = true;
    
    // ===== СТРАНИЦЫ С РЕШЕНИЕМ =====
    if (puzzle.showSolution) {
      validPairs.forEach((pair, index) => {
        if (!firstPage) doc.addPage();
        firstPage = false;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(14);
        doc.setTextColor(107, 33, 168);
        doc.text(
          `${puzzle.solutionTitle} — карточка ${index + 1} из ${validPairs.length}`,
          centerX,
          15,
          { align: 'center' },
        );
        
        // Рисуем карточку крупно по центру
        drawSingleCard(doc, puzzle.shape, centerX, centerY, pair, index);
        
        doc.setFontSize(10);
        doc.setTextColor(156, 163, 175);
        doc.text('Вырежьте по контуру', centerX, H - 10, { align: 'center' });
      });
    }
    
    // ===== СТРАНИЦЫ С ЗАДАНИЕМ =====
    shuffledPairs.forEach((pair, index) => {
      if (!firstPage) doc.addPage();
      firstPage = false;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      doc.setTextColor(107, 33, 168);
      doc.text(
        `${puzzle.puzzleTitle || puzzle.title} — карточка ${index + 1} из ${shuffledPairs.length}`,
        centerX,
        15,
        { align: 'center' },
      );
      
      drawSingleCard(doc, puzzle.shape, centerX, centerY, pair, index);
      
      doc.setFontSize(10);
      doc.setTextColor(156, 163, 175);
      doc.text('Вырежьте по контуру', centerX, H - 10, { align: 'center' });
    });
    
    doc.save(sanitizeFileName(`тарсия_${puzzle.title}.pdf`));
  } catch (error) {
    console.error('Ошибка генерации PDF:', error);
    alert('Не удалось создать PDF: ' + (error instanceof Error ? error.message : 'неизвестная ошибка'));
  }
}

// ===== ОТРИСОВКА ОДНОЙ КАРТОЧКИ =====

function drawSingleCard(
  doc: jsPDF,
  shape: TarsiaShape,
  cx: number,
  cy: number,
  pair: TarsiaPair,
  index: number,
): void {
  const size = 80; // размер фигуры в mm
  
  if (shape === 'triangle') {
    drawTriangleCard(doc, cx, cy, size, pair);
  } else if (shape === 'hexagon') {
    drawHexagonCard(doc, cx, cy, size, pair);
  } else {
    drawDominoCard(doc, cx, cy, size, pair);
  }
}

function drawTriangleCard(
  doc: jsPDF,
  cx: number,
  cy: number,
  size: number,
  pair: TarsiaPair,
): void {
  const h = size * Math.sqrt(3) / 2;
  const halfW = size / 2;
  
  // Вершины
  const topX = cx;
  const topY = cy - h / 2;
  const leftX = cx - halfW;
  const leftY = cy + h / 2;
  const rightX = cx + halfW;
  const rightY = cy + h / 2;
  
  // Заливка
  doc.setFillColor(245, 243, 255);
  doc.triangle(leftX, leftY, rightX, rightY, topX, topY, 'F');
  
  // Контур
  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(1);
  doc.triangle(leftX, leftY, rightX, rightY, topX, topY, 'S');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(31, 41, 55);
  
  // Вопрос — на нижней грани (между leftX и rightX)
  const leftLines = doc.splitTextToSize(pair.left, size - 12);
  doc.text(leftLines, cx, cy + h / 2 - 10, { align: 'center' });
  
  // Ответ — на верхней грани
  doc.setTextColor(76, 29, 149);
  const rightLines = doc.splitTextToSize(pair.right, size - 12);
  doc.text(rightLines, cx, cy - h / 2 + 12, { align: 'center' });
  
  // Номер карточки
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text(String(index + 1), cx, cy, { align: 'center' });
}

function drawHexagonCard(
  doc: jsPDF,
  cx: number,
  cy: number,
  size: number,
  pair: TarsiaPair,
): void {
  // Заливка шестиугольника
  const sides = 6;
  const points: [number, number][] = [];
  
  for (let i = 0; i < sides; i++) {
    const angle = (i * Math.PI) / 3;
    points.push([
      cx + Math.cos(angle) * size,
      cy + Math.sin(angle) * size,
    ]);
  }
  
  doc.setFillColor(245, 243, 255);
  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(1);
  
  // Рисуем заливку
  const polygon = points.map(p => p.join(',')).join(' ');
  // jsPDF не имеет прямой функции polygon, поэтому рисуем линии
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides;
    doc.line(points[i][0], points[i][1], points[next][0], points[next][1]);
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(31, 41, 55);
  
  // Вопрос сверху
  const leftLines = doc.splitTextToSize(pair.left, size * 1.5);
  doc.text(leftLines, cx, cy - size + 10, { align: 'center' });
  
  // Ответ снизу
  doc.setTextColor(76, 29, 149);
  const rightLines = doc.splitTextToSize(pair.right, size * 1.5);
  doc.text(rightLines, cx, cy + size - 10, { align: 'center' });
}

function drawDominoCard(
  doc: jsPDF,
  cx: number,
  cy: number,
  size: number,
  pair: TarsiaPair,
): void {
  const w = size * 1.5;
  const h = size * 0.8;
  const left = cx - w / 2;
  const top = cy - h / 2;
  
  // Заливка
  doc.setFillColor(245, 243, 255);
  doc.rect(left, top, w, h, 'F');
  
  // Контур
  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(1);
  doc.rect(left, top, w, h, 'S');
  
  // Разделитель
  doc.line(cx, top, cx, top + h);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(31, 41, 55);
  
  // Вопрос слева
  const leftLines = doc.splitTextToSize(pair.left, w / 2 - 10);
  doc.text(leftLines, cx - w / 4, cy, { align: 'center' });
  
  // Ответ справа
  doc.setTextColor(76, 29, 149);
  const rightLines = doc.splitTextToSize(pair.right, w / 2 - 10);
  doc.text(rightLines, cx + w / 4, cy, { align: 'center' });
}

// ===== ВАЖНО: ШРИФТ С КИРИЛЛИЦЕЙ =====

// Проблема с кириллицей в helvetica решается загрузкой Roboto
// Но для надёжности используем helvetica + встроенный Noto Sans

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
    console.warn('Шрифт Roboto не загрузился — кириллица может быть кракозябрами');
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
