import { useEffect, useState } from 'react'
import { isSoundOn, onSoundChange, setSound } from '../lib/sound'

export function SoundToggle() {
  const [isOn, setIsOn] = useState(isSoundOn())
  useEffect(() => {
    const off = onSoundChange(setIsOn)
    return () => {
      off()
    }
  }, [])
  return (
    <button
      className={`sound-toggle ${isOn ? 'is-on' : ''}`}
      onClick={() => void setSound(!isOn)}
      aria-pressed={isOn}
      aria-label={isOn ? 'Turn sound off' : 'Turn sound on'}
    >
      <span className="sound-bars" aria-hidden="true">
        <i /><i /><i /><i />
      </span>
      <span className="sound-label">{isOn ? '音 On' : '音 Off'}</span>
    </button>
  )
}
