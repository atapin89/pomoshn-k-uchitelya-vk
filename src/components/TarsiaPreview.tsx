import { TARSIA_CONFIG } from '@/types/tarsia';
import { TARSIA_GRIDS } from '@/data/tarsiaGrids';
import type { TarsiaGridConfig } from '@/types/tarsia';

interface TarsiaPreviewProps {
  gridId: string;
  questions: Record<number, string[]>;
  answers: Record<number, string[]>;
}

export default function TarsiaPreview({ gridId, questions, answers }: TarsiaPreviewProps) {
  const grid = TARSIA_GRIDS.find((g) => g.id === gridId);
  if (!grid) return <div className="text-gray-400 text-center py-8">Сетка не найдена</div>;

  const { triangle } = TARSIA_CONFIG;
  const scale = 0.3; // уменьшаем для превью
  const scaledSide = triangle.side * scale;
  const scaledHeight = triangle.height * scale;

  // Вычисляем размеры SVG
  const maxRow = Math.max(...grid.triangles.map((t) => t.row));
  const maxCol = Math.max(...grid.triangles.map((t) => t.col));
  const svgWidth = (maxCol + 1) * scaledSide;
  const svgHeight = (maxRow + 1) * scaledHeight;

  const getTriangleText = (valueCode: string | null): string[] => {
    if (!valueCode) return [];
    
    const match = valueCode.match(/^(\d+)([qa])$/);
    if (!match) return [valueCode];
    
    const num = parseInt(match[1]);
    const type = match[2];
    const data = type === 'q' ? questions[num] : answers[num];
    return data || [];
  };

  const renderText = (
    lines: string[],
    centerX: number,
    centerY: number,
    rotation: number,
  ) => {
    if (lines.length === 0) return null;
    
    const fontSize = triangle.text.style.fontSize * scale;
    const lineHeight = triangle.text.yHeightStep * scale;
    
    return (
      <g transform={`rotate(${rotation} ${centerX} ${centerY})`}>
        {lines.map((line, idx) => (
          <text
            key={idx}
            x={centerX}
            y={centerY - (lines.length - 1) * lineHeight / 2 + idx * lineHeight}
            textAnchor="middle"
            fontSize={fontSize}
            fontFamily={triangle.text.style.fontFamily}
            fill={triangle.text.style.fill}
          >
            {line}
          </text>
        ))}
      </g>
    );
  };

  const renderTriangle = (tri: typeof grid.triangles[0], index: number) => {
    const orientation = (tri.row + tri.col) % 2 === 0 ? 'up' : 'down';
    const x = (tri.col - 1) * scaledSide / 2;
    const y = (tri.row - 1) * scaledHeight;
    
    const points = orientation === 'down'
      ? `${x},${y} ${x + scaledSide},${y} ${x + scaledSide / 2},${y + scaledHeight}`
      : `${x + scaledSide / 2},${y} ${x + scaledSide},${y + scaledHeight} ${x},${y + scaledHeight}`;
    
    const centerX = x + scaledSide / 2;
    const centerY = y + scaledHeight / 2;
    
    const text0 = getTriangleText(tri.values[0]);
    const text1 = getTriangleText(tri.values[1]);
    const text2 = getTriangleText(tri.values[2]);
    
    return (
      <g key={index}>
        <polygon
          points={points}
          fill={triangle.style.fill}
          stroke={triangle.style.stroke}
          strokeWidth={triangle.style.strokeWidth * scale}
        />
        {renderText(text0, centerX, centerY - scaledHeight / 4, 0)}
        {renderText(text1, centerX - scaledSide / 4, centerY + scaledHeight / 4, 60)}
        {renderText(text2, centerX + scaledSide / 4, centerY + scaledHeight / 4, -60)}
      </g>
    );
  };

  return (
    <div className="bg-gray-50 border-2 border-purple-200 rounded-xl p-4 overflow-x-auto">
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="mx-auto"
      >
        {grid.triangles.map(renderTriangle)}
      </svg>
    </div>
  );
}
