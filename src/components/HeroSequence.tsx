import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { gsap, ScrollTrigger } from '../lib/scroll'
import { fx, prefersReducedMotion } from '../lib/fx'
import { impact as impactSound } from '../lib/sound'
import { AvatarCharacter, IMPACT_POINT, VIEW_H, VIEW_W, applyArmPose, type AvatarRig } from './AvatarCharacter'

// --- Rig ----------------------------------------------------------------------------
// Only the forearms, hands and sword move; the body layer is never transformed.

type Pose = { drive: number; tilt: number; glow: number; under: number }

const REST: Pose = { drive: 0, tilt: 0, glow: 0, under: 0.18 }
/** Where the blade meets the ground once planted, as a share of the avatar box. */
const IMPACT = { x: IMPACT_POINT[0] / VIEW_W, y: IMPACT_POINT[1] / VIEW_H }

function applyPose(rig: AvatarRig, p: Pose) {
  applyArmPose(rig, p)
  rig.bladeGlow.current?.setAttribute('opacity', String(p.glow))
  rig.underLight.current?.setAttribute('opacity', String(p.under))
}

const AVATAR_BASE = `${import.meta.env.BASE_URL}assets/avatar/`

// --- Procedural ground cracks ---------------------------------------------------

function makeCracks(seed: number) {
  let s = seed
  const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  const paths: { d: string; w: number }[] = []
  const arms = 14
  for (let i = 0; i < arms; i++) {
    const angle = (i / arms) * Math.PI * 2 + rand() * 0.3
    let x = 0
    let y = 0
    let d = 'M 0 0'
    const len = 120 + rand() * 260
    const steps = 6 + Math.floor(rand() * 4)
    for (let k = 0; k < steps; k++) {
      const a = angle + (rand() - 0.5) * 0.9
      const step = len / steps
      x += Math.cos(a) * step
      y += Math.sin(a) * step * 0.28 // flattened: the ground recedes in perspective
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`
      if (rand() < 0.3) {
        const ba = a + (rand() > 0.5 ? 0.8 : -0.8)
        const bl = step * (0.6 + rand())
        paths.push({ d: `M ${x.toFixed(1)} ${y.toFixed(1)} l ${(Math.cos(ba) * bl).toFixed(1)} ${(Math.sin(ba) * bl * 0.28).toFixed(1)}`, w: 1.4 })
      }
    }
    paths.push({ d, w: 2.8 - (len / 380) })
  }
  return paths
}

// --- Background pieces --------------------------------------------------------------

function Backdrop() {
  return (
    <svg className="backdrop" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="mtnFar" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#2a0a10" />
          <stop offset="1" stopColor="#120608" />
        </linearGradient>
      </defs>
      <path d="M0 640 L120 560 L210 600 L340 470 L470 590 L560 540 L700 620 L860 500 L980 590 L1100 520 L1240 600 L1380 480 L1500 570 L1600 530 L1600 900 L0 900 Z" fill="url(#mtnFar)" opacity="0.9" />
      {/* Pagoda silhouette on the right ridge. */}
      <g fill="#0d0507" transform="translate(1240 420)">
        <rect x="46" y="40" width="8" height="200" />
        <path d="M0 80 Q50 60 100 80 L86 86 Q50 74 14 86 Z" />
        <path d="M8 120 Q50 100 92 120 L80 126 Q50 114 20 126 Z" />
        <path d="M14 160 Q50 142 86 160 L76 166 Q50 154 24 166 Z" />
        <path d="M20 200 Q50 184 80 200 L72 206 Q50 196 28 206 Z" />
        <rect x="28" y="126" width="44" height="34" />
        <rect x="32" y="166" width="36" height="40" />
        <rect x="24" y="86" width="52" height="34" />
      </g>
      {/* Torii far away on the left. */}
      <g fill="#0f0507" transform="translate(300 520) scale(0.6)">
        <path d="M-20 0 Q80 -24 180 0 L176 14 Q80 -6 -16 14 Z" />
        <rect x="0" y="30" width="160" height="10" />
        <rect x="20" y="10" width="12" height="160" />
        <rect x="128" y="10" width="12" height="160" />
      </g>
      <path d="M0 720 L180 660 L320 700 L520 640 L700 700 L900 650 L1080 710 L1260 660 L1460 720 L1600 680 L1600 900 L0 900 Z" fill="#0b0405" />
    </svg>
  )
}

function SakuraTree() {
  const blossoms = useMemo(() => {
    let s = 77
    const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
    const clusters: [number, number][] = [[250, 120], [360, 80], [470, 140], [180, 220], [420, 230], [560, 200], [300, 260], [120, 150]]
    return clusters.flatMap(([cx, cy]) =>
      Array.from({ length: 70 }, () => {
        const a = rand() * Math.PI * 2
        const d = Math.sqrt(rand())
        const tone = rand()
        return {
          x: cx + Math.cos(a) * d * 80,
          y: cy + Math.sin(a) * d * 44,
          r: 2 + rand() * 4.5,
          c: tone > 0.55 ? '#5e0d1b' : tone > 0.2 ? '#9c1f35' : '#e3a7b1',
          o: 0.5 + rand() * 0.5,
        }
      }),
    )
  }, [])
  return (
    <svg className="sakura-tree" viewBox="0 0 640 900" aria-hidden="true">
      <defs>
        <filter id="canopyBlur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>
      <g fill="none" stroke="#0a0405" strokeLinecap="round">
        <path d="M 40 900 C 70 760 60 620 120 520 C 170 440 240 380 300 300" strokeWidth="34" />
        <path d="M 120 520 C 150 420 120 300 200 220" strokeWidth="18" />
        <path d="M 230 360 C 320 300 420 260 520 220" strokeWidth="14" />
        <path d="M 300 300 C 330 220 350 160 380 90" strokeWidth="12" />
        <path d="M 400 260 C 460 200 520 180 600 190" strokeWidth="8" />
        <path d="M 200 220 C 180 180 140 160 100 150" strokeWidth="8" />
      </g>
      {/* Dark canopies first, then individual blossoms over them. */}
      <g filter="url(#canopyBlur)" opacity="0.8">
        {[[250, 120], [360, 80], [470, 140], [180, 220], [420, 230], [560, 200], [300, 260], [120, 150]].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="78" ry="40" fill="#3c0610" />
        ))}
      </g>
      {blossoms.map((b, i) => (
        <circle key={i} cx={b.x} cy={b.y} r={b.r} fill={b.c} opacity={b.o} />
      ))}
    </svg>
  )
}

// --- The section ---------------------------------------------------------------------

type Props = { isIntroDone: boolean; zoomRef: RefObject<HTMLDivElement | null> }

export function HeroSequence({ isIntroDone, zoomRef }: Props) {
  const section = useRef<HTMLElement>(null)
  const rig: AvatarRig = {
    root: useRef(null),
    forearmL: useRef(null),
    forearmR: useRef(null),
    grip: useRef(null),
    irises: useRef(null),
    bladeGlow: useRef(null),
    underLight: useRef(null),
  }
  const rigRef = useRef(rig)
  const cracks = useMemo(() => makeCracks(1234), [])

  // Initial pose before anything animates.
  useLayoutEffect(() => {
    applyPose(rigRef.current, REST)
  }, [])

  // Title reveal once the gate has opened.
  useEffect(() => {
    if (!isIntroDone) return
    const el = section.current!
    const q = gsap.utils.selector(el)
    const ctx = gsap.context(() => {
      gsap.timeline()
        .fromTo(q('.title-line .ch'), { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.1, stagger: 0.035, ease: 'power4.out' })
        .fromTo(q('.welcome'), { opacity: 0, letterSpacing: '1.2em' }, { opacity: 1, letterSpacing: '0.55em', duration: 1.4, ease: 'power3.out' }, 0.1)
        .fromTo(q('.hero-copy > *'), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out' }, 0.6)
        .fromTo(q('.scroll-hint'), { opacity: 0 }, { opacity: 1, duration: 0.8 }, 1.2)
    }, el)
    return () => ctx.revert()
  }, [isIntroDone])

  // Mouse parallax: each [data-depth] layer drifts against the pointer.
  useEffect(() => {
    if (prefersReducedMotion() || window.matchMedia('(pointer: coarse)').matches) return
    const layers = Array.from(section.current!.querySelectorAll<HTMLElement>('[data-depth]'))
    const movers = layers.map(l => {
      const depth = Number(l.dataset.depth)
      return {
        depth,
        x: gsap.quickTo(l, 'x', { duration: 1.2, ease: 'power3.out' }),
        y: gsap.quickTo(l, 'y', { duration: 1.2, ease: 'power3.out' }),
      }
    })
    const onMove = (e: PointerEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5
      const ny = e.clientY / window.innerHeight - 0.5
      for (const m of movers) {
        m.x(-nx * m.depth * 60)
        m.y(-ny * m.depth * 30)
      }
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  // The katana sequence, scrubbed by scroll.
  useLayoutEffect(() => {
    const el = section.current!
    const q = gsap.utils.selector(el)
    const r = rigRef.current
    const pose: Pose = { ...REST }
    let hasImpacted = false

    const ctx = gsap.context(() => {
      const crackPaths = q<SVGPathElement>('.cracks path')
      crackPaths.forEach(p => {
        const len = p.getTotalLength()
        p.style.strokeDasharray = `${len}`
        p.style.strokeDashoffset = `${len}`
      })

      const strike = () => {
        const box = q<HTMLElement>('.impact-anchor')[0]?.getBoundingClientRect()
        const x = box ? box.left : window.innerWidth / 2
        const y = box ? box.top : window.innerHeight * 0.85
        impactSound()
        fx.burst({ x, y, kind: 'embers', count: 90, power: 1.2 })
        fx.burst({ x, y: y - window.innerHeight * 0.2, kind: 'petals', count: 30, power: 2.2 })
        gsap.fromTo(q('.flash'), { opacity: 0.95 }, { opacity: 0, duration: 0.7, ease: 'power2.out', overwrite: true })
        gsap.fromTo(
          q('.shake'),
          { x: 0, y: 0 },
          {
            keyframes: { x: [14, -12, 9, -7, 4, -2, 0], y: [-8, 10, -6, 5, -3, 1, 0] },
            duration: 0.55,
            ease: 'none',
            overwrite: true,
          },
        )
      }

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
          onUpdate: self => {
            // The strike plays once each time the scroll crosses the moment of contact going down.
            const p = self.progress
            if (!hasImpacted && p >= 0.725 && self.direction > 0) {
              hasImpacted = true
              strike()
            } else if (hasImpacted && p < 0.68) {
              hasImpacted = false
            }
          },
        },
        onUpdate: () => applyPose(r, pose),
      })

      // 0 → 1.5: hold on the hero; the hint and copy leave, the camera starts to move.
      tl.to(q('.scroll-hint'), { opacity: 0, duration: 0.4 }, 0)
        .to(q('.hero-copy'), { opacity: 0, y: -40, duration: 1.2 }, 0.3)
        .to(q('.camera'), { scale: 1.26, duration: 7, ease: 'power1.inOut' }, 0.4)
        .to(q('.hero-title'), { scale: 1.12, opacity: 0.35, duration: 6, ease: 'power1.in' }, 0.6)
        .to(q('.red-sun'), { scale: 1.25, opacity: 0.7, duration: 6 }, 0.6)
        // 1 → 4: her forearms begin to lower from the elbows; the sword turns a little in her grip
        // and starts to burn red. Shoulders, torso and stance stay exactly where they are.
        .to(pose, { drive: 0.3, tilt: 5, duration: 3, ease: 'power1.inOut' }, 1)
        .to(pose, { glow: 0.45, under: 0.35, duration: 4, ease: 'power1.in' }, 2.5)
        .to(q('.ground-glow'), { opacity: 0.35, duration: 3 }, 3.5)
        // 4 → 6.5: the hands keep lowering; the blade swings back true, tip just above the ground.
        .to(pose, { drive: 0.55, tilt: 0, duration: 2.5, ease: 'sine.inOut' }, 4)
        // 6.5 → 7.3: she drives it down into the ground, fast at the end.
        .to(pose, { drive: 1, glow: 1, duration: 0.8, ease: 'power4.in' }, 6.5)
        .to(pose, { under: 1, duration: 0.4, ease: 'power2.out' }, 7.3)
        // 7.3 → 8.7: red energy spreads; cracks glow; the world turns red.
        .to(crackPaths, { strokeDashoffset: 0, duration: 1.1, stagger: 0.015, ease: 'power2.out' }, 7.3)
        .fromTo(q('.energy'), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.3, ease: 'power2.out' }, 7.3)
        .to(q('.ground-glow'), { opacity: 1, duration: 0.6 }, 7.3)
        .to(q('.impact-light'), { opacity: 1, duration: 0.9, ease: 'power2.out' }, 7.3)
        .to(q('.avatar'), { '--rim': 1, duration: 0.6 }, 7.3)
        .to(q('.hero-title'), { opacity: 0.6, duration: 0.5 }, 7.3)
        // 8.7 → 10: a katana slash cuts the frame and the scene falls to black.
        .fromTo(q('.slash'), { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.5, ease: 'power3.in' }, 8.7)
        .to(q('.slash'), { scaleY: 4, opacity: 0, duration: 0.6, ease: 'power2.out' }, 9.2)
        .to(q('.curtain'), { opacity: 1, duration: 0.8 }, 9.2)
        .to(q('.chapter-mark'), { opacity: 1, y: 0, duration: 0.5 }, 9.5)
        .to({}, { duration: 0.01 }, 10)
    }, el)

    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('load', refresh)
    return () => {
      window.removeEventListener('load', refresh)
      ctx.revert()
    }
  }, [])

  const split = (text: string) =>
    [...text].map((c, i) => (
      <span className="ch" key={i}>
        {c === ' ' ? ' ' : c}
      </span>
    ))

  return (
    <section ref={section} className="hero-sequence" aria-label="Hero">
      <div className="stage">
        <div className="shake">
          <div ref={zoomRef} className="intro-zoom">
            <div className="camera">
              <div className="layer sky" data-depth="0.05" />
              <div className="layer" data-depth="0.12">
                <div className="red-sun" />
              </div>
              <div className="layer" data-depth="0.2">
                <Backdrop />
              </div>
              <div className="layer fog fog--back" data-depth="0.25" />
              <div className="layer" data-depth="0.35">
                <h1 className="hero-title" aria-label="I'm Krishyangi. Welcome to my portfolio.">
                  <span className="welcome" aria-hidden="true">WELCOME TO MY PORTFOLIO</span>
                  <span className="title-line" aria-hidden="true">{split("I'M KRISHYANGI.")}</span>
                </h1>
              </div>
              <div className="layer" data-depth="0.45">
                <SakuraTree />
              </div>
              <div className="ground">
                <div className="ground-glow" />
              </div>
              <div className="layer char-layer">
                <div className="char-box">
                  <div className="impact-zone" style={{ left: `${IMPACT.x * 100}%`, top: `${IMPACT.y * 100}%` }}>
                    <div className="energy" />
                    <svg className="cracks" viewBox="-420 -140 840 280" aria-hidden="true">
                      {cracks.map((c, i) => (
                        <path key={i} d={c.d} strokeWidth={Math.max(1, c.w)} />
                      ))}
                    </svg>
                    <span className="impact-anchor" />
                  </div>
                  <AvatarCharacter rig={rig} base={AVATAR_BASE} />
                </div>
              </div>
              <div className="layer fog fog--front" data-depth="0.8" />
              <div className="impact-light" />
            </div>
          </div>
          <div className="vignette" />
          <div className="hero-copy">
            <p className="tagline">
              A Mind of Strategy. <em>A Spirit of Creation.</em> A Blade of Precision.
            </p>
            <p className="intro">Building digital experiences with code, creativity, and curiosity.</p>
          </div>
          <div className="vertical-kanji" aria-hidden="true">武士道</div>
          <div className="scroll-hint" aria-hidden="true">
            <span>Scroll to draw the blade</span>
            <i />
          </div>
          <div className="flash" />
          <div className="slash" />
          <div className="curtain">
            <div className="chapter-mark">
              <span className="kanji">作品</span>
              <span>Chapter II — Projects</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
