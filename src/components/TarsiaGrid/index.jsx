import React from 'react'
import Triangle from '../Triangle'
import { getGridDimensions, isTriangleInGrid } from '../../utils/grid'

const TarsiaGrid = ({ 
  gridName, 
  grid, 
  questions, 
  side = 100,
  onTriangleClick,
  isPrintable = false
}) => {
  const { rows, cols } = getGridDimensions(gridName)
  const height = (Math.sqrt(3) / 2) * side
  
  const width = (cols + 1) * (side / 2) + side
  const totalHeight = rows * height + height

  return (
    <svg
      width={width}
      height={totalHeight}
      viewBox={`0 0 ${width} ${totalHeight}`}
      style={{ 
        maxWidth: '100%', 
        height: 'auto',
        display: 'block',
        margin: '0 auto'
      }}
    >
      {grid.map((triangle, idx) => {
        if (!isTriangleInGrid(grid, triangle.location.row, triangle.location.col)) {
          return null
        }
        
        return (
          <Triangle
            key={`${triangle.location.row}-${triangle.location.col}`}
            location={triangle.location}
            values={triangle.values}
            side={side}
            questions={questions}
            onClick={onTriangleClick ? () => onTriangleClick(idx) : undefined}
            isPrintable={isPrintable}
          />
        )
      })}
    </svg>
  )
}

export default TarsiaGrid
