import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

let lenis: Lenis | null = null

/** Smooth scrolling driven by GSAP's ticker, so ScrollTrigger and Lenis share one clock. */
export function startSmoothScroll() {
  if (lenis) return lenis
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add(time => lenis?.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
  return lenis
}

export function lockScroll(isLocked: boolean) {
  if (isLocked) lenis?.stop()
  else lenis?.start()
  document.documentElement.classList.toggle('is-locked', isLocked)
}

export { gsap, ScrollTrigger }
