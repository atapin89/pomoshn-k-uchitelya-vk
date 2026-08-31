import React from 'react'

const Triangle = ({ 
  location, 
  values, 
  side, 
  questions,
  onClick,
  isPrintable = false 
}) => {
  const { row, col } = location
  const height = (Math.sqrt(3) / 2) * side
  
  // Определяем ориентацию: чётная сумма → вершина вниз
  const isDown = (row + col) % 2 === 0
  
  // Координаты вершин
  const x = (col - 1) * (side / 2)
  const y = (row - 1) * height
  
  let points
  if (isDown) {
    points = `${x},${y} ${x + side},${y} ${x + side / 2},${y + height}`
  } else {
    points = `${x + side / 2},${y} ${x + side},${y + height} ${x},${y + height}`
  }

  // Центроид для позиционирования текста
  const centroidX = (x + (x + side) + (x + side / 2)) / 3
  const centroidY = (y + y + (y + height)) / 3

  // Функция для получения текста из кода
  const getText = (code) => {
    if (!code) return ''
    const match = code.match(/^(\d+)([qa])$/)
    if (!match) return ''
    const num = parseInt(match[1]) - 1
    const type = match[2]
    const question = questions[num]
    if (!question) return ''
    return type === 'q' ? question.left : question.right
  }

  // Позиционирование текста вдоль стороны
  const renderSideText = (start, end, text, idx) => {
    if (!text || text.trim() === '') return null
    
    const midX = (start[0] + end[0]) / 2
    const midY = (start[1] + end[1]) / 2
    const angle = Math.atan2(end[1] - start[1], end[0] - start[0]) * (180 / Math.PI)
    
    // Вектор внутрь треугольника
    const ix = centroidX - midX
    const iy = centroidY - midY
    const il = Math.sqrt(ix * ix + iy * iy) || 1
    const offsetX = (ix / il) * (side * 0.15)
    const offsetY = (iy / il) * (side * 0.15)

    // Нормализация угла (чтобы текст не был вверх ногами)
    let normalizedAngle = angle
    if (normalizedAngle > 90) normalizedAngle -= 180
    if (normalizedAngle < -90) normalizedAngle += 180

    // Ограничиваем длину текста
    const maxChars = Math.floor(side / 6)
    const displayText = text.length > maxChars ? text.slice(0, maxChars - 1) + '…' : text

    const fontSize = isPrintable ? Math.max(8, Math.floor(side * 0.1)) : Math.max(10, Math.floor(side * 0.12))

    return (
      <text
        key={idx}
        x={midX + offsetX}
        y={midY + offsetY}
        textAnchor="middle"
        dominantBaseline="middle"
        transform={`rotate(${normalizedAngle}, ${midX + offsetX}, ${midY + offsetY})`}
        fontSize={fontSize}
        fontWeight="600"
        fill={isPrintable ? '#4c1d95' : '#7c3aed'}
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {displayText}
      </text>
    )
  }

  const v0 = isDown ? [x, y] : [x + side / 2, y]
  const v1 = isDown ? [x + side, y] : [x + side, y + height]
  const v2 = isDown ? [x + side / 2, y + height] : [x, y + height]

  return (
    <g onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <polygon
        points={points}
        fill={isPrintable ? '#ffffff' : '#faf5ff'}
        stroke="#7c3aed"
        strokeWidth={isPrintable ? 1.5 : 2}
      />
      {renderSideText(v0, v1, getText(values[0]), 0)}
      {renderSideText(isDown ? v0 : v2, isDown ? v2 : v1, getText(values[1]), 1)}
      {renderSideText(isDown ? v1 : v0, v2, getText(values[2]), 2)}
    </g>
  )
}

export default Triangle
