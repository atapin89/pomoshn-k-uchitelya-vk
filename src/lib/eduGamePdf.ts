import { jsPDF } from 'jspdf';
import type { EduGame } from '@/types/eduGame';
import { sanitizeFileName } from '@/lib/eduGameStorage';

/**
 * Двусторонняя печать: каждая карточка = 2 страницы PDF.
 * Страница 1 (лицевая): вопрос. Страница 2 (оборот): баллы + ответ.
 * Печатать нужно с опцией «двусторонняя печать, переворот по длинному краю».
 */
export function exportEduGameToPDF(game: EduGame): void {
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  const wrap = (text: string, maxWidth: number): string[] => {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const cand = cur ? `${cur} ${w}` : w;
      if (doc.getTextWidth(cand) <= maxWidth) cur = cand;
      else {
        if (cur) lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  };

  const drawFrame = () => {
    doc.setDrawColor(124, 58, 237);
    doc.setLineWidth(1);
    doc.setLineDashPattern([4, 3], 0);
    doc.rect(8, 8, W - 16, H - 16);
    doc.setLineDashPattern([], 0);
  };

  const fitLines = (
    text: string,
    maxWidth: number,
    maxHeight: number,
    sizes: number[],
  ): { lines: string[]; size: number } => {
    for (const size of sizes) {
      doc.setFontSize(size);
      const lines = wrap(text, maxWidth);
      if (lines.length * (size * 0.5) <= maxHeight) return { lines, size };
    }
    const size = sizes[sizes.length - 1];
    doc.setFontSize(size);
    return { lines: wrap(text, maxWidth), size };
  };

  let firstPage = true;

  game.rounds.forEach((round) => {
    round.questions.forEach((q) => {
      // ===== ЛИЦЕВАЯ СТОРОНА: ВОПРОС =====
      if (!firstPage) doc.addPage();
      firstPage = false;

      drawFrame();

      doc.setTextColor(107, 33, 168);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(round.title, W / 2, 22, { align: 'center' });

      doc.setTextColor(120, 113, 108);
      doc.setFontSize(10);
      doc.text('ВОПРОС', W / 2, 32, { align: 'center' });

      doc.setTextColor(31, 41, 55);
      const { lines, size } = fitLines(q.text, W - 50, H - 80, [22, 18, 16, 14, 12, 10]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(size);
      const lineH = size * 0.5;
      const startY = H / 2 - ((lines.length - 1) * lineH) / 2;
      lines.forEach((line, i) => {
        doc.text(line, W / 2, startY + i * lineH, { align: 'center' });
      });

      doc.setTextColor(156, 163, 175);
      doc.setFontSize(9);
      doc.text(`${game.title} · карточка игрока`, W / 2, H - 14, { align: 'center' });

      // ===== ОБОРОТ: БАЛЛЫ + ОТВЕТ =====
      doc.addPage();
      drawFrame();

      doc.setTextColor(107, 33, 168);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(round.title, W / 2, 22, { align: 'center' });

      doc.setTextColor(124, 58, 237);
      doc.setFontSize(60);
      doc.text(String(q.points), W / 2, H / 2 - 10, { align: 'center' });
      doc.setFontSize(12);
      doc.text('БАЛЛОВ', W / 2, H / 2 + 2, { align: 'center' });

      if (q.answer.trim()) {
        doc.setTextColor(31, 41, 55);
        doc.setFontSize(12);
        const ansLines = wrap(`Ответ: ${q.answer}`, W - 50);
        ansLines.forEach((line, i) => {
          doc.text(line, W / 2, H / 2 + 20 + i * 6, { align: 'center' });
        });
      }

      doc.setTextColor(156, 163, 175);
      doc.setFontSize(9);
      doc.text('Оборот: баллы и ответ — для ведущего', W / 2, H - 14, { align: 'center' });
    });
  });

  doc.save(sanitizeFileName(`игра_${game.title}_карточки.pdf`));
}
