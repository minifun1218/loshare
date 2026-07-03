import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { WarnIcon, CheckIcon, CloseIcon, InfoIcon } from '../components/icons'

const DialogContext = createContext(null)
let _id = 0

const TYPE_STYLE = {
  danger:  { bg: 'var(--color-red)',   color: 'var(--color-paper)', border: 'var(--color-ink)' },
  warning: { bg: 'var(--color-paper-2)', color: 'var(--color-ink)', border: 'var(--color-ink)' },
  success: { bg: 'var(--color-online)', color: 'var(--color-paper)', border: 'var(--color-ink)' },
  info:    { bg: 'var(--color-ink)', color: 'var(--color-paper)', border: 'var(--color-ink)' },
  error:   { bg: 'var(--color-red)',   color: 'var(--color-paper)', border: 'var(--color-ink)' },
}

const TYPE_ICON = {
  danger:  <WarnIcon size={22} />,
  warning: <WarnIcon size={22} />,
  success: <CheckIcon size={20} />,
  info:    <InfoIcon size={20} />,
  error:   <CloseIcon size={20} />,
}

function DialogModal({ dialog, onClose }) {
  const isConfirm = dialog.kind === 'confirm'
  const type = dialog.danger ? 'danger' : (dialog.type || 'info')
  const style = TYPE_STYLE[type] || TYPE_STYLE.info
  const icon = TYPE_ICON[type]

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose(dialog.id, isConfirm ? false : undefined)
      if (e.key === 'Enter')  onClose(dialog.id, isConfirm ? true  : undefined)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [dialog.id, isConfirm, onClose])

  return (
    <div
      className="dialog-overlay"
      onClick={() => onClose(dialog.id, isConfirm ? false : undefined)}
    >
      <div className="dialog-box" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="dialog-icon" style={{ background: style.bg, color: style.color, borderColor: style.border }}>
          {icon}
        </div>
        <div className="dialog-body">
          {dialog.title   && <h3 className="dialog-title">{dialog.title}</h3>}
          {dialog.message && <p className="dialog-message">{dialog.message}</p>}
        </div>
        <div className="dialog-actions">
          {isConfirm ? (
            <>
              <button
                className="btn-secondary btn-sm"
                onClick={() => onClose(dialog.id, false)}
              >
                {dialog.cancelText}
              </button>
              <button
                className={`btn-sm ${dialog.danger ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => onClose(dialog.id, true)}
                autoFocus
              >
                {dialog.confirmText}
              </button>
            </>
          ) : (
            <button
              className="btn-primary btn-sm"
              onClick={() => onClose(dialog.id, undefined)}
              autoFocus
            >
              {dialog.buttonText}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ToastItem({ toast }) {
  const icons = {
    success: <CheckIcon size={12} />,
    error:   <CloseIcon size={11} />,
    warning: <WarnIcon  size={11} />,
    info:    <InfoIcon  size={12} />,
  }
  return (
    <div className={`t-item t-item--${toast.type}${toast.leaving ? ' is-leaving' : ''}`}>
      <span className="t-dot">{icons[toast.type] ?? icons.info}</span>
      {toast.message}
    </div>
  )
}

export function DialogProvider({ children }) {
  const [dialogs, setDialogs] = useState([])
  const [toasts, setToasts] = useState([])

  const confirm = useCallback(({
    title, message,
    confirmText = '确认', cancelText = '取消',
    danger = false,
  } = {}) =>
    new Promise(resolve => {
      setDialogs(prev => [...prev, { id: ++_id, kind: 'confirm', title, message, confirmText, cancelText, danger, resolve }])
    }),
  [])

  const alert = useCallback(({
    title, message,
    buttonText = '好的',
    type = 'info',
  } = {}) =>
    new Promise(resolve => {
      setDialogs(prev => [...prev, { id: ++_id, kind: 'alert', type, title, message, buttonText, resolve }])
    }),
  [])

  const toast = useCallback(({ message, type = 'success', duration = 3000 } = {}) => {
    const id = ++_id
    setToasts(prev => [...prev, { id, message, type, leaving: false }])
    setTimeout(
      () => setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t)),
      Math.max(duration - 280, 60),
    )
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  const closeDialog = useCallback((id, result) => {
    setDialogs(prev => {
      const d = prev.find(x => x.id === id)
      if (d) d.resolve(result)
      return prev.filter(x => x.id !== id)
    })
  }, [])

  return (
    <DialogContext.Provider value={{ confirm, alert, toast }}>
      {children}
      {dialogs.length > 0 && (
        <DialogModal dialog={dialogs[0]} onClose={closeDialog} />
      )}
      {toasts.length > 0 && (
        <div className="t-stack">
          {toasts.map(t => <ToastItem key={t.id} toast={t} />)}
        </div>
      )}
    </DialogContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDialog() {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialog must be used within DialogProvider')
  return ctx
}
