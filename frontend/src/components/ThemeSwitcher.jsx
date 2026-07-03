import { useState, useEffect, useRef } from 'react'

const THEMES = [
  { id: 'zine', label: 'Zine', desc: 'Brutalist · Indie magazine', colors: ['#eae4d3', '#17150f', '#ff4d1c'] },
  { id: 'minimal', label: 'Minimal', desc: 'Quiet · Whitespace first', colors: ['#fafafa', '#18181b', '#a1a1aa'] },
  { id: 'glass', label: 'Glass', desc: 'Translucent · Soft glow', colors: ['#eef2ff', '#3b82f6', '#06b6d4'] },
  { id: 'editorial', label: 'Editorial', desc: 'Serif · Print-class', colors: ['#faf7f2', '#2b2622', '#c8102e'] },
]

export default function ThemeSwitcher({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = THEMES.find(t => t.id === value) || THEMES[0]

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (id) => {
    onChange?.(id)
    setOpen(false)
  }

  return (
    <div ref={ref} className={`theme-switcher${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="theme-switcher__btn"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="切换主题"
        title="切换主题"
      >
        <span className="theme-switcher__btn-icon">
          <SwatchIcon colors={current.colors} />
        </span>
        <span className="theme-switcher__btn-label">{current.label}</span>
        <span className="theme-switcher__btn-chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="theme-switcher__menu" role="listbox" aria-label="选择主题">
          {THEMES.map((t) => {
            const active = t.id === value
            return (
              <button
                key={t.id}
                type="button"
                role="option"
                aria-selected={active}
                className={`theme-switcher__option${active ? ' is-active' : ''}`}
                onClick={() => pick(t.id)}
              >
                <span className="theme-switcher__swatch" aria-hidden="true">
                  {t.colors.map((c, i) => <span key={i} style={{ background: c }} />)}
                </span>
                <span className="theme-switcher__option-text">
                  <strong>{t.label}</strong>
                  <em>{t.desc}</em>
                </span>
                {active && (
                  <span className="theme-switcher__check" aria-hidden="true">
                    <CheckIcon />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SwatchIcon({ colors }) {
  return (
    <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
      <rect x="0" y="0" width="7" height="7" fill={colors[0]} />
      <rect x="7" y="0" width="7" height="7" fill={colors[1]} />
      <rect x="0" y="7" width="7" height="7" fill={colors[2]} />
      <rect x="7" y="7" width="7" height="7" fill={colors[1]} opacity="0.55" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 14 14" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M2 7l3 3 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" />
    </svg>
  )
}