// src/lib/tarsiaPdf.ts

import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import type { TarsiaPuzzle, TarsiaPair, TarsiaShape } from '@/types/tarsia';
import { sanitizeFileName } from '@/lib/eduGameStorage';

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

// ===== СОЗДАНИЕ SVG-ЭЛЕМЕНТОВ =====

function createTriangleSVGElement(
  pair: TarsiaPair,
  index: number,
  side: number,
  isShuffled: boolean,
): SVGSVGElement {
  const height = side * Math.sqrt(3) / 2;
  
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(side));
  svg.setAttribute('height', String(height));
  svg.setAttribute('viewBox', `0 0 ${side} ${height}`);
  
  // Полигон
  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  polygon.setAttribute('points', `0,${height} ${side},${height} ${side / 2},0`);
  polygon.setAttribute('fill', '#F5F3FF');
  polygon.setAttribute('stroke', '#7C3AED');
  polygon.setAttribute('stroke-width', '1');
  svg.appendChild(polygon);
  
  // Нижняя грань — вопрос
  const bottomText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  bottomText.setAttribute('x', String(side / 2));
  bottomText.setAttribute('y', String(height - 6));
  bottomText.setAttribute('text-anchor', 'middle');
  bottomText.setAttribute('font-size', '6');
  bottomText.setAttribute('fill', '#1F2937');
  bottomText.setAttribute('font-family', 'Roboto, Arial, sans-serif');
  bottomText.textContent = pair.left || '';
  svg.appendChild(bottomText);
  
  // Левая грань — ответ (повёрнут)
  const leftText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  leftText.setAttribute('x', '4');
  leftText.setAttribute('y', String(height / 2));
  leftText.setAttribute('text-anchor', 'middle');
  leftText.setAttribute('font-size', '6');
  leftText.setAttribute('fill', '#4C1D95');
  leftText.setAttribute('font-family', 'Roboto, Arial, sans-serif');
  leftText.setAttribute('transform', `rotate(60 4,${height / 2})`);
  leftText.textContent = pair.right || '';
  svg.appendChild(leftText);
  
  // Правая грань — ответ (повёрнут)
  const rightText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  rightText.setAttribute('x', String(side - 4));
  rightText.setAttribute('y', String(height / 2));
  rightText.setAttribute('text-anchor', 'middle');
  rightText.setAttribute('font-size', '6');
  rightText.setAttribute('fill', '#4C1D95');
  rightText.setAttribute('font-family', 'Roboto, Arial, sans-serif');
  rightText.setAttribute('transform', `rotate(-60 ${side - 4},${height / 2})`);
  rightText.textContent = pair.right || '';
  svg.appendChild(rightText);
  
  // Номер карточки
  if (isShuffled) {
    const numText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    numText.setAttribute('x', String(side / 2));
    numText.setAttribute('y', String(height / 2));
    numText.setAttribute('text-anchor', 'middle');
    numText.setAttribute('font-size', '4');
    numText.setAttribute('fill', '#D1D5DB');
    numText.textContent = String(index + 1);
    svg.appendChild(numText);
  }
  
  return svg;
}

function createHexagonSVGElement(
  pair: TarsiaPair,
  index: number,
  side: number,
  isShuffled: boolean,
): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(side));
  svg.setAttribute('height', String(side));
  svg.setAttribute('viewBox', `0 0 ${side} ${side}`);
  
  // Полигон
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const x = side / 2 + Math.cos(angle) * side / 2;
    const y = side / 2 + Math.sin(angle) * side / 2;
    points.push(`${x},${y}`);
  }
  
  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  polygon.setAttribute('points', points.join(' '));
  polygon.setAttribute('fill', '#F5F3FF');
  polygon.setAttribute('stroke', '#7C3AED');
  polygon.setAttribute('stroke-width', '1');
  svg.appendChild(polygon);
  
  // Верх — вопрос
  const topText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  topText.setAttribute('x', String(side / 2));
  topText.setAttribute('y', String(side / 2 - 4));
  topText.setAttribute('text-anchor', 'middle');
  topText.setAttribute('font-size', '5');
  topText.setAttribute('fill', '#1F2937');
  topText.textContent = pair.left || '';
  svg.appendChild(topText);
  
  // Низ — ответ
  const bottomText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  bottomText.setAttribute('x', String(side / 2));
  bottomText.setAttribute('y', String(side / 2 + 8));
  bottomText.setAttribute('text-anchor', 'middle');
  bottomText.setAttribute('font-size', '5');
  bottomText.setAttribute('fill', '#4C1D95');
  bottomText.textContent = pair.right || '';
  svg.appendChild(bottomText);
  
  return svg;
}

