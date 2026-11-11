import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { gsap } from '../lib/scroll'
import { fx, prefersReducedMotion } from '../lib/fx'
import { bell, slide } from '../lib/sound'

type Props = {
  /** The hero scene behind the gate: zoomed from close up to its resting frame as the gate opens. */
  zoomTarget: RefObject<HTMLElement | null>
  onOpening: () => void
  onDone: () => void
}

/** One sliding shoji panel. `side` mirrors the details so the pull handles meet in the middle. */
function GatePanel({ side }: { side: 'left' | 'right' }) {
  const id = `p-${side}`
  const inner = side === 'left' ? '93%' : '7%'
  return (
    <svg className="gate-panel__svg" width="100%" height="100%" aria-hidden="true">
      <defs>
        {/* Wood grain from turbulence, coloured dark walnut. */}
        <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.42" numOctaves="3" seed={side === 'left' ? 3 : 9} />
          <feColorMatrix
            values="0 0 0 0 0.16
                    0 0 0 0 0.075
                    0 0 0 0 0.045
                    0 0 0 -1.1 1.05"
          />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <radialGradient id={`${id}-paper`} cx={side === 'left' ? '100%' : '0%'} cy="45%" r="110%">
          <stop offset="0" stopColor="#ffb07a" />
          <stop offset="0.25" stopColor="#ff6a45" />
          <stop offset="0.6" stopColor="#c0152d" />
          <stop offset="1" stopColor="#4c000e" />
        </radialGradient>
        {/* Kumiko lattice: a check grid with heavier bars every second cell. */}
        <pattern id={`${id}-kumiko`} width="112" height="112" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="7" height="112" fill="#1e0d07" />
          <rect x="0" y="0" width="112" height="7" fill="#1e0d07" />
          <rect x="54" y="0" width="3.5" height="112" fill="#2a130b" />
          <rect x="0" y="54" width="112" height="3.5" fill="#2a130b" />
        </pattern>
        {/* A denser band of diamond (hishi) kumiko across the panel. */}
        <pattern id={`${id}-hishi`} width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M 14 0 L 28 14 L 14 28 L 0 14 Z" fill="none" stroke="#24100a" strokeWidth="2.6" />
          <path d="M 14 7 L 21 14 L 14 21 L 7 14 Z" fill="none" stroke="#24100a" strokeWidth="1.4" />
        </pattern>
        <pattern id={`${id}-boards`} width="46" height="10" patternUnits="userSpaceOnUse">
          <rect width="46" height="10" fill="#2a140b" />
          <rect x="44" width="2" height="10" fill="#0e0604" />
        </pattern>
        <linearGradient id={`${id}-edge`} x1={side === 'left' ? '1' : '0'} x2={side === 'left' ? '0' : '1'}>
          <stop offset="0" stopColor="#000" stopOpacity="0.75" />
          <stop offset="0.12" stopColor="#000" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Frame. */}
      <rect width="100%" height="100%" fill="#2d160c" />
      <rect width="100%" height="100%" fill="#000" filter={`url(#${id}-grain)`} opacity="0.85" />

      {/* Back-lit paper with the lattice over it. */}
      <rect className="gate-paper" x="7%" y="6%" width="86%" height="60%" fill={`url(#${id}-paper)`} />
      <rect x="7%" y="6%" width="86%" height="60%" fill={`url(#${id}-kumiko)`} />
      <rect x="7%" y="38%" width="86%" height="7%" fill={`url(#${id}-hishi)`} />
      <rect x="7%" y="37.4%" width="86%" height="0.8%" fill="#1e0d07" />
      <rect x="7%" y="44.8%" width="86%" height="0.8%" fill="#1e0d07" />

      {/* Rails and the lower wooden board panel. */}
      <rect x="0" y="66%" width="100%" height="4%" fill="#3a1d10" />
      <rect x="7%" y="70%" width="86%" height="24%" fill={`url(#${id}-boards)`} />
      <rect x="7%" y="70%" width="86%" height="24%" fill="#000" filter={`url(#${id}-grain)`} opacity="0.5" />
      <rect x="0" y="94%" width="100%" height="6%" fill="#24110a" />
      <rect x="0" y="0" width="100%" height="6%" fill="#24110a" />

      {/* Pull handle (hikite) by the meeting edge. */}
      <g transform={`translate(0 0)`}>
        <rect x={side === 'left' ? '89%' : '7.6%'} y="47%" width="3.4%" height="9%" rx="12" fill="#0c0503" stroke="#b08a4a" strokeWidth="2" />
      </g>

      {/* Hanko seal on the right panel. */}
      {side === 'right' && (
        <g>
          <rect x="62%" y="74%" width="56" height="56" fill="#b00020" opacity="0.92" />
          <text x="62%" y="74%" dx="28" dy="41" textAnchor="middle" fontFamily="Yuji Syuku, serif" fontSize="36" fill="#f5f0ea">
            侍
          </text>
        </g>
      )}

      {/* Shadow along the meeting edge for depth. */}
      <rect width="100%" height="100%" fill={`url(#${id}-edge)`} />
      <rect x={inner} y="0" width="0.6%" height="100%" fill="#0a0403" opacity="0.8" />
    </svg>
  )
}

