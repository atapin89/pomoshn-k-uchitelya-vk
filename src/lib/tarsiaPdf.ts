import { jsPDF } from 'jspdf';
import type { TarsiaPuzzle, TarsiaTriangle } from '@/types/tarsia';
import { splitTextToLines } from '@/types/tarsia';
import { getTarsiaGridById } from '@/data/tarsiaGrids';

const FONT_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf';
const FONT_BOLD_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf';

let fontLoaded = false;

async function loadFonts(doc: jsPDF): Promise<void> {
  if (fontLoaded) return;
  try {
    const [regularRes, boldRes] = await Promise.all([
      fetch(FONT_URL),
      fetch(FONT_BOLD_URL),
    ]);
    const regularArrayBuffer = await regularRes.arrayBuffer();
    const boldArrayBuffer = await boldRes.arrayBuffer();
    const regularBase64 = arrayBufferToBase64(regularArrayBuffer);
    const boldBase64 = arrayBufferToBase64(boldArrayBuffer);
    doc.addFileToVFS('Roboto-Regular.ttf', regularBase64);
    doc.addFileToVFS('Roboto-Bold.ttf', boldBase64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
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

function sanitizeFileName(name: string): string {
  return name.replace(/[/:*?"<>|]/g, '').replace(/\s+/g, '_').slice(0, 60) || 'tarsia';
}

function getTriangleText(
  valueCode: string | null,
  pairs: TarsiaPuzzle['pairs'],
): string[] {
  if (!valueCode) return [];
  const match = valueCode.match(/^(\d+)([qa])$/);
  if (!match) return [];
  const num = parseInt(match[1]);
  const type = match[2];
  const pair = pairs[num - 1];
  if (!pair) return [];
  const text = type === 'q' ? pair.left : pair.right;
  return splitTextToLines(text, [25, 18, 10]);
}

function drawTriangle(
  ctx: CanvasRenderingContext2D,
  triangle: TarsiaTriangle,
  pairs: TarsiaPuzzle['pairs'],
  side: number,
  height: number,
  x: number,
  y: number,
) {
  const orientation = (triangle.row + triangle.col) % 2 === 0 ? 'up' : 'down';

  // Координаты вершин треугольника
  let v0: [number, number], v1: [number, number], v2: [number, number];
  
  if (orientation === 'down') {
    v0 = [x, y];                    // верхний левый
    v1 = [x + side, y];             // верхний правый
    v2 = [x + side / 2, y + height]; // нижний
  } else {
    v0 = [x + side / 2, y];         // верхний
    v1 = [x + side, y + height];    // нижний правый
    v2 = [x, y + height];           // нижний левый
  }

  // Рисуем треугольник
  ctx.beginPath();
  ctx.moveTo(v0[0], v0[1]);
  ctx.lineTo(v1[0], v1[1]);
  ctx.lineTo(v2[0], v2[1]);
  ctx.closePath();
  ctx.fillStyle = '#faf5ff';
  ctx.fill();
  ctx.strokeStyle = '#7c3aed';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Рисуем текст на сторонах
  ctx.fillStyle = '#581c87';
  ctx.font = 'bold 12px Roboto, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textOffset = 15; // отступ от стороны внутрь треугольника

  // Сторона 0: v0 -> v1
  const text0 = getTriangleText(triangle.values[0], pairs);
  if (text0.length > 0) {
    const midX = (v0[0] + v1[0]) / 2;
    const midY = (v0[1] + v1[1]) / 2;
    const angle = Math.atan2(v1[1] - v0[1], v1[0] - v0[0]);
    const normalAngle = angle - Math.PI / 2;
    const offsetX = Math.cos(normalAngle) * textOffset;
    const offsetY = Math.sin(normalAngle) * textOffset;
    
    ctx.save();
    ctx.translate(midX + offsetX, midY + offsetY);
    ctx.rotate(angle);
    const lineHeight = 14;
    text0.forEach((line, idx) => {
      const yOffset = (idx - (text0.length - 1) / 2) * lineHeight;
      ctx.fillText(line, 0, yOffset);
    });
    ctx.restore();
  }

  // Сторона 1: v1 -> v2
  const text1 = getTriangleText(triangle.values[1], pairs);
  if (text1.length > 0) {
    const midX = (v1[0] + v2[0]) / 2;
    const midY = (v1[1] + v2[1]) / 2;
    const angle = Math.atan2(v2[1] - v1[1], v2[0] - v1[0]);
    const normalAngle = angle - Math.PI / 2;
    const offsetX = Math.cos(normalAngle) * textOffset;
    const offsetY = Math.sin(normalAngle) * textOffset;
    
    ctx.save();
    ctx.translate(midX + offsetX, midY + offsetY);
    ctx.rotate(angle);
    const lineHeight = 14;
    text1.forEach((line, idx) => {
      const yOffset = (idx - (text1.length - 1) / 2) * lineHeight;
      ctx.fillText(line, 0, yOffset);
    });
    ctx.restore();
  }

  // Сторона 2: v2 -> v0
  const text2 = getTriangleText(triangle.values[2], pairs);
  if (text2.length > 0) {
    const midX = (v2[0] + v0[0]) / 2;
    const midY = (v2[1] + v0[1]) / 2;
    const angle = Math.atan2(v0[1] - v2[1], v0[0] - v2[0]);
    const normalAngle = angle - Math.PI / 2;
    const offsetX = Math.cos(normalAngle) * textOffset;
    const offsetY = Math.sin(normalAngle) * textOffset;
    
    ctx.save();
    ctx.translate(midX + offsetX, midY + offsetY);
    ctx.rotate(angle);
    const lineHeight = 14;
    text2.forEach((line, idx) => {
      const yOffset = (idx - (text2.length - 1) / 2) * lineHeight;
      ctx.fillText(line, 0, yOffset);
    });
    ctx.restore();
  }
}

function drawSolutionCanvas(puzzle: TarsiaPuzzle): HTMLCanvasElement {
  const grid = getTarsiaGridById(puzzle.shape);
  const side = 100;
  const height = (Math.sqrt(3) / 2) * side;
  const padding = 40;
  const titleHeight = 60;

  const maxRow = Math.max(...grid.triangles.map((t) => t.row));
  const maxCol = Math.max(...grid.triangles.map((t) => t.col));
  const width = padding * 2 + (maxCol + 1) * side;
  const heightTotal = padding * 2 + titleHeight + (maxRow + 1) * height;

  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = heightTotal * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  // Фон
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, heightTotal);

  // Заголовок
  ctx.fillStyle = '#6b21a8';
  ctx.font = 'bold 28px Roboto, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(puzzle.solutionTitle, width / 2, padding + 20);

  // Треугольники
  grid.triangles.forEach((tri) => {
    const x = padding + (tri.col - 1) * side / 2;
    const y = padding + titleHeight + (tri.row - 1) * height;
    drawTriangle(ctx, tri, puzzle.pairs, side, height, x, y);
  });

  return canvas;
}

function drawCutoutCanvas(puzzle: TarsiaPuzzle): HTMLCanvasElement {
  const grid = getTarsiaGridById(puzzle.shape);
  const side = 70;
  const height = (Math.sqrt(3) / 2) * side;
  const padding = 30;
  const titleHeight = 50;
  const gap = 15;

  const cols = 4;
  const rows = Math.ceil(grid.triangles.length / cols);
  const width = padding * 2 + cols * (side + gap);
  const heightTotal = padding * 2 + titleHeight + rows * (height + gap);

  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = heightTotal * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  // Фон
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, heightTotal);

  // Заголовок
  ctx.fillStyle = '#6b21a8';
  ctx.font = 'bold 24px Roboto, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(puzzle.puzzleTitle, width / 2, padding + 15);

  // Треугольники
  grid.triangles.forEach((tri, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = padding + col * (side + gap);
    const y = padding + titleHeight + row * (height + gap);
    drawTriangle(ctx, tri, puzzle.pairs, side, height, x, y);
  });

  return canvas;
}

export async function exportTarsiaToPDF(puzzle: TarsiaPuzzle): Promise<void> {
  if (puzzle.pairs.length === 0) {
    alert('В пазле нет пар для печати');
    return;
  }

  const doc = new jsPDF();
  await loadFonts(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Страница 1: Решение
  if (puzzle.showSolution) {
    const solutionCanvas = drawSolutionCanvas(puzzle);
    const imgData = solutionCanvas.toDataURL('image/png');
    const imgW = pageW - 20;
    const imgH = (solutionCanvas.height * imgW) / solutionCanvas.width;
    const y = Math.max(10, (pageH - imgH) / 2);
    doc.addImage(imgData, 'PNG', 10, y, imgW, imgH);
  }

  // Страница 2+: Вырезалка
  doc.addPage();
  const cutoutCanvas = drawCutoutCanvas(puzzle);
  const cutoutImgData = cutoutCanvas.toDataURL('image/png');
  const cutoutImgW = pageW - 20;
  const cutoutImgH = (cutoutCanvas.height * cutoutImgW) / cutoutCanvas.width;
  const cutoutY = Math.max(10, (pageH - cutoutImgH) / 2);
  doc.addImage(cutoutImgData, 'PNG', 10, cutoutY, cutoutImgW, cutoutImgH);

  doc.save(sanitizeFileName(`тарсия_${puzzle.title}.pdf`));
}
