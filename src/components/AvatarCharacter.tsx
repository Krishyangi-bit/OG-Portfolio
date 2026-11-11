import { useEffect, type RefObject } from 'react'
import { ELBOW_L, ELBOW_R, EYE_L, EYE_R, GRIP_PIVOT, LAYERS, WRIST_L, WRIST_R, type LayerName, type Pt } from './avatarRig'

/**
 * Krishyangi's avatar: her own illustration, split into layers so parts of it can move
 * while the rest stays exactly where it was drawn.
 *
 * - body: the whole figure with the arms, hilt, blade and irises removed and repainted
 *   underneath. It never moves.
 * - forearmL / forearmR: each rotates about its elbow (inside the sleeve).
 * - grip: both hands, the hilt, the guard and the blade, as one rigid piece. It drives down
 *   along the blade and can tilt; the forearms re-aim at its wrists every frame, so the
 *   hands stay on the hilt and the sword stays in the hands.
 * - cuffL / cuffR: the sleeve openings, drawn over the forearms to hide where they are cut.
 * - irisL / irisR: slide inside their eye openings to follow the cursor.
 *
 * Units are the illustration's pixels; the viewBox adds room below for the ground.
 */

export const VIEW_W = 619
export const VIEW_H = 700
export const GROUND_Y = 650
const IMG_H = 572

/** The blade's centre line in the illustration: x at a given y. */
export const bladeX = (y: number) => 253 - 0.1114 * (y - 571)
/** Where the blade tip rests, above the ground. */
export const TIP_Y = 616
/** The direction the blade points (down, leaning slightly left): the hands drive along it. */
const BLADE_DIR: Pt = (() => {
  const l = Math.hypot(0.1114, 1)
  return [-0.1114 / l, 1 / l]
})()
/** How far the hands drive down at full extension. */
export const DRIVE_MAX = 58

/** Eye travel limits, in illustration pixels. */
const EYE_RANGE = { x: 2.4, y: 1.0 }
const EYE_MID: Pt = [261.4, 145.4]

export type ArmPose = {
  /** 0 = rest, 1 = blade driven into the ground. */
  drive: number
  /** Extra rotation of the sword and hands about the grip, in degrees. */
  tilt: number
}

export type AvatarRig = {
  root: RefObject<SVGSVGElement | null>
  forearmL: RefObject<SVGGElement | null>
  forearmR: RefObject<SVGGElement | null>
  grip: RefObject<SVGGElement | null>
  irises: RefObject<SVGGElement | null>
  bladeGlow: RefObject<SVGGElement | null>
  underLight: RefObject<SVGRectElement | null>
}

// ---------------------------------------------------------------- kinematics

const rotateAbout = (p: Pt, c: Pt, deg: number): Pt => {
  const a = (deg * Math.PI) / 180
  const x = p[0] - c[0]
  const y = p[1] - c[1]
  return [c[0] + x * Math.cos(a) - y * Math.sin(a), c[1] + x * Math.sin(a) + y * Math.cos(a)]
}

const gripOffset = (pose: ArmPose): Pt => [BLADE_DIR[0] * pose.drive * DRIVE_MAX, BLADE_DIR[1] * pose.drive * DRIVE_MAX]

/** Where a point on the grip piece ends up for a pose. */
export function gripPoint(p: Pt, pose: ArmPose): Pt {
  const r = rotateAbout(p, GRIP_PIVOT, pose.tilt)
  const o = gripOffset(pose)
  return [r[0] + o[0], r[1] + o[1]]
}

const angleOf = (v: Pt) => (Math.atan2(v[1], v[0]) * 180) / Math.PI

/** The rotation that keeps a forearm (pivoting at its elbow) aimed at its moved wrist. */
function forearmAngle(elbow: Pt, wrist: Pt, pose: ArmPose) {
  const moved = gripPoint(wrist, pose)
  let a = angleOf([moved[0] - elbow[0], moved[1] - elbow[1]]) - angleOf([wrist[0] - elbow[0], wrist[1] - elbow[1]])
  if (a > 180) a -= 360
  if (a < -180) a += 360
  return a
}