/** Swirling auspicious cloud, gold with a crimson outline (from the reference's corners). */
function Cloud({ flip }: { flip?: boolean }) {
  return (
    <svg className={`gate-cloud ${flip ? 'gate-cloud--flip' : ''}`} viewBox="0 0 320 170" aria-hidden="true">
      <path
        d="M 20 150 C 0 110 30 70 70 78 C 72 40 120 20 150 46 C 170 10 240 14 250 62 C 290 56 316 90 300 122 C 330 140 290 166 260 150 Z"
        fill="#e9d2a6"
        stroke="#9a0f22"
        strokeWidth="8"
      />
      <g fill="none" stroke="#9a0f22" strokeWidth="6" strokeLinecap="round">
        <path d="M 70 120 C 60 100 84 88 96 100 C 106 112 90 124 82 116" />
        <path d="M 160 96 C 150 70 186 60 196 82 C 204 100 180 108 174 96" />
        <path d="M 240 110 C 236 92 262 88 266 104" />
      </g>
      <path d="M 260 150 C 280 150 300 146 318 132" fill="none" stroke="#e9d2a6" strokeWidth="10" strokeLinecap="round" />
    </svg>
  )
}

function Lantern({ side }: { side: 'left' | 'right' }) {
  return (
    <svg className={`gate-lantern gate-lantern--${side}`} viewBox="0 0 120 260" aria-hidden="true">
      <line x1="60" y1="0" x2="60" y2="40" stroke="#1a0b06" strokeWidth="4" />
      <path d="M 18 40 H 102 L 92 56 H 28 Z" fill="#1a0b06" />
      <rect className="gate-lantern__light" x="26" y="56" width="68" height="150" fill="#ffc46b" />
      <g stroke="#3a1a0c" strokeWidth="5">
        <line x1="26" y1="56" x2="26" y2="206" />
        <line x1="94" y1="56" x2="94" y2="206" />
        <line x1="60" y1="56" x2="60" y2="206" strokeWidth="2.5" />
        <line x1="26" y1="106" x2="94" y2="106" strokeWidth="2.5" />
        <line x1="26" y1="156" x2="94" y2="156" strokeWidth="2.5" />
      </g>
      <path d="M 22 206 H 98 L 106 222 H 14 Z" fill="#1a0b06" />
      <path d="M 52 222 h 16 l -4 30 h -8 z" fill="#b00020" />
    </svg>
  )
}

