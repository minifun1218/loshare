import { useEffect, useRef } from 'react'

const RED_RATE = 0.18
const DOT = 6
const LINK_DIST = 130
const SPAWN_MARGIN = 40

function rand(min, max) {
  return Math.random() * (max - min) + min
}

export default function ZineParticles({ count = 46, className = '' }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const parent = canvas.parentElement

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const readColors = () => {
      const styles = getComputedStyle(document.documentElement)
      return {
        ink: styles.getPropertyValue('--color-ink').trim() || '#17150f',
        red: styles.getPropertyValue('--color-red').trim() || '#ff4d1c',
        paper: styles.getPropertyValue('--color-paper').trim() || '#eae4d3',
      }
    }

    let colors = readColors()

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = parent
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const nodes = []
    const spawn = (w, h) => ({
      x: rand(-SPAWN_MARGIN, w + SPAWN_MARGIN),
      y: rand(-SPAWN_MARGIN, h + SPAWN_MARGIN),
      vx: rand(-0.18, 0.18),
      vy: rand(-0.18, 0.18),
      hot: Math.random() < RED_RATE,
    })

    const init = () => {
      const { clientWidth: w, clientHeight: h } = parent
      nodes.length = 0
      for (let i = 0; i < count; i++) nodes.push(spawn(w, h))
    }

    let raf = 0
    const tick = () => {
      const { clientWidth: w, clientHeight: h } = parent
      ctx.clearRect(0, 0, w, h)

      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy
        if (n.x < -SPAWN_MARGIN) n.x = w + SPAWN_MARGIN
        if (n.x > w + SPAWN_MARGIN) n.x = -SPAWN_MARGIN
        if (n.y < -SPAWN_MARGIN) n.y = h + SPAWN_MARGIN
        if (n.y > h + SPAWN_MARGIN) n.y = -SPAWN_MARGIN
      }

      ctx.strokeStyle = colors.ink
      ctx.globalAlpha = 0.22
      ctx.lineWidth = 1
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d = Math.hypot(dx, dy)
          if (d < LINK_DIST) {
            ctx.globalAlpha = 0.22 * (1 - d / LINK_DIST)
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }
      ctx.globalAlpha = 1

      for (const n of nodes) {
        ctx.fillStyle = n.hot ? colors.red : colors.ink
        ctx.fillRect(n.x - DOT / 2, n.y - DOT / 2, DOT, DOT)
      }

      if (!reduce) raf = requestAnimationFrame(tick)
    }

    resize()
    init()
    if (reduce) {
      tick()
    } else {
      raf = requestAnimationFrame(tick)
    }

    const onResize = () => {
      resize()
      init()
    }
    window.addEventListener('resize', onResize)

    const themeObserver = new MutationObserver(() => {
      colors = readColors()
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    })

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      themeObserver.disconnect()
    }
  }, [count])

  return <canvas ref={ref} className={`zine-particles ${className}`} aria-hidden="true" />
}