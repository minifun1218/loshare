import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDialog } from '../contexts/DialogContext'
import { getRoomMembers, leaveRoom } from '../api/rooms'
import { updateLocation } from '../api/location'
import { getLivekitToken } from '../api/livekit'
import { getErrorMessage } from '../utils/errorMessage'
import useGeolocation from '../hooks/useGeolocation'
import useWebSocket from '../hooks/useWebSocket'
import useScrolled from '../hooks/useScrolled'
import MapView from '../components/Map/MapView'
import MemberList from '../components/MemberList'
import VideoCall from '../components/VideoCall'
import CallMenu from '../components/CallMenu'
import {
  BackIcon, PinIcon, MembersIcon, LinkIcon, CheckIcon, WarnIcon, PhoneIcon,
} from '../components/icons'

const LOCATION_INTERVAL = 10000

export default function RoomPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, token } = useAuth()
  const { confirm: confirmDialog } = useDialog()
  const copyTimer = useRef(null)

  const room = location.state?.room
  const numRoomId = parseInt(roomId)

  const [members, setMembers] = useState([])
  const [onlineUserIds, setOnlineUserIds] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [flyTarget, setFlyTarget] = useState(null)
  const [callMenu, setCallMenu] = useState(false)
  const [sharingPaused, setSharingPaused] = useState(false)
  const [copied, setCopied] = useState(false)
  const [livekitToken, setLivekitToken] = useState(null)
  const [livekitUrl, setLivekitUrl] = useState(null)
  const [withVideo, setWithVideo] = useState(true)
  const [callError, setCallError] = useState(null)
  const [callStarting, setCallStarting] = useState(false)
  const scrolled = useScrolled(40)

  const { position, error: geoError } = useGeolocation()

  useWebSocket({
    roomId: numRoomId,
    token,
    onMessage: handleWsMessage,
    enabled: !!token && !!numRoomId,
  })

  function handleWsMessage(msg) {
    if (msg.type === 'location_update') {
      const d = msg.data
      setMembers(prev => {
        const existing = prev.find(m => m.user_id === d.user_id)
        if (existing) {
          return prev.map(m =>
            m.user_id === d.user_id
              ? { ...m, latitude: d.latitude, longitude: d.longitude, accuracy: d.accuracy, updated_at: d.updated_at }
              : m,
          )
        }
        return [...prev, {
          user_id: d.user_id,
          username: d.username,
          avatar_color: d.avatar_color,
          latitude: d.latitude,
          longitude: d.longitude,
          accuracy: d.accuracy,
          updated_at: d.updated_at,
        }]
      })
    } else if (msg.type === 'user_online') {
      setOnlineUserIds(prev => prev.includes(msg.data.user_id) ? prev : [...prev, msg.data.user_id])
    } else if (msg.type === 'user_offline') {
      setOnlineUserIds(prev => prev.filter(id => id !== msg.data.user_id))
    }
  }

  useEffect(() => {
    getRoomMembers(numRoomId)
      .then(data => {
        setMembers(data)
        setOnlineUserIds(data.map(m => m.user_id))
      })
      .catch(() => navigate('/dashboard', { replace: true }))
  }, [numRoomId, navigate])

  useEffect(() => {
    if (!position || sharingPaused) return
    const post = () => {
      updateLocation({
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        room_id: numRoomId,
      }).catch(() => {})
    }
    post()
    const id = setInterval(post, LOCATION_INTERVAL)
    return () => clearInterval(id)
  }, [position, numRoomId, sharingPaused])

  const callActive = !!livekitToken

  const startCall = async (video) => {
    if (callStarting || callActive) return

    setCallError(null)
    setCallMenu(false)
    setCallStarting(true)
    setWithVideo(video)

    try {
      const data = await getLivekitToken(numRoomId)

      if (!data?.token || !data?.url) {
        throw new Error('LiveKit token response is missing token or url')
      }

      setLivekitUrl(data.url)
      setLivekitToken(data.token)
    } catch (err) {
      console.error('[startCall] error:', err)
      setCallError(getErrorMessage(err, '无法开始通话，请稍后再试'))
      setCallStarting(false)
    }
  }

  const stopCall = useCallback(() => {
    setCallStarting(false)
    setLivekitToken(null)
    setLivekitUrl(null)
  }, [])

  const handleCallConnected = useCallback(() => {
    setCallStarting(false)
  }, [])

  const handleCallError = useCallback((err) => {
    console.error('LiveKit 连接错误:', err)
    setCallError('通话连接失败，请检查网络或刷新页面重试')
    setCallStarting(false)
    setLivekitToken(null)
    setLivekitUrl(null)
  }, [])

  const handleLeave = async () => {
    const ok = await confirmDialog({
      title: '停止共享',
      message: '确定停止和这张地图共享位置吗？',
      confirmText: '停止共享',
      danger: true,
    })
    if (!ok) return
    stopCall()
    try {
      await leaveRoom(numRoomId)
    } catch {
      void 0
    }
    navigate('/dashboard', { replace: true })
  }

  const copyInvite = () => {
    if (!room?.code) return
    const inviteLink = `${window.location.origin}/join/${room.code}`
    navigator.clipboard.writeText(inviteLink).then(() => {
      clearTimeout(copyTimer.current)
      setCopied(true)
      copyTimer.current = setTimeout(() => setCopied(false), 1800)
    })
  }

  const displayName = room?.name || `朋友地图 ${roomId}`
  const displayCode = room?.code
  const allOnlineIds = [...new Set([...onlineUserIds, user?.id].filter(Boolean))]
  const onlineCount = allOnlineIds.length
  const hasSharing = !!position && !geoError && !sharingPaused
  const statusText = geoError
    ? '位置不可用'
    : sharingPaused
      ? '已暂停共享'
      : position
        ? '正在共享'
        : '获取位置中'

  return (
    <div className="rp-page">
      <header className={`rp-header${scrolled ? ' is-scrolled' : ''}`}>
        <button className="rp-back-btn" onClick={() => navigate('/dashboard')} aria-label="返回">
          <BackIcon />
        </button>

        <div className="rp-header__center">
          <div className="rp-room-icon">
            <PinIcon size={15} />
          </div>
          <div className="rp-header__text">
            <h1 className="rp-header__name">{displayName}</h1>
            <div className="rp-header__sub">
              {displayCode && <span className="rp-header__code">{displayCode}</span>}
              <span className="rp-header__online">{onlineCount} ONLINE</span>
            </div>
          </div>
        </div>

        <div className="rp-header__actions">
          <button className={`rp-status-pill${hasSharing ? ' is-live' : ''}${sharingPaused ? ' is-paused' : ''}`}>
            <span className="rp-pulse-dot" />
            {statusText}
          </button>

          <div className="rp-desktop-controls">
            <button className="rp-icon-btn" onClick={copyInvite} title="复制邀请链接">
              {copied ? <CheckIcon /> : <LinkIcon />}
            </button>
            <button
              className={`rp-icon-btn${sidebarOpen ? ' is-on' : ''}`}
              onClick={() => setSidebarOpen(o => !o)}
              title="朋友列表"
            >
              <MembersIcon />
              {onlineCount > 0 && <span className="rp-icon-btn__badge">{onlineCount > 9 ? '9+' : onlineCount}</span>}
            </button>
            {callActive || callStarting ? (
              <div className="rp-calling-tag">
                <span className="rp-pulse-dot is-hot" />
                {callStarting ? 'CALLING' : 'ON AIR'}
              </div>
            ) : (
              <div className="rp-call-wrap">
                <button className="rp-icon-btn" onClick={() => setCallMenu(v => !v)} title="发起通话">
                  <PhoneIcon />
                </button>
                {callMenu && <CallMenu onClose={() => setCallMenu(false)} onStart={startCall} direction="down" />}
              </div>
            )}
          </div>

          <button className="rp-leave-btn" onClick={handleLeave}>
            STOP
          </button>
        </div>
      </header>

      <div className="rp-body">
        <div className="rp-map-wrap">
          <MapView
            members={members}
            selfPosition={position}
            onlineUserIds={allOnlineIds}
            currentUserId={user?.id}
            flyTarget={flyTarget}
          />

          {copied && (
            <div className="rp-map-toast rp-map-toast--ok">
              LINK COPIED
            </div>
          )}

          {geoError && !callActive && (
            <div className="rp-map-toast rp-map-toast--warn">
              <WarnIcon />
              <span>{geoError.message || '无法获取位置信息'}</span>
            </div>
          )}

          {callError && (
            <div className="rp-map-toast rp-map-toast--err">
              {callError}
            </div>
          )}

          {callStarting && !callActive && (
            <div className="rp-map-toast rp-map-toast--calling">
              <span className="mini-spinner" />
              <span>正在开始通话…</span>
            </div>
          )}

          {callActive && (
            <VideoCall
              livekitToken={livekitToken}
              livekitUrl={livekitUrl}
              withVideo={withVideo}
              members={members}
              currentUser={user}
              roomId={numRoomId}
              onStop={stopCall}
              onConnected={handleCallConnected}
              onError={handleCallError}
            />
          )}

          <div className="rp-mobile-bar">
            <button
              className={`rp-mb-members${sidebarOpen ? ' is-on' : ''}`}
              onClick={() => setSidebarOpen(o => !o)}
            >
              <MembersIcon size={18} />
              <span>{onlineCount} 人</span>
            </button>

            <button className="rp-mb-share" onClick={() => setSharingPaused(v => !v)} disabled={!!geoError || !position}>
              <span className={`rp-share-dot${hasSharing ? ' is-live' : ''}`} />
              <span>{sharingPaused ? 'Resume' : 'Pause'}</span>
            </button>

            <button className="rp-mb-link" onClick={copyInvite}>
              {copied ? <CheckIcon size={18} /> : <LinkIcon size={18} />}
              <span>Invite</span>
            </button>

            {callActive ? (
              <button className="rp-mb-endcall" onClick={stopCall}>
                END
              </button>
            ) : callStarting ? (
              <button className="rp-mb-call is-starting" disabled>
                <span className="mini-spinner mini-spinner--light" />
                <span>Call</span>
              </button>
            ) : (
              <div className="rp-call-wrap">
                <button className="rp-mb-call" onClick={() => setCallMenu(v => !v)}>
                  <PhoneIcon size={18} />
                  <span>Call</span>
                </button>
                {callMenu && <CallMenu onClose={() => setCallMenu(false)} onStart={startCall} direction="up" />}
              </div>
            )}
          </div>
        </div>

        {sidebarOpen && <div className="rp-backdrop" onClick={() => setSidebarOpen(false)} />}

        <aside className={`rp-sidebar${sidebarOpen ? ' is-open' : ''}`}>
          <MemberList
            members={members}
            onlineUserIds={allOnlineIds}
            currentUserId={user?.id}
            onFlyTo={(coords) => {
              setFlyTarget(coords)
              if (window.innerWidth < 1024) setSidebarOpen(false)
            }}
          />
        </aside>
      </div>
    </div>
  )
}