/** Where the blade enters the ground at full drive (illustration pixels). */
export const IMPACT_POINT: Pt = (() => {
  const full: ArmPose = { drive: 1, tilt: 0 }
  const o = gripOffset(full)
  const localY = GROUND_Y - o[1]
  return [bladeX(localY) + o[0], GROUND_Y]
})()

export function applyArmPose(rig: AvatarRig, pose: ArmPose) {
  const aL = forearmAngle(ELBOW_L, WRIST_L, pose)
  const aR = forearmAngle(ELBOW_R, WRIST_R, pose)
  rig.forearmL.current?.setAttribute('transform', `rotate(${aL.toFixed(3)} ${ELBOW_L[0]} ${ELBOW_L[1]})`)
  rig.forearmR.current?.setAttribute('transform', `rotate(${aR.toFixed(3)} ${ELBOW_R[0]} ${ELBOW_R[1]})`)
  const o = gripOffset(pose)
  rig.grip.current?.setAttribute(
    'transform',
    `translate(${o[0].toFixed(3)} ${o[1].toFixed(3)}) rotate(${pose.tilt.toFixed(3)} ${GRIP_PIVOT[0]} ${GRIP_PIVOT[1]})`,
  )
}

// -------------------------------------------------------------------- drawing

const blade = (top: number, bottom: number, half: number) => {
  // A tapered steel strip along the measured blade line, ending in a kissaki point.
  const tipStart = bottom - 22
  return [
    `M ${bladeX(top) - half} ${top}`,
    `L ${bladeX(tipStart) - half} ${tipStart}`,
    `Q ${bladeX(bottom - 6) - half * 0.6} ${bottom - 6} ${bladeX(bottom)} ${bottom}`,
    `L ${bladeX(tipStart) + half} ${tipStart}`,
    `L ${bladeX(top) + half} ${top}`,
    'Z',
  ].join(' ')
}

const toPoints = (pts: readonly Pt[]) => pts.map(p => p.join(',')).join(' ')

// A soft mask of where the wind may ripple: hair and sash ends, clear of the face and the arm joints.
const WIND_MASK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${VIEW_W}" height="${IMG_H}" viewBox="0 0 ${VIEW_W} ${IMG_H}">` +
      `<defs><filter id="b"><feGaussianBlur stdDeviation="18"/></filter></defs>` +
      `<rect width="100%" height="100%" fill="black"/>` +
      `<g filter="url(#b)" fill="white">` +
      `<ellipse cx="92" cy="160" rx="52" ry="70"/>` +
      `<ellipse cx="270" cy="34" rx="55" ry="36"/>` +
      `<ellipse cx="548" cy="438" rx="85" ry="38"/>` +
      `</g></svg>`,
  )

function Layer({ name, base }: { name: LayerName; base: string }) {
  const l = LAYERS[name]
  return <image href={`${base}${name}.webp`} x={l.x} y={l.y} width={l.w} height={l.h} />
}

