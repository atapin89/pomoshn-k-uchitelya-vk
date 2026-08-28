import { jsPDF } from 'jspdf';
import type { TarsiaPuzzle, TarsiaTriangle } from '@/types/tarsia';
import { getTarsiaGridById } from '@/data/tarsiaGrids';

type Pt = [number, number];

// Надпись: одна строка, максимум 15 символов
const MAX_LABEL = 15;

function sanitizeFileName(name: string): string {
  return name.replace(/[/:*?"<>|]/g, '').replace(/\s+/g, '_').slice(0, 60) || 'tarsia';
}

function truncateLabel(text: string): string {
  const t = text.trim();
  if (!t) return '';
  return t.length > MAX_LABEL ? t.slice(0, MAX_LABEL - 1).trimEnd() + '…' : t;
}

function getSideLabel(valueCode: string | null, pairs: TarsiaPuzzle['pairs']): string {
  if (!valueCode) return '';
  const match = valueCode.match(/^(\d+)([qa])$/);
  if (!match) return '';
  const pair = pairs[parseInt(match[1]) - 1];
  if (!pair) return '';
  return truncateLabel(match[2] === 'q' ? pair.left : pair.right);
}

// Одна строка вдоль ребра, всегда внутри, шрифт подбирается по ширине
function drawSideText(
  ctx: CanvasRenderingContext2D,
  a: Pt,
  b: Pt,
  centroid: Pt,
  label: string,
  side: number,
) {
  if (!label) return;

  const midX = (a[0] + b[0]) / 2;
  const midY = (a[1] + b[1]) / 2;

  // вектор внутрь треугольника
  let ix = centroid[0] - midX;
  let iy = centroid[1] - midY;
  const il = Math.hypot(ix, iy) || 1;
  ix /= il;
  iy /= il;

  let angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
  if (angle > Math.PI / 2) angle -= Math.PI;
  if (angle < -Math.PI / 2) angle += Math.PI;

  const offset = Math.max(10, side * 0.15);

  ctx.save();
  ctx.translate(midX + ix * offset, midY + iy * offset);
  ctx.rotate(angle);

  // подбираем кегль, чтобы 15 символов влезли в 72% ребра
  const maxWidth = side * 0.72;
  let fontSize = 10;
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
  const w = ctx.measureText(label).width;
  if (w > maxWidth) {
    fontSize = Math.max(6, Math.floor((fontSize * maxWidth) / w));
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#4c1d95';
  ctx.fillText(label, 0, 0);
  ctx.restore();
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
  const isDown = (triangle.row + triangle.col) % 2 === 0;

  let v0: Pt, v1: Pt, v2: Pt;
  if (isDown) {
    v0 = [x, y];
    v1 = [x + side, y];
    v2 = [x + side / 2, y + height];
  } else {
    v0 = [x + side / 2, y];
    v1 = [x + side, y + height];
    v2 = [x, y + height];
  }

  ctx.beginPath();
  ctx.moveTo(v0[0], v0[1]);
  ctx.lineTo(v1[0], v1[1]);
  ctx.lineTo(v2[0], v2[1]);
  ctx.closePath();
  ctx.fillStyle = '#faf5ff';
  ctx.fill();
  ctx.strokeStyle = '#7c3aed';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const centroid: Pt = [
    (v0[0] + v1[0] + v2[0]) / 3,
    (v0[1] + v1[1] + v2[1]) / 3,
  ];

  const edges: [Pt, Pt, string | null][] = isDown
    ? [
        [v0, v1, triangle.values[0]],
        [v0, v2, triangle.values[1]],
        [v1, v2, triangle.values[2]],
      ]
    : [
        [v2, v1, triangle.values[0]],
        [v0, v1, triangle.values[1]],
        [v0, v2, triangle.values[2]],
      ];

  edges.forEach(([a, b, code]) => {
    drawSideText(ctx, a, b, centroid, getSideLabel(code, pairs), side);
  });
}

function drawSolutionCanvas(puzzle: TarsiaPuzzle): HTMLCanvasElement {
  const grid = getTarsiaGridById(puzzle.shape);
  const side = grid.triangles.length > 10 ? 95 : 110;
  const height = (Math.sqrt(3) / 2) * side;
  const padding = 30;
  const titleHeight = 50;

  const maxRow = Math.max(...grid.triangles.map((t) => t.row));
  const maxCol = Math.max(...grid.triangles.map((t) => t.col));
  const width = padding * 2 + ((maxCol - 1) / 2 + 1) * side;
  const heightTotal = padding * 2 + titleHeight + maxRow * height;

  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = heightTotal * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, heightTotal);

  ctx.fillStyle = '#6b21a8';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(puzzle.solutionTitle, width / 2, padding + 15);

  grid.triangles.forEach((tri) => {
    const x = padding + (tri.col - 1) * side / 2;
    const y = padding + titleHeight + (tri.row - 1) * height;
    drawTriangle(ctx, tri, puzzle.pairs, side, height, x, y);
  });

  return canvas;
}

function drawCutoutCanvas(puzzle: TarsiaPuzzle): HTMLCanvasElement {
  const grid = getTarsiaGridById(puzzle.shape);
  const side = 78;
  const height = (Math.sqrt(3) / 2) * side;
  const padding = 25;
  const titleHeight = 45;
  const gap = 14;

  const cols = grid.triangles.length <= 10 ? 4 : 5;
  const rows = Math.ceil(grid.triangles.length / cols);
  const width = padding * 2 + cols * (side + gap);
  const heightTotal = padding * 2 + titleHeight + rows * (height + gap);

  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = heightTotal * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, heightTotal);

  ctx.fillStyle = '#6b21a8';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(puzzle.puzzleTitle, width / 2, padding + 12);

  ctx.fillStyle = '#9ca3af';
  ctx.font = '10px system-ui, sans-serif';
  ctx.fillText('Разрежь по контуру и соедини вопрос с ответом', width / 2, padding + 30);

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
  const validPairs = puzzle.pairs.filter((p) => p.left.trim() && p.right.trim());
  if (validPairs.length === 0) {
    alert('В пазле нет пар для печати');
    return;
  }

  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  if (puzzle.showSolution) {
    const solutionCanvas = drawSolutionCanvas(puzzle);
    const imgW = pageW - 20;
    const imgH = (solutionCanvas.height * imgW) / solutionCanvas.width;
    doc.addImage(
      solutionCanvas.toDataURL('image/png'),
      'PNG',
      10,
      Math.max(10, (pageH - imgH) / 2),
      imgW,
      imgH,
    );
  }

  doc.addPage();
  const cutoutCanvas = drawCutoutCanvas(puzzle);
  const cutoutImgW = pageW - 20;
  const cutoutImgH = (cutoutCanvas.height * cutoutImgW) / cutoutCanvas.width;
  doc.addImage(
    cutoutCanvas.toDataURL('image/png'),
    'PNG',
    10,
    Math.max(10, (pageH - cutoutImgH) / 2),
    cutoutImgW,
    cutoutImgH,
  );

  doc.save(sanitizeFileName(`тарсия_${puzzle.title}.pdf`));
}
