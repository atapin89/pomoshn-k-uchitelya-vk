import React from 'react'
import TarsiaGrid from '../TarsiaGrid'

const PreviewSvgDiv = ({ gridName, grid, questions }) => {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-purple-700">Предпросмотр</h3>
        <span className="text-xs text-gray-500">
          {grid.length} треугольников
        </span>
      </div>
      <div className="border-2 border-purple-100 rounded-xl p-4 bg-purple-50/30">
        <TarsiaGrid 
          gridName={gridName}
          grid={grid}
          questions={questions}
          side={80}
          isPrintable={false}
        />
      </div>
    </div>
  )
}

export default PreviewSvgDiv
