// src/lib/tarsiaPdf.ts

import { jsPDF } from 'jspdf';
import type { TarsiaPuzzle, TarsiaPair, TarsiaShape } from '@/types/tarsia';
import { CARD_SIZES } from '@/types/tarsia';
import { sanitizeFileName } from '@/lib/eduGameStorage';

// ===== КИРИЛЛИЧЕСКИЙ ШРИФТ =====

// Встроенный шрифт Roboto в base64 (только Regular)
// Если этот шрифт не загрузится, используем helvetica (но кириллица будет кракозябрами)
const ROBOTO_BASE64 = ''; // Мы будем загружать с CDN

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
    console.warn('Не удалось загрузить шрифт Roboto. Кириллица может отображаться некорректно.');
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
    
    // Загружаем шрифт с поддержкой кириллицы
    await loadRobotoFont(doc);
    
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
        
        doc.setFont('Roboto', 'normal');
        doc.setFontSize(14);
        doc.setTextColor(107, 33, 168);
        doc.text(
          `${puzzle.solutionTitle} — карточка ${index + 1} из ${validPairs.length}`,
          centerX,
          20,
          { align: 'center' },
        );
        
        const shapeSize = 55 * scale;
        drawShapeOnPdf(doc, puzzle.shape, centerX, centerY, shapeSize, pair);
        
        doc.setFont('Roboto', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(156, 163, 175);
        doc.text('Вырежьте по контуру', centerX, H - 15, { align: 'center' });
      });
    }
    
    // ===== СТРАНИЦЫ С ЗАДАНИЕМ =====
    shuffledPairs.forEach((pair, index) => {
      if (!firstPage) doc.addPage();
      firstPage = false;
      
      doc.setFont('Roboto', 'normal');
      doc.setFontSize(14);
      doc.setTextColor(107, 33, 168);
      doc.text(
        `${puzzle.puzzleTitle || puzzle.title} — карточка ${index + 1} из ${shuffledPairs.length}`,
        centerX,
        20,
        { align: 'center' },
      );
      
      const shapeSize = 55 * scale;
      drawShapeOnPdf(doc, puzzle.shape, centerX, centerY, shapeSize, pair);
      
      doc.setFont('Roboto', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(156, 163, 175);
      doc.text('Вырежьте по контуру', centerX, H - 15, { align: 'center' });
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
  
  doc.setDrawColor(124, 58, 237);
  doc.setLineWidth(0.8);
  
  doc.line(cx - halfW, cy + h / 2, cx + halfW, cy + h / 2);
  doc.line(cx + halfW, cy + h / 2, cx, cy - h / 2);
  doc.line(cx, cy - h / 2, cx - halfW, cy + h / 2);
  
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(31, 41, 55);
  
  // Вопрос внизу
  const leftLines = doc.splitTextToSize(pair.left, size - 10);
  doc.text(leftLines, cx, cy + h / 2 - 8, { align: 'center' });
  
  // Ответ сверху
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
  
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(31, 41, 55);
  
  const leftLines = doc.splitTextToSize(pair.left, size * 1.3);
  doc.text(leftLines, cx, cy - size + 8, { align: 'center' });
  
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
  
  doc.rect(left, top, w, h);
  doc.line(cx, top, cx, top + h);
  
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(31, 41, 55);
  
  const leftLines = doc.splitTextToSize(pair.left, w / 2 - 8);
  doc.text(leftLines, cx - w / 4, cy, { align: 'center' });
  
  doc.setTextColor(76, 29, 149);
  const rightLines = doc.splitTextToSize(pair.right, w / 2 - 8);
  doc.text(rightLines, cx + w / 4, cy, { align: 'center' });
}

// ===== ЭКСПОРТ В PNG УБРАН =====
// PNG больше не используется. Для печати используйте PDF.