export function AvatarCharacter({ rig, base }: { rig: AvatarRig; base: string }) {
  useEyeTracking(rig)

  const steel = blade(470, TIP_Y, 5.2)
  const wholeBlade = blade(332, TIP_Y, 5.6)

  return (
    <svg
      ref={rig.root}
      className="avatar"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMax meet"
      role="img"
      aria-label="Krishyangi's samurai avatar, facing forward, gripping a katana pointed at the ground"
    >
      <defs>
        <filter id="wind" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="4" result="rawNoise" />
          {/* Turbulence has random alpha; make it opaque so the blend below is exactly neutral
              (no displacement at all) wherever the mask is black, such as the face. */}
          <feColorMatrix
            in="rawNoise"
            type="matrix"
            values="1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    0 0 0 0 1"
            result="noise"
          />
          <feOffset in="noise" dx="0" result="flow">
            <animate attributeName="dx" values="0;46;0" dur="7s" repeatCount="indefinite" />
          </feOffset>
          <feImage href={WIND_MASK} x="0" y="0" width={VIEW_W} height={IMG_H} result="mask" preserveAspectRatio="none" />
          <feComposite in="flow" in2="mask" operator="arithmetic" k1="1" k2="0" k3="-0.5" k4="0.5" result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale="9" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {/* Grade the daylight illustration into the night scene: deeper shadows, a crimson cast. */}
        <filter id="grade" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="1.02 0.06 0    0 -0.02
                    0    0.86 0.02 0 -0.03
                    0    0.04 0.84 0 -0.03
                    0    0    0    1  0"
          />
        </filter>
        <linearGradient id="fade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0.8" stopColor="#fff" />
          <stop offset="0.99" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        {/* The lower edge melts into the fog. Used by the body (fixed) and by the grip (moves with it). */}
        <mask id="fadeMask" maskContentUnits="userSpaceOnUse">
          <rect x="-100" y="-100" width={VIEW_W + 200} height={IMG_H + 100} fill="url(#fade)" />
        </mask>
        <mask id="figure" maskContentUnits="userSpaceOnUse" style={{ maskType: 'alpha' }}>
          <image href={`${base}body.webp`} x="0" y="0" width={VIEW_W} height={IMG_H} />
        </mask>
        <linearGradient id="shadeGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="0.55" stopColor="#000" stopOpacity="0.1" />
          <stop offset="1" stopColor="#120003" stopOpacity="0.75" />
        </linearGradient>
        <radialGradient id="underGrad" cx="0.42" cy="1.05" r="0.9">
          <stop offset="0" stopColor="#ff3048" />
          <stop offset="0.45" stopColor="#b00020" stopOpacity="0.7" />
          <stop offset="1" stopColor="#650014" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="steel" x1="0" x2="1">
          <stop offset="0" stopColor="#6d7178" />
          <stop offset="0.5" stopColor="#f2f3f5" />
          <stop offset="1" stopColor="#8f949b" />
        </linearGradient>
        <linearGradient id="steelFadeIn" x1="0" x2="0" y1="470" y2="545" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" />
        </linearGradient>
        <mask id="steelMask" maskContentUnits="userSpaceOnUse">
          <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="url(#steelFadeIn)" />
        </mask>
        <linearGradient id="glintGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="bladeClip" clipPathUnits="userSpaceOnUse">
          <path d={wholeBlade} />
        </clipPath>
        <clipPath id="aboveGround" clipPathUnits="userSpaceOnUse">
          <rect x="-300" y="-300" width={VIEW_W + 600} height={GROUND_Y + 300} />
        </clipPath>
        <clipPath id="eyeL" clipPathUnits="userSpaceOnUse">
          <polygon points={toPoints(EYE_L)} />
        </clipPath>
        <clipPath id="eyeR" clipPathUnits="userSpaceOnUse">
          <polygon points={toPoints(EYE_R)} />
        </clipPath>
        <filter id="bladeBlur" filterUnits="userSpaceOnUse" x="150" y="250" width="220" height="460">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      <g clipPath="url(#aboveGround)">
        {/* Everything that never moves, plus the arm layers, graded as one picture. */}
        <g filter="url(#grade)">
          <g mask="url(#fadeMask)">
            <g className="avatar-wind" filter="url(#wind)">
              <Layer name="body" base={base} />
            </g>
          </g>
          <g ref={rig.irises}>
            <g clipPath="url(#eyeL)">
              <g className="iris">
                <Layer name="irisL" base={base} />
              </g>
            </g>
            <g clipPath="url(#eyeR)">
              <g className="iris">
                <Layer name="irisR" base={base} />
              </g>
            </g>
          </g>
          <g ref={rig.forearmR}>
            <Layer name="forearmR" base={base} />
          </g>
          <g ref={rig.forearmL}>
            <Layer name="forearmL" base={base} />
          </g>
          <Layer name="cuffL" base={base} />
          <Layer name="cuffR" base={base} />
        </g>

        <g mask="url(#fadeMask)">
          <rect x="0" y="0" width={VIEW_W} height={IMG_H} fill="url(#shadeGrad)" mask="url(#figure)" />
          <rect
            ref={rig.underLight}
            x="0"
            y="0"
            width={VIEW_W}
            height={IMG_H}
            fill="url(#underGrad)"
            mask="url(#figure)"
            opacity="0.18"
            style={{ mixBlendMode: 'screen' }}
          />
        </g>

        {/* GRIP: hands, hilt, guard and blade, moving as one with the sword's painted extension. */}
        <g ref={rig.grip}>
          <g mask="url(#steelMask)">
            <path d={steel} fill="url(#steel)" />
            <path d={`M ${bladeX(470) + 2} 470 L ${bladeX(TIP_Y - 24) + 2} ${TIP_Y - 24}`} stroke="#fff" strokeWidth="1" opacity="0.7" />
          </g>
          <g filter="url(#grade)" mask="url(#fadeMask)">
            <Layer name="grip" base={base} />
          </g>
          <g clipPath="url(#bladeClip)">
            <rect className="avatar-glint" x="200" y="200" width="120" height="70" fill="url(#glintGrad)" />
          </g>
          <g ref={rig.bladeGlow} opacity="0" style={{ mixBlendMode: 'screen' }}>
            <path d={wholeBlade} fill="#ff2a45" filter="url(#bladeBlur)" />
            <path d={wholeBlade} fill="#ff7a8a" opacity="0.6" />
          </g>
        </g>
      </g>
    </svg>
  )
}