export function JapaneseGate({ zoomTarget, onOpening, onDone }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)
  const cbs = useRef({ onOpening, onDone })
  cbs.current = { onOpening, onDone }

  useLayoutEffect(() => {
    const el = root.current!
    const q = gsap.utils.selector(el)
    const zoom = zoomTarget.current
    const reduced = prefersReducedMotion()

    const ctx = gsap.context(() => {
      const t = gsap.timeline({
        paused: true,
        defaults: { ease: 'power2.out' },
        onComplete: () => cbs.current.onDone(),
      })
      tl.current = t
      if (import.meta.env.DEV) (window as unknown as { __gate: gsap.core.Timeline }).__gate = t

      if (zoom) gsap.set(zoom, { scale: reduced ? 1 : 1.55, filter: reduced ? 'none' : 'blur(10px) brightness(0.5)', transformOrigin: '50% 45%' })

      if (reduced) {
        t.call(() => cbs.current.onOpening())
        t.to(el, { opacity: 0, duration: 0.8 })
        return
      }


      t.to(q('.gate-blackout'), { opacity: 0, duration: 0.8, ease: 'power1.inOut' })
        .from(q('.gate-stage'), { scale: 1.06, duration: 1.4, ease: 'power2.out' }, 0)
        // The light behind the gate swells and leaks through the seam.
        .to(q('.gate-seam'), { opacity: 1, scaleX: 3, duration: 0.5, ease: 'power2.in' }, 0.85)
        .to(q('.gate-paper'), { opacity: 1, duration: 0.5 }, 0.85)
        .call(() => bell(0.16), [], 0.9)
        .addLabel('open', 1.3)
        .call(() => {
          slide(2.2)
          cbs.current.onOpening()
        }, [], 'open')
        .to(q('.gate-panel--left'), { xPercent: -104, rotationY: 9, duration: 2.3, ease: 'power3.inOut' }, 'open')
        .to(q('.gate-panel--right'), { xPercent: 104, rotationY: -9, duration: 2.3, ease: 'power3.inOut' }, 'open')
        .to(q('.gate-panel__shade'), { opacity: 0.55, duration: 2.3, ease: 'power1.in' }, 'open')
        .to(q('.gate-seam'), { opacity: 0, scaleX: 40, duration: 1, ease: 'power2.out' }, 'open+=0.2')
        .to(q('.gate-backlight'), { opacity: 0, duration: 1.8, ease: 'power1.in' }, 'open+=0.4')
        // The camera pushes through the gateway: architecture rushes past while the hero settles into frame.
        .to(q('.gate-architecture'), { scale: 1.9, opacity: 0, duration: 2.5, ease: 'power2.in' }, 'open+=0.15')
        .call(() => {
          fx.burst({ x: window.innerWidth / 2, y: window.innerHeight * 0.5, kind: 'petals', count: 70, power: 1.4 })
        }, [], 'open+=0.35')

      if (zoom) {
        t.to(zoom, { scale: 1, filter: 'blur(0px) brightness(1)', duration: 2.8, ease: 'power2.out' }, 'open+=0.1')
      }
      t.to(el, { opacity: 0, duration: 0.4, ease: 'none' }, 'open+=2.4')
    }, el)

    // Start once the fonts are in (or after 1.5 s at most), so the opening never plays to a half-loaded page.
    let isLive = true
    Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]).then(() => {
      const isHeld = import.meta.env.DEV && new URLSearchParams(location.search).has('holdgate')
      if (isLive && !isHeld) tl.current?.play()
    })

    return () => {
      isLive = false
      ctx.revert()
    }
  }, [zoomTarget])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const skip = () => {
    const t = tl.current
    if (t && t.progress() < 1) t.progress(1)
  }

  return (
    <div ref={root} className="gate" role="dialog" aria-label="Intro: the gate opens">
      <div className="gate-backlight" />
      <div className="gate-stage">
        <div className="gate-panels">
          <div className="gate-panel gate-panel--left">
            <GatePanel side="left" />
            <div className="gate-panel__shade" />
          </div>
          <div className="gate-panel gate-panel--right">
            <GatePanel side="right" />
            <div className="gate-panel__shade" />
          </div>
          <div className="gate-seam" />
        </div>
        <div className="gate-architecture">
          <div className="gate-beam">
            <div className="gate-roof" />
          </div>
          <Lantern side="left" />
          <Lantern side="right" />
          <div className="gate-floor" />
          <Cloud />
          <Cloud flip />
          <div className="gate-fog" />
        </div>
      </div>
      <div className="gate-blackout" />
      <button className="skip-intro" onClick={skip}>
        Skip intro <span aria-hidden="true">→</span>
      </button>
    </div>
  )
}
