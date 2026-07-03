import { useState, useEffect, useRef } from 'react'

export default function useGeolocation() {
  const supported = 'geolocation' in navigator
  const [position, setPosition] = useState(null)
  const [error, setError] = useState(() => supported ? null : { code: 0, message: '浏览器不支持定位' })
  const watchId = useRef(null)

  useEffect(() => {
    if (!supported) return

    const onSuccess = (pos) => {
      setError(null)
      setPosition({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      })
    }

    const onError = (err) => {
      const messages = {
        1: '位置权限被拒绝，请在浏览器设置中允许定位',
        2: '无法获取位置信息',
        3: '获取位置超时',
      }
      setError({ code: err.code, message: messages[err.code] || '定位失败' })
    }

    const options = { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }

    watchId.current = navigator.geolocation.watchPosition(onSuccess, onError, options)

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
      }
    }
  }, [supported])

  return { position, error, supported }
}
