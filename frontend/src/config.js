const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

function buildDefaultApiBaseUrl() {
  if (import.meta.env.DEV) return window.location.origin

  const { protocol, hostname } = window.location
  const apiProtocol = protocol === 'https:' ? 'https:' : 'http:'
  return `${apiProtocol}//${hostname}`
}

function buildDefaultDevWebSocketBaseUrl() {
  const webSocketProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${webSocketProtocol}//${window.location.host}`
}

function buildWebSocketBaseUrl(apiBaseUrl) {
  const parsedApiUrl = new URL(apiBaseUrl)
  parsedApiUrl.protocol = parsedApiUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  return parsedApiUrl.toString().replace(/\/$/, '')
}

function isLocalUrl(url) {
  return LOCAL_HOSTS.has(url.hostname)
}

function assertProductionTransportSecurity(apiBaseUrl, webSocketBaseUrl) {
  if (!import.meta.env.PROD) return

  const parsedApiUrl = new URL(apiBaseUrl)
  const parsedWebSocketUrl = new URL(webSocketBaseUrl)
  const apiIsSecure = parsedApiUrl.protocol === 'https:' || isLocalUrl(parsedApiUrl)
  const webSocketIsSecure = parsedWebSocketUrl.protocol === 'wss:' || isLocalUrl(parsedWebSocketUrl)

  if (!apiIsSecure) {
    throw new Error('生产环境登录接口必须配置为 HTTPS，请设置 VITE_API_BASE_URL=https://...')
  }
  if (!webSocketIsSecure) {
    throw new Error('生产环境 WebSocket 必须配置为 WSS，请设置 VITE_WS_BASE_URL=wss://...')
  }
}

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || buildDefaultApiBaseUrl()
).replace(/\/$/, '')

export const WS_BASE_URL = (
  import.meta.env.VITE_WS_BASE_URL || (import.meta.env.DEV ? buildDefaultDevWebSocketBaseUrl() : buildWebSocketBaseUrl(API_BASE_URL))
).replace(/\/$/, '')

assertProductionTransportSecurity(API_BASE_URL, WS_BASE_URL)
