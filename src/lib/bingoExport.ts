import { jsPDF } from 'jspdf';
import type { BingoCard, BingoConfig } from '@/types/bingo';
import { GRID_SIZES } from '@/types/bingo';

// ===== ПАРАМЕТРЫ ОТРИСОВКИ =====
const CELL_PX = 80;
const GAP_PX = 4;
const PADDING_PX = 24;
const TITLE_H_PX = 44;

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_').slice(0, 60) || 'bingo';
}

// Перенос текста по ширине
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (let word of words) {
    while (ctx.measureText(word).width > maxWidth && word.length > 1) {
      let cut = word;
      while (cut.length > 1 && ctx.measureText(cut + '…').width > maxWidth) {
        cut = cut.slice(0, -1);
      }
      if (current) {
        lines.push(current);
        current = '';
      }
      lines.push(cut + '…');
      word = word.slice(cut.length);
    }
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Подбор размера шрифта, чтобы текст поместился в клетку
function fitCellText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 3,
): { lines: string[]; fontSize: number } {
  const sizes = [18, 16, 14, 12, 11, 10, 9, 8];
  for (const fontSize of sizes) {
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
    const lines = wrapLines(ctx, text, maxWidth);
    if (lines.length <= maxLines) return { lines, fontSize };
  }
  ctx.font = `600 8px system-ui, sans-serif`;
  return { lines: wrapLines(ctx, text, maxWidth).slice(0, maxLines), fontSize: 8 };
}

// ===== ОТРИСОВКА ОДНОЙ КАРТОЧКИ =====
export function drawBingoCardCanvas(
  card: BingoCard,
  config: BingoConfig,
  title?: string,
): HTMLCanvasElement {
  const { rows, cols } = GRID_SIZES[config.gridSize];
  const gridW = cols * CELL_PX + (cols - 1) * GAP_PX;
  const gridH = rows * CELL_PX + (rows - 1) * GAP_PX;
  const showTitle = Boolean(title);
  const width = PADDING_PX * 2 + gridW;
  const height = PADDING_PX * 2 + gridH + (showTitle ? TITLE_H_PX : 0);

  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  // Фон и рамка
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#7c3aed';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, width - 4, height - 4);

  // Заголовок
  if (showTitle && title) {
    ctx.fillStyle = '#6b21a8';
    ctx.font = `800 26px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, width / 2, PADDING_PX + 12, gridW);
  }

  const offsetY = PADDING_PX + (showTitle ? TITLE_H_PX : 0);

  // Клетки
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const x = PADDING_PX + c * (CELL_PX + GAP_PX);
      const y = offsetY + r * (CELL_PX + GAP_PX);
      const value = card.cells[idx];

      if (value === null) {
        // Свободная клетка
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(x, y, CELL_PX, CELL_PX);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, CELL_PX, CELL_PX);
        ctx.fillStyle = '#92400e';
        ctx.font = `800 20px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('FREE', x + CELL_PX / 2, y + CELL_PX / 2);
      } else {
        ctx.fillStyle = '#faf5ff';
        ctx.fillRect(x, y, CELL_PX, CELL_PX);
        ctx.strokeStyle = '#d8b4fe';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, CELL_PX, CELL_PX);

        const { lines, fontSize } = fitCellText(ctx, value, CELL_PX - 10);
        ctx.fillStyle = '#581c87';
        ctx.font = `600 ${fontSize}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lineH = fontSize + 3;
        const startY = y + CELL_PX / 2 - ((lines.length - 1) * lineH) / 2;
        lines.forEach((line, i) => {
          ctx.fillText(line, x + CELL_PX / 2, startY + i * lineH, CELL_PX - 8);
        });
      }
    }
  }

  return canvas;
}

// ===== СПИСОК ДЛЯ ВЕДУЩЕГО (CALL LIST) =====
export function drawCallListCanvas(
  words: string[],
  config: BingoConfig,
  startNumber = 0,
): HTMLCanvasElement {
  const width = 800;
  const headerH = 70;
  const rowH = 30;
  const colsCount = 3;
  const colW = (width - 60) / colsCount;
  const perCol = Math.ceil(words.length / colsCount);
  const height = headerH + perCol * rowH + 30;

  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#6b21a8';
  ctx.font = `800 28px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Список для ведущего — ${config.name}`, 30, 35, width - 60);

  ctx.font = `500 16px system-ui, sans-serif`;
  ctx.fillStyle = '#374151';

  words.forEach((word, i) => {
    const col = Math.floor(i / perCol);
    const row = i % perCol;
    const x = 30 + col * colW;
    const y = headerH + row * rowH;
    ctx.fillText(`${startNumber + i + 1}. ${word}`, x, y, colW - 16);
  });

  return canvas;
}

// ===== ЭКСПОРТ КАРТОЧЕК В PDF =====
export type CardsPerPage = 1 | 2 | 4;

export function exportBingoCardsToPDF(
  cards: BingoCard[],
  config: BingoConfig,
  perPage: CardsPerPage = 2,
): void {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth(); // 210 мм

  const widths: Record<CardsPerPage, number> = { 1: 190, 2: 120, 4: 92 };
  const imgW = widths[perPage];

  for (let i = 0; i < cards.length; i++) {
    const canvas = drawBingoCardCanvas(cards[i], config, `${config.name} · карточка ${i + 1}`);
    const imgData = canvas.toDataURL('image/png');
    const imgH = (canvas.height * imgW) / canvas.width;

    // Новая страница для каждой новой группы карточек
    if (i > 0 && i % perPage === 0) {
      doc.addPage();
    }

    let x: number;
    let y: number;
    if (perPage === 1) {
      x = 10;
      y = 20;
    } else if (perPage === 2) {
      x = (pageW - imgW) / 2;
      y = i % 2 === 0 ? 12 : 12 + imgH + 6;
    } else {
      const pos = i % 4;
      x = pos % 2 === 0 ? 12 : pageW - 12 - imgW;
      y = pos < 2 ? 12 : 12 + imgH + 6;
    }

    doc.addImage(imgData, 'PNG', x, y, imgW, imgH);
  }

  doc.save(sanitizeFileName(`бинго_${config.name}_${cards.length}карт.pdf`));
}

// ===== ЭКСПОРТ СПИСКА ДЛЯ ВЕДУЩЕГО В PDF =====
export function exportCallListToPDF(words: string[], config: BingoConfig): void {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const imgW = pageW - 20;
  const chunk = 60; // элементов на страницу

  for (let start = 0; start < words.length; start += chunk) {
    if (start > 0) doc.addPage();
    const slice = words.slice(start, start + chunk);
    const canvas = drawCallListCanvas(slice, config, start);
    const imgH = Math.min((canvas.height * imgW) / canvas.width, 277);
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, imgW, imgH);
  }

  doc.save(sanitizeFileName(`бинго_${config.name}_список_ведущего.pdf`));
}
