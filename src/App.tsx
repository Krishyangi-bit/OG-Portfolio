import { useCallback, useEffect, useRef, useState } from 'react'
import { Atmosphere } from './components/Atmosphere'
import { HeroSequence } from './components/HeroSequence'
import { JapaneseGate } from './components/JapaneseGate'
import { ProjectsLanding } from './components/ProjectsLanding'
import { SoundToggle } from './components/SoundToggle'
import { lockScroll, ScrollTrigger, startSmoothScroll } from './lib/scroll'

export function App() {
  const zoomRef = useRef<HTMLDivElement>(null)
  const [isGateShown, setIsGateShown] = useState(true)
  const [isOpening, setIsOpening] = useState(false)
  const [isIntroDone, setIsIntroDone] = useState(false)

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    startSmoothScroll()
    lockScroll(true)
  }, [])

  const onOpening = useCallback(() => setIsOpening(true), [])
  const onDone = useCallback(() => {
    setIsOpening(true)
    setIsIntroDone(true)
    setIsGateShown(false)
    lockScroll(false)
    requestAnimationFrame(() => ScrollTrigger.refresh())
  }, [])

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Krishyangi, home">
          <span className="brand__seal">侍</span>
          <span className="brand__name">KRISHYANGI</span>
        </a>
        <SoundToggle />
      </header>
      <main id="top">
        <HeroSequence isIntroDone={isIntroDone} zoomRef={zoomRef} />
        <ProjectsLanding />
      </main>
      <Atmosphere isActive={isOpening} />
      {isGateShown && <JapaneseGate zoomTarget={zoomRef} onOpening={onOpening} onDone={onDone} />}
    </>
  )
}
