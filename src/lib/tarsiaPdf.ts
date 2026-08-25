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

// ===== ГЕНЕРАЦИЯ SVG ДЛЯ ТРЕУГОЛЬНИКА =====

function generateTriangleSVG(
  pair: TarsiaPair,
  index: number,
  side: number,
  isShuffled: boolean,
): string {
  const height = side * Math.sqrt(3) / 2;
  const cx = side / 2;
  const cy = height / 2;
  
  // Тексты для трёх граней
  const bottomText = escapeXml(pair.left || '');
  const leftText = escapeXml(pair.right || '');
  const rightText = escapeXml(pair.right || '');
  
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${side}" height="${height}" viewBox="0 0 ${side} ${height}">
      <polygon points="0,${height} ${side},${height} ${side / 2},0" 
               fill="#F5F3FF" stroke="#7C3AED" stroke-width="1"/>
      
      <!-- Нижняя грань: ВОПРОС -->
      <text x="${side / 2}" y="${height - 6}" 
            text-anchor="middle" font-size="6" fill="#1F2937"
            font-family="Roboto, Arial, sans-serif">${bottomText}</text>
      
      <!-- Левая грань: ОТВЕТ (повёрнут на 60°) -->
      <text x="4" y="${height / 2}" 
            text-anchor="middle" font-size="6" fill="#4C1D95"
            font-family="Roboto, Arial, sans-serif"
            transform="rotate(60 4,${height / 2})">${leftText}</text>
      
      <!-- Правая грань: ОТВЕТ (повёрнут на -60°) -->
      <text x="${side - 4}" y="${height / 2}" 
            text-anchor="middle" font-size="6" fill="#4C1D95"
            font-family="Roboto, Arial, sans-serif"
            transform="rotate(-60 ${side - 4},${height / 2})">${rightText}</text>
      
      <!-- Номер карточки (для задания) -->
      ${isShuffled ? `
      <text x="${side / 2}" y="${height / 2}" 
            text-anchor="middle" font-size="4" fill="#D1D5DB">${index + 1}</text>
      ` : ''}
    </svg>
  `;
}

function generateHexagonSVG(
  pair: TarsiaPair,
  index: number,
  side: number,
  isShuffled: boolean,
): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const x = side / 2 + Math.cos(angle) * side / 2;
    const y = side / 2 + Math.sin(angle) * side / 2;
    points.push(`${x},${y}`);
  }
  
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${side}" height="${side}" viewBox="0 0 ${side} ${side}">
      <polygon points="${points.join(' ')}" 
               fill="#F5F3FF" stroke="#7C3AED" stroke-width="1"/>
      <text x="${side / 2}" y="${side / 2 - 4}" 
            text-anchor="middle" font-size="5" fill="#1F2937"
            font-family="Roboto, Arial, sans-serif">${escapeXml(pair.left || '')}</text>
      <text x="${side / 2}" y="${side / 2 + 8}" 
            text-anchor="middle" font-size="5" fill="#4C1D95"
            font-family="Roboto, Arial, sans-serif">${escapeXml(pair.right || '')}</text>
    </svg>
  `;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== ЭКСПОРТ В PDF ЧЕРЕЗ SVG =====

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
      
      // Рисуем все SVG-треугольники
      await drawSVGCards(doc, puzzle.shape, validPairs, false, 10, 20);
      
      doc.addPage();
    }
    
    // ===== СТРАНИЦА 2: ЗАДАНИЕ =====
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(107, 33, 168);
    doc.text(puzzle.puzzleTitle || puzzle.title, W / 2, 10, { align: 'center' });
    
    const shuffledPairs = [...validPairs].sort(() => Math.random() - 0.5);
    await drawSVGCards(doc, puzzle.shape, shuffledPairs, true, 10, 20);
    
    doc.save(sanitizeFileName(`тарсия_${puzzle.title}.pdf`));
  } catch (error) {
    console.error('Ошибка генерации PDF:', error);
    alert('Не удалось создать PDF: ' + (error instanceof Error ? error.message : 'неизвестная ошибка'));
  }
}

// ===== ОТРИСОВКА SVG-КАРТОЧЕК =====

async function drawSVGCards(
  doc: jsPDF,
  shape: TarsiaShape,
  pairs: TarsiaPair[],
  isShuffled: boolean,
  startX: number,
  startY: number,
): Promise<void> {
  const perRow = 3;
  const cardSize = shape === 'hexagon' ? 35 : 45;
  const gapX = 8;
  const gapY = 8;
  
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const x = startX + col * (cardSize + gapX);
    const y = startY + row * (cardSize * 1.2 + gapY);
    
    let svg: string;
    if (shape === 'triangle') {
      svg = generateTriangleSVG(pair, i, cardSize, isShuffled);
    } else if (shape === 'hexagon') {
      svg = generateHexagonSVG(pair, i, cardSize, isShuffled);
    } else {
      // Для домино — рисуем прямоугольник
      svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${cardSize * 1.5}" height="${cardSize * 0.8}">
          <rect x="0" y="0" width="${cardSize * 1.5}" height="${cardSize * 0.8}" 
                fill="#F5F3FF" stroke="#7C3AED" stroke-width="1"/>
          <line x1="${cardSize * 0.75}" y1="0" x2="${cardSize * 0.75}" y2="${cardSize * 0.8}" stroke="#7C3AED"/>
          <text x="${cardSize * 0.375}" y="${cardSize * 0.4}" 
                text-anchor="middle" font-size="7" fill="#1F2937">${escapeXml(pair.left || '')}</text>
          <text x="${cardSize * 1.125}" y="${cardSize * 0.4}" 
                text-anchor="middle" font-size="7" fill="#4C1D95">${escapeXml(pair.right || '')}</text>
        </svg>
      `;
    }
    
    await svg2pdf(svg, doc, {
      x,
      y,
      width: cardSize,
      height: cardSize,
    });
  }
}
