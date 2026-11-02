// Hex values for canvas and Web Animations, which can't read CSS variables cheaply.
// Keep in sync with src/styles/tokens.css.

export const PALETTE = {
  night: '#090e1d',
  panel: '#0f1830',
  cyan: '#44efec',
  cobalt: '#0040e0',
  codeGreen: '#02ff18',
  white: '#ffffff',
  muted: '#9fb0d6',
  alarm: '#ff2d4a',
  warn: '#ffb020',
  /** the calmer orange after Power Restored */
  amber: '#ff9a52',
} as const

/** Stage grades (§5.1), same as the --grade-* tokens. */
export const GRADE_COLOUR = {
  perfect: '#02ff18',
  good: '#b8f53d',
  pass: '#ff8c1a',
  fail: '#ff2d4a',
} as const
