export interface Theme {
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
    triangleFill: string
    triangleStroke: string
    textOnTriangle: string
  }
  fonts: {
    main: string
    triangleText: string
  }
  sizes: {
    triangle: number
    fontSize: number
    padding: number
  }
}

export const defaultTheme: Theme = {
  colors: {
    primary: '#7c3aed',
    secondary: '#a78bfa',
    accent: '#fbbf24',
    background: '#faf5ff',
    text: '#1f2937',
    triangleFill: '#faf5ff',
    triangleStroke: '#7c3aed',
    textOnTriangle: '#4c1d95',
  },
  fonts: {
    main: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    triangleText: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  sizes: {
    triangle: 100,
    fontSize: 12,
    padding: 30,
  },
}

export const printTheme: Theme = {
  ...defaultTheme,
  colors: {
    ...defaultTheme.colors,
    background: '#ffffff',
    triangleFill: '#ffffff',
  },
}