// --------------------------------------------------------------- eye tracking

/**
 * The irises follow the cursor anywhere in the viewport, eased with a critically damped
 * spring, within an elliptical range that keeps them inside the eye openings. When the
 * cursor leaves the window they drift back to centre. Devices without a fine hover pointer
 * (phones, tablets) keep the eyes forward.
 */
function useEyeTracking(rig: AvatarRig) {
  useEffect(() => {
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)')
    if (!canHover.matches) return

    let target: Pt = [0, 0]
    const pos: [number, number] = [0, 0]
    const vel: [number, number] = [0, 0]
    let cursor: Pt | null = null
    let raf = 0
    let last = performance.now()
    let isVisible = true

    const aim = () => {
      const svg = rig.root.current
      const ctm = svg?.getScreenCTM()
      if (!svg || !ctm || !cursor) {
        target = [0, 0]
        return
      }
      // The eyes' midpoint on screen, wherever the camera has moved the avatar.
      const eye = new DOMPoint(EYE_MID[0], EYE_MID[1]).matrixTransform(ctm)
      const dx = cursor[0] - eye.x
      const dy = cursor[1] - eye.y
      // Look further the further away the cursor is, easing out towards the edges of the range.
      const nx = Math.tanh(dx / (window.innerWidth * 0.32))
      const ny = Math.tanh(dy / (window.innerHeight * 0.32))
      let tx = nx * EYE_RANGE.x
      let ty = ny * EYE_RANGE.y
      const e = Math.hypot(tx / EYE_RANGE.x, ty / EYE_RANGE.y)
      if (e > 1) {
        tx /= e
        ty /= e
      }
      target = [tx, ty]
    }

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      aim()
      // Critically damped spring: quick to start, no overshoot. Slower when returning to rest.
      const k = cursor ? 140 : 40
      const c = 2 * Math.sqrt(k)
      for (const i of [0, 1] as const) {
        const a = k * (target[i] - pos[i]) - c * vel[i]
        vel[i] += a * dt
        pos[i] += vel[i] * dt
      }
      const t = `translate(${pos[0].toFixed(3)} ${pos[1].toFixed(3)})`
      rig.irises.current?.querySelectorAll('.iris').forEach(el => el.setAttribute('transform', t))
      const isSettled =
        Math.abs(target[0] - pos[0]) < 0.005 && Math.abs(target[1] - pos[1]) < 0.005 && Math.hypot(vel[0], vel[1]) < 0.01
      raf = isSettled || !isVisible ? 0 : requestAnimationFrame(tick)
    }

    const wake = () => {
      if (!raf && isVisible) {
        last = performance.now()
        raf = requestAnimationFrame(tick)
      }
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return
      cursor = [e.clientX, e.clientY]
      wake()
    }
    const onLeave = (e: MouseEvent) => {
      if (e.relatedTarget === null) {
        cursor = null
        wake()
      }
    }
    // The camera moves while scrolling: keep the eyes aimed at a still cursor.
    const onScroll = () => {
      if (cursor) wake()
    }
    const io = new IntersectionObserver(([entry]) => {
      isVisible = !!entry?.isIntersecting
      if (isVisible) wake()
    })
    if (rig.root.current) io.observe(rig.root.current)

    const onBlur = () => {
      cursor = null
      wake()
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('mouseout', onLeave)
    window.addEventListener('blur', onBlur)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('mouseout', onLeave)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('scroll', onScroll)
    }
    // The rig's refs are stable for the component's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
