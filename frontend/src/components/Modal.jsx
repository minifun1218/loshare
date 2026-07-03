import { useEffect } from 'react'
import { CloseIcon } from './icons'

export default function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-box__head">
          <h3 className="modal-box__title">{title}</h3>
          <button onClick={onClose} className="modal-box__close" aria-label="关闭">
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
