import React, { useRef } from 'react'
import TarsiaGrid from '../TarsiaGrid'
import { exportToPDF } from '../../utils/saveLoadExport'

const PrintableSvgDiv = ({ gridName, grid, questions, title, isSolution }) => {
  const containerRef = useRef(null)

  const handleExportPDF = async () => {
    if (!containerRef.current) return
    
    const svg = containerRef.current.querySelector('svg')
    if (!svg) return

    // Создаём canvas из SVG
    const canvas = document.createElement('canvas')
    const scale = 2
    const rect = svg.getBoundingClientRect()
    canvas.width = rect.width * scale
    canvas.height = rect.height * scale
    const ctx = canvas.getContext('2d')
    ctx.scale(scale, scale)
    
    // Рисуем белый фон
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Конвертируем SVG в строку и рисуем на canvas
    const svgData = new XMLSerializer().serializeToString(svg)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)
    const img = new Image()
    
    img.onload = async () => {
      ctx.drawImage(img, 0, 0, rect.width, rect.height)
      URL.revokeObjectURL(svgUrl)
      
      const filename = isSolution 
        ? `${title}_решение.pdf` 
        : `${title}_вырезалка.pdf`
      await exportToPDF(canvas, filename)
    }
    
    img.src = svgUrl
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-purple-700">
          {isSolution ? 'Решение' : 'Вырезалка'}
        </h3>
        <button
          onClick={handleExportPDF}
          className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          📄 PDF
        </button>
      </div>
      <div ref={containerRef} className="border-2 border-gray-200 rounded-xl p-4 bg-gray-50">
        <TarsiaGrid 
          gridName={gridName}
          grid={grid}
          questions={questions}
          side={isSolution ? 90 : 70}
          isPrintable={true}
        />
      </div>
    </div>
  )
}

export default PrintableSvgDiv
