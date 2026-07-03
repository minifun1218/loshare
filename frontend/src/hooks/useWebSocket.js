import { useEffect, useRef, useCallback } from 'react'
import { WS_BASE_URL } from '../config'

export default function useWebSocket({ roomId, token, onMessage, enabled = true }) {
  const wsRef = useRef(null)
  const retryRef = useRef(0)
  const timerRef = useRef(null)
  const onMessageRef = useRef(onMessage)

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    if (!enabled || !roomId || !token) return

    let destroyed = false

    const connect = () => {
      if (destroyed) return
      const ws = new WebSocket(`${WS_BASE_URL}/api/location/ws/${roomId}?token=${token}`)
      wsRef.current = ws

      ws.onopen = () => { retryRef.current = 0 }

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          onMessageRef.current?.(msg)
        } catch {
          void 0
        }
      }

      ws.onclose = (e) => {
        if (destroyed || e.code === 4001 || e.code === 4003) return
        const delay = Math.min(1000 * 2 ** retryRef.current, 16000)
        retryRef.current++
        if (retryRef.current <= 5) {
          timerRef.current = setTimeout(connect, delay)
        }
      }

      ws.onerror = () => ws.close()
    }

    connect()

    return () => {
      destroyed = true
      clearTimeout(timerRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [roomId, token, enabled])

  const send = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  return { send }
}
