import { useEffect, useRef } from 'react'
import { fx, prefersReducedMotion, type BurstOptions } from '../lib/fx'

type Petal = {
  x: number; y: number; vx: number; vy: number
  size: number; rot: number; vrot: number
  flip: number; vflip: number; sway: number; phase: number
  color: string; life: number; isBurst: boolean
}
type Mote = { x: number; y: number; r: number; vx: number; vy: number; a: number; phase: number }
type Ember = { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; hot: boolean }

const PETAL_COLORS = ['#f3d9dc', '#e9b9c1', '#d88d9b', '#c0495e', '#f5f0ea']

/**
 * One fixed canvas for everything airborne: sakura petals, floating dust and
 * the ember/petal bursts other components request through `fx.burst`.
 */
export function Atmosphere({ isActive }: { isActive: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const activeRef = useRef(isActive)
  activeRef.current = isActive

  useEffect(() => {
    const canvas = ref.current!
    const g = canvas.getContext('2d')!
    const reduced = prefersReducedMotion()
    let w = 0, h = 0, dpr = 1
    const petals: Petal[] = []
    const motes: Mote[] = []
    const embers: Ember[] = []
    let raf = 0
    let last = performance.now()

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const ambientTarget = () => (w < 700 ? 22 : 42) * (reduced ? 0.3 : 1)

    const makePetal = (x: number, y: number, isBurst = false): Petal => ({
      x, y,
      vx: isBurst ? (Math.random() - 0.5) * 5 : 0.25 + Math.random() * 0.6,
      vy: isBurst ? (Math.random() - 0.5) * 3 : 0.45 + Math.random() * 0.8,
      size: 5 + Math.random() * 7,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.04,
      flip: Math.random() * Math.PI * 2,
      vflip: 0.02 + Math.random() * 0.04,
      sway: 0.4 + Math.random() * 0.9,
      phase: Math.random() * Math.PI * 2,
      color: PETAL_COLORS[(Math.random() * PETAL_COLORS.length) | 0]!,
      life: 1,
      isBurst,
    })

    for (let i = 0; i < 70; i++) {
      motes.push({
        x: Math.random() * w, y: Math.random() * h,
        r: 0.4 + Math.random() * 1.4,
        vx: (Math.random() - 0.5) * 0.12, vy: -0.05 - Math.random() * 0.15,
        a: 0.15 + Math.random() * 0.45, phase: Math.random() * 6,
      })
    }

    const off = fx.onBurst((o: BurstOptions) => {
      const n = o.count ?? 40
      const p = o.power ?? 1
      if (o.kind === 'petals') {
        for (let i = 0; i < n; i++) {
          const pt = makePetal(o.x + (Math.random() - 0.5) * 60, o.y + (Math.random() - 0.5) * h * 0.6, true)
          pt.vx *= p
          petals.push(pt)
        }
      } else {
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1
          const s = (2 + Math.random() * 9) * p
          const max = 50 + Math.random() * 70
          embers.push({
            x: o.x, y: o.y, vx: Math.cos(a) * s * 1.4, vy: Math.sin(a) * s,
            r: 0.8 + Math.random() * 2.4, life: max, max, hot: Math.random() < 0.25,
          })
        }
      }
    })

    const drawPetal = (p: Petal) => {
      g.save()
      g.translate(p.x, p.y)
      g.rotate(p.rot)
      g.scale(Math.cos(p.flip) * 0.9 + 0.1, 1)
      g.globalAlpha = Math.min(1, p.life) * 0.9
      g.fillStyle = p.color
      const s = p.size
      g.beginPath()
      g.moveTo(0, -s)
      g.bezierCurveTo(s * 0.9, -s * 0.8, s * 0.8, s * 0.5, 0, s)
      g.bezierCurveTo(-s * 0.8, s * 0.5, -s * 0.9, -s * 0.8, 0, -s)
      g.fill()
      // The notch at the tip of a sakura petal.
      g.globalCompositeOperation = 'destination-out'
      g.beginPath()
      g.moveTo(-s * 0.18, -s * 1.02)
      g.lineTo(0, -s * 0.72)
      g.lineTo(s * 0.18, -s * 1.02)
      g.fill()
      g.restore()
    }

    const tick = (now: number) => {
      const dt = Math.min(2.5, (now - last) / 16.67)
      last = now
      g.clearRect(0, 0, w, h)
      const t = now / 1000

      // Dust.
      g.globalCompositeOperation = 'lighter'
      for (const m of motes) {
        m.x += m.vx * dt + Math.sin(t * 0.3 + m.phase) * 0.08
        m.y += m.vy * dt
        if (m.y < -5) { m.y = h + 5; m.x = Math.random() * w }
        if (m.x < -5) m.x = w + 5
        if (m.x > w + 5) m.x = -5
        g.globalAlpha = m.a * (0.6 + 0.4 * Math.sin(t * 1.3 + m.phase))
        g.fillStyle = m.r > 1.2 ? '#ff6b7d' : '#f5f0ea'
        g.beginPath()
        g.arc(m.x, m.y, m.r, 0, Math.PI * 2)
        g.fill()
      }

      // Ambient petals spawn above the screen once the intro has opened.
      if (activeRef.current) {
        const ambient = petals.filter(p => !p.isBurst).length
        if (ambient < ambientTarget() && Math.random() < 0.35) {
          petals.push(makePetal(Math.random() * w * 1.2 - w * 0.2, -20))
        }
      }

      g.globalCompositeOperation = 'source-over'
      for (let i = petals.length - 1; i >= 0; i--) {
        const p = petals[i]!
        if (p.isBurst) {
          p.vx *= 0.985
          p.vy += (0.6 - p.vy) * 0.02
        }
        p.x += (p.vx + Math.sin(t * p.sway + p.phase) * 0.6) * dt
        p.y += p.vy * dt
        p.rot += p.vrot * dt
        p.flip += p.vflip * dt
        if (p.y > h + 30 || p.x > w + 60 || p.x < -80) {
          petals.splice(i, 1)
          continue
        }
        drawPetal(p)
      }

      // Embers.
      g.globalCompositeOperation = 'lighter'
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i]!
        e.vy += 0.14 * dt
        e.vx *= 0.97
        e.x += e.vx * dt
        e.y += e.vy * dt
        e.life -= dt
        if (e.life <= 0) {
          embers.splice(i, 1)
          continue
        }
        const k = e.life / e.max
        g.globalAlpha = k
        g.fillStyle = e.hot ? '#fff1ec' : '#ff2a45'
        g.shadowColor = '#b00020'
        g.shadowBlur = 10
        g.beginPath()
        g.arc(e.x, e.y, e.r * (0.5 + k), 0, Math.PI * 2)
        g.fill()
      }
      g.shadowBlur = 0
      g.globalAlpha = 1
      g.globalCompositeOperation = 'source-over'
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const onVis = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) {
        last = performance.now()
        raf = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      cancelAnimationFrame(raf)
      off()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return <canvas ref={ref} className="atmosphere" aria-hidden="true" />
}
