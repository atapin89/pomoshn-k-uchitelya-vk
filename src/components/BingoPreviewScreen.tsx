import { useState } from 'react';
import { Download, FileText, Monitor, RotateCcw, Grid3x3 } from 'lucide-react';
import type { BingoCard, BingoGame } from '@/types/bingo';
import { GRID_SIZES } from '@/types/bingo';
import { resetCard, toggleCell } from '@/lib/bingoGenerator';
import { exportBingoCardsToPDF, exportCallListToPDF, type CardsPerPage } from '@/lib/bingoExport';
import BackButton from './BackButton';

interface BingoPreviewScreenProps {
  game: BingoGame;
  onBack: () => void;
  onProjector: () => void;
  onCardsChange: (cards: BingoCard[]) => void;
}

export default function BingoPreviewScreen({
  game,
  onBack,
  onProjector,
  onCardsChange,
}: BingoPreviewScreenProps) {
  const [perPage, setPerPage] = useState<CardsPerPage>(2);
  const { cols } = GRID_SIZES[game.config.gridSize];
  const cards = game.cards;

  return (
    <div className="min-h-[100dvh] notebook-bg flex flex-col">
      {/* 🆕 ЕДИНАЯ ШАПКА: кнопка → название → иконка в одну линию */}
      <header className="bg-purple-700 shadow-md sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton onClick={onBack} variant="light" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Просмотр карточек</h1>
          </div>
          <Monitor className="w-6 h-6 text-white/70 shrink-0" />
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 space-y-4 overflow-y-auto pb-8">
        {/* 🆕 Информационная плашка с названием игры и количеством карточек */}
        <div className="bg-white rounded-2xl shadow-sm p-3 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500">Игра</p>
            <p className="text-sm font-bold text-purple-700 truncate">{game.config.name}</p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs text-gray-500">Карточек</p>
              <p className="text-sm font-bold text-purple-700">{cards.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
              <Grid3x3 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Управление PDF и проектором */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-purple-700">Карточек на листе A4:</span>
            <div className="flex gap-1.5">
              {([1, 2, 4] as CardsPerPage[]).map((n) => (
                <button
                  key={n}
                  onClick={() => setPerPage(n)}
                  className={`w-10 h-10 rounded-xl font-bold text-sm transition-colors ${
                    perPage === n ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => exportBingoCardsToPDF(cards, game.config, perPage)}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Download className="w-5 h-5" /> Карточки PDF
            </button>
            <button
              onClick={() => exportCallListToPDF(game.words, game.config)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <FileText className="w-5 h-5" /> Список PDF
            </button>
          </div>
          <button
            onClick={onProjector}
            className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Monitor className="w-5 h-5" /> Режим проектора (для ведущего)
          </button>
          <p className="text-xs text-gray-500 text-center">
            Нажимайте на клетки, чтобы отметить. PDF удобнее скачивать на компьютере.
          </p>
        </div>

        {/* Карточки */}
        {cards.map((card, idx) => (
          <div key={card.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-purple-700">Карточка {idx + 1}</h3>
              <button
                onClick={() => onCardsChange(resetCard(cards, card.id))}
                className="text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg p-2 transition-colors"
                aria-label="Сбросить отметки"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {card.cells.map((cell, cellIdx) => (
                <button
                  key={cellIdx}
                  onClick={() => onCardsChange(toggleCell(cards, card.id, cellIdx))}
                  className={`aspect-square rounded-lg p-0.5 flex items-center justify-center text-center text-[10px] font-semibold leading-tight break-words transition-all ${
                    card.markedCells[cellIdx]
                      ? 'bg-purple-600 text-white'
                      : cell === null
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-50 text-gray-700 border border-purple-100'
                  }`}
                >
                  {cell === null ? 'FREE' : cell}
                </button>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
