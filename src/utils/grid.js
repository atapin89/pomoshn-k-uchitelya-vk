import grids from '../data/grids'

export const getTriangle = (grid, row, col) => {
  return grid.find((t) => t.location.row === row && t.location.col === col)
}

export const getGridDimensions = (gridName) => {
  const grid = grids[gridName]
  if (!grid) return { rows: 0, cols: 0 }
  
  const rows = Math.max(...grid.map((t) => t.location.row))
  const cols = Math.max(...grid.map((t) => t.location.col))
  
  return { rows, cols }
}

export const isTriangleInGrid = (grid, row, col) => {
  return grid.some((t) => t.location.row === row && t.location.col === col)
}

export const getTrianglesForGrid = (gridName) => {
  return grids[gridName] || []
}

export const getGridNames = () => {
  return Object.keys(grids)
}
