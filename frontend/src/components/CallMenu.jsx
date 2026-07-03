import { useEffect, useRef } from 'react'
import { VideoIcon, MicIcon } from './icons'

export default function CallMenu({ onClose, onStart, direction = 'down' }) {
  const ref = useRef(null)

  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onClose()
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [onClose])

  const handleStart = (event, withVideo) => {
    event.preventDefault()
    event.stopPropagation()
    onStart(withVideo)
  }

  return (
    <div
      ref={ref}
      className={`rp-call-menu${direction === 'up' ? ' up' : ''}`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <button className="rp-call-menu__item" onPointerDown={(event) => handleStart(event, true)}>
        <VideoIcon size={15} />
        视频通话
      </button>
      <button className="rp-call-menu__item" onPointerDown={(event) => handleStart(event, false)}>
        <MicIcon size={15} />
        语音通话
      </button>
    </div>
  )
}