function createDominoSVGElement(
  pair: TarsiaPair,
  index: number,
  w: number,
  h: number,
): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(w));
  svg.setAttribute('height', String(h));
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  
  // Прямоугольник
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', '0');
  rect.setAttribute('y', '0');
  rect.setAttribute('width', String(w));
  rect.setAttribute('height', String(h));
  rect.setAttribute('fill', '#F5F3FF');
  rect.setAttribute('stroke', '#7C3AED');
  rect.setAttribute('stroke-width', '1');
  svg.appendChild(rect);
  
  // Разделитель
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', String(w / 2));
  line.setAttribute('y1', '0');
  line.setAttribute('x2', String(w / 2));
  line.setAttribute('y2', String(h));
  line.setAttribute('stroke', '#7C3AED');
  svg.appendChild(line);
  
  // Вопрос слева
  const leftText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  leftText.setAttribute('x', String(w / 4));
  leftText.setAttribute('y', String(h / 2));
  leftText.setAttribute('text-anchor', 'middle');
  leftText.setAttribute('font-size', '7');
  leftText.setAttribute('fill', '#1F2937');
  leftText.textContent = pair.left || '';
  svg.appendChild(leftText);
  
  // Ответ справа
  const rightText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  rightText.setAttribute('x', String(w * 3 / 4));
  rightText.setAttribute('y', String(h / 2));
  rightText.setAttribute('text-anchor', 'middle');
  rightText.setAttribute('font-size', '7');
  rightText.setAttribute('fill', '#4C1D95');
  rightText.textContent = pair.right || '';
  svg.appendChild(rightText);
  
  return svg;
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
      
      await drawSVGCards(doc, puzzle.shape, validPairs, false);
      
      doc.addPage();
    }
    
    // ===== СТРАНИЦА 2: ЗАДАНИЕ =====
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(107, 33, 168);
    doc.text(puzzle.puzzleTitle || puzzle.title, W / 2, 10, { align: 'center' });
    
    const shuffledPairs = [...validPairs].sort(() => Math.random() - 0.5);
    await drawSVGCards(doc, puzzle.shape, shuffledPairs, true);
    
    doc.save(sanitizeFileName(`тарсия_${puzzle.title}.pdf`));
  } catch (error) {
    console.error('Ошибка генерации PDF:', error);
    alert('Не удалось создать PDF: ' + (error instanceof Error ? error.message : 'неизвестная ошибка'));
  }
}

// ===== ОТРИСОВКА SVG-КАРТОЧЕК (по 2 в ряду) =====

async function drawSVGCards(
  doc: jsPDF,
  shape: TarsiaShape,
  pairs: TarsiaPair[],
  isShuffled: boolean,
): Promise<void> {
  const perRow = 2;
  const cardSize = shape === 'hexagon' ? 50 : 60;
  const gapX = 15;
  const gapY = 15;
  
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const x = 20 + col * (cardSize + gapX);
    const y = 20 + row * (cardSize + gapY);
    
    let svgElement: SVGSVGElement;
    
    if (shape === 'triangle') {
      svgElement = createTriangleSVGElement(pair, i, cardSize, isShuffled);
    } else if (shape === 'hexagon') {
      svgElement = createHexagonSVGElement(pair, i, cardSize, isShuffled);
    } else {
      svgElement = createDominoSVGElement(pair, i, cardSize * 1.5, cardSize * 0.8);
    }
    
    await svg2pdf(svgElement, doc, {
      x,
      y,
      width: cardSize,
      height: cardSize,
    });
  }
}
