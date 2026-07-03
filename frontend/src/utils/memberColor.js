export const MEMBER_PALETTE = [
  { solid: '#ff4d1c', soft: '#eae4d3' },
  { solid: '#1c4dff', soft: '#eae4d3' },
  { solid: '#17150f', soft: '#eae4d3' },
  { solid: '#eae4d3', soft: '#17150f' },
  { solid: '#d6380f', soft: '#eae4d3' },
  { solid: '#0d3fd6', soft: '#eae4d3' },
  { solid: '#ff8a5c', soft: '#17150f' },
  { solid: '#a8b8ff', soft: '#17150f' },
]

export function memberColor(seed) {
  const idx = ((seed || 0) % MEMBER_PALETTE.length + MEMBER_PALETTE.length) % MEMBER_PALETTE.length
  return MEMBER_PALETTE[idx]
}