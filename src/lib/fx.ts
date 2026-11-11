// A tiny bus so any component can ask the atmosphere canvas for effects.

export type BurstOptions = {
  /** Screen position in CSS pixels. */
  x: number
  y: number
  count?: number
  kind: 'petals' | 'embers'
  /** Overall spread speed. */
  power?: number
}

type Handler = (o: BurstOptions) => void
const handlers = new Set<Handler>()

export const fx = {
  burst(o: BurstOptions) {
    handlers.forEach(h => h(o))
  },
  onBurst(h: Handler) {
    handlers.add(h)
    return () => {
      handlers.delete(h)
    }
  },
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
