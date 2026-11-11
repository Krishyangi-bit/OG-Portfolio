// All sound is synthesised with the Web Audio API, so there are no audio files to load.
// Nothing plays until the visitor turns sound on (browsers block audio before a gesture anyway).

type Listener = (isOn: boolean) => void

let ctx: AudioContext | null = null
let master: GainNode | null = null
let windGain: GainNode | null = null
let isOn = false
let bellTimer: number | undefined
const listeners = new Set<Listener>()

function noiseBuffer(ac: AudioContext, seconds: number) {
  const buf = ac.createBuffer(1, ac.sampleRate * seconds, ac.sampleRate)
  const data = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < data.length; i++) {
    // Brown-ish noise: softer than white noise, closer to wind.
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
    data[i] = last * 3.5
  }
  return buf
}

function ensure() {
  if (ctx) return ctx
  ctx = new AudioContext()
  master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)

  // Wind: looping filtered noise whose filter drifts slowly.
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, 6)
  src.loop = true
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 420
  filter.Q.value = 0.6
  const lfo = ctx.createOscillator()
  const lfoGain = ctx.createGain()
  lfo.frequency.value = 0.07
  lfoGain.gain.value = 260
  lfo.connect(lfoGain).connect(filter.frequency)
  windGain = ctx.createGain()
  windGain.gain.value = 0.22
  src.connect(filter).connect(windGain).connect(master)
  src.start()
  lfo.start()
  return ctx
}

/** A distant temple bell: a few inharmonic partials with a long decay. */
export function bell(volume = 0.18) {
  if (!isOn || !ctx || !master) return
  const t = ctx.currentTime
  for (const [ratio, amp] of [[1, 1], [2.76, 0.45], [5.4, 0.22], [8.93, 0.1]] as const) {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.frequency.value = 196 * ratio
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(volume * amp, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 4.5 / ratio + 1.5)
    osc.connect(g).connect(master)
    osc.start(t)
    osc.stop(t + 7)
  }
}

/** Wooden panels sliding: a filtered noise sweep with a low rumble. */
export function slide(seconds = 2) {
  if (!isOn || !ctx || !master) return
  const t = ctx.currentTime
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, seconds + 0.5)
  const f = ctx.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.setValueAtTime(300, t)
  f.frequency.linearRampToValueAtTime(900, t + seconds * 0.4)
  f.frequency.linearRampToValueAtTime(250, t + seconds)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(0.5, t + 0.25)
  g.gain.linearRampToValueAtTime(0, t + seconds)
  src.connect(f).connect(g).connect(master)
  src.start(t)
}

/** Sword strike into the ground: a sub boom, a crack of noise and a metallic ring. */
export function impact() {
  if (!isOn || !ctx || !master) return
  const t = ctx.currentTime
  const boom = ctx.createOscillator()
  const bg = ctx.createGain()
  boom.type = 'sine'
  boom.frequency.setValueAtTime(110, t)
  boom.frequency.exponentialRampToValueAtTime(32, t + 0.9)
  bg.gain.setValueAtTime(0.9, t)
  bg.gain.exponentialRampToValueAtTime(0.0001, t + 1.4)
  boom.connect(bg).connect(master)
  boom.start(t)
  boom.stop(t + 1.5)

  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, 0.6)
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 900
  const ng = ctx.createGain()
  ng.gain.setValueAtTime(0.7, t)
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
  src.connect(hp).connect(ng).connect(master)
  src.start(t)

  const ring = ctx.createOscillator()
  const rg = ctx.createGain()
  ring.type = 'triangle'
  ring.frequency.value = 2350
  rg.gain.setValueAtTime(0.06, t)
  rg.gain.exponentialRampToValueAtTime(0.0001, t + 2.2)
  ring.connect(rg).connect(master)
  ring.start(t)
  ring.stop(t + 2.3)
}

export function isSoundOn() {
  return isOn
}

export function onSoundChange(fn: Listener) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export async function setSound(next: boolean) {
  isOn = next
  const ac = ensure()
  if (ac.state === 'suspended') await ac.resume()
  master!.gain.cancelScheduledValues(ac.currentTime)
  master!.gain.linearRampToValueAtTime(next ? 0.8 : 0, ac.currentTime + 0.6)
  window.clearInterval(bellTimer)
  if (next) {
    bell(0.12)
    bellTimer = window.setInterval(() => bell(0.08), 19000)
  }
  listeners.forEach(fn => fn(next))
}
