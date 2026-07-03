import { useState, useCallback, useRef } from 'react'

export default function useCopy() {
  const [copiedKey, setCopiedKey] = useState(null)
  const timerRef = useRef(null)

  const copy = useCallback((text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      clearTimeout(timerRef.current)
      setCopiedKey(key)
      timerRef.current = setTimeout(() => setCopiedKey(null), 2000)
    })
  }, [])

  return { copiedKey, copy }
}
