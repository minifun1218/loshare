export const ZINE_WORDS = [
  { label: 'ON-THE-MOVE', tag: '01' },
  { label: 'OFF-THE-GRID', tag: '02' },
  { label: 'REAL-TIME PIN', tag: '03' },
  { label: 'STREET TEAM', tag: '04' },
  { label: 'LIVE COORDS', tag: '05' },
  { label: 'LOST & FOUND', tag: '06' },
]

export const MINIMAL_WORDS = [
  { label: '10:42 · TUE NOV 19', tag: 'live' },
  { label: '47.3° N · 8.5° E', tag: 'fix' },
  { label: '47 PALS · 12 MAPS', tag: 'crew' },
  { label: 'WALK 6 KM/H', tag: 'pace' },
  { label: 'ETA 18 MIN', tag: 'route' },
]

export const GLASS_WORDS = [
  { label: 'Pin · Live', tag: '01' },
  { label: 'Crew · Sync', tag: '02' },
  { label: 'Map · Drift', tag: '03' },
  { label: 'Locate · Now', tag: '04' },
  { label: 'Share · Light', tag: '05' },
]

export const EDITORIAL_WORDS = [
  { label: 'Volume 01', tag: 'Issue' },
  { label: 'Cartography & Companions', tag: 'Feature' },
  { label: 'On Being Lost Together', tag: 'Essay' },
  { label: 'The Quiet Map', tag: 'Field' },
  { label: 'Coordinates of Care', tag: 'Notes' },
]

export const MARQUEE_WORDS_BY_THEME = {
  zine: ZINE_WORDS,
  minimal: MINIMAL_WORDS,
  glass: GLASS_WORDS,
  editorial: EDITORIAL_WORDS,
}

export function getThemeMarqueeWords(theme) {
  return MARQUEE_WORDS_BY_THEME[theme] || ZINE_WORDS
}