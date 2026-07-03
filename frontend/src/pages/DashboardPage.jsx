import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDialog } from '../contexts/DialogContext'
import { listMyRooms, joinRoom, leaveRoom } from '../api/rooms'
import DashboardNav from '../components/DashboardNav'
import FriendsMapSection from '../components/FriendsMapSection'
import CreateRoomModal from '../components/modals/CreateRoomModal'
import JoinRoomModal from '../components/modals/JoinRoomModal'
import InviteModal from '../components/modals/InviteModal'
import Marquee from '../components/Marquee'
import ThemeDecor from '../components/ThemeDecor'
import { getThemeMarqueeWords } from '../components/themeWords'
import useCopy from '../hooks/useCopy'
import { memberColor } from '../utils/memberColor'
import { PinIcon, UsersIcon, PlusIcon, EnterIcon, ArrowIcon, MapIcon, LinkIcon } from '../components/icons'
import dashboardHeroFriends from '../assets/dashboard-hero-friends.webp'

const VALID_THEMES = ['zine', 'minimal', 'glass', 'editorial']

function greeting() {
  const h = new Date().getHours()
  if (h < 6) return '深夜营业'
  if (h < 11) return '早安'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  if (h < 22) return '晚上好'
  return '深夜营业'
}

function totalFriends(rooms) {
  return rooms.reduce((sum, room) => sum + Math.max((room.member_count || 0) - 1, 0), 0)
}

function readTheme() {
  try {
    const raw = localStorage.getItem('loshare_theme')
    if (raw && VALID_THEMES.includes(raw)) return raw
  } catch {
    /* ignore */
  }
  return 'zine'
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { confirm: confirmDialog, alert: alertDialog } = useDialog()

  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [inviteRoom, setInviteRoom] = useState(null)
  const [theme, setTheme] = useState(readTheme)
  const { copiedKey, copy } = useCopy()

  useEffect(() => {
    try { localStorage.setItem('loshare_theme', theme) } catch { /* ignore */ }
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    let cancelled = false
    listMyRooms()
      .then(data => {
        if (!cancelled) setRooms(data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const pendingCode = sessionStorage.getItem('pendingInvite')
    if (!pendingCode) return
    sessionStorage.removeItem('pendingInvite')
    joinRoom(pendingCode)
      .then(room => {
        setRooms(r => [room, ...r.filter(x => x.id !== room.id)])
        navigate(`/room/${room.id}`, { state: { room }, replace: true })
      })
      .catch(() => {})
  }, [navigate])

  const handleLeave = async (e, roomId) => {
    e.stopPropagation()
    const ok = await confirmDialog({
      title: '停止共享',
      message: '确定停止和这组朋友共享吗？',
      confirmText: '停止共享',
      danger: true,
    })
    if (!ok) return
    try {
      await leaveRoom(roomId)
      setRooms(r => r.filter(rm => rm.id !== roomId))
    } catch (err) {
      await alertDialog({
        title: '操作失败',
        message: err.response?.data?.detail || '操作失败',
        type: 'error',
      })
    }
  }

  const myColor = memberColor(user?.id || 0)
  const friendCount = totalFriends(rooms)
  const latestRoom = rooms[0]
  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const marqueeWords = getThemeMarqueeWords(theme)
  const isLoginTitle = theme === 'editorial'

  return (
    <div className="app-bg" data-theme={theme}>
      <div className={`toast${copiedKey ? '' : ' toast--hidden'}`}>已复制 · COPIED</div>

      <DashboardNav
        user={user}
        avatarColor={myColor.solid}
        theme={theme}
        onThemeChange={setTheme}
        onLogout={handleLogout}
      />

      <main className="home-shell">
        <section className="home-hero anim-fade-up">
          <div className="home-hero__top">
            <div className="home-hero__map">
              <img src={dashboardHeroFriends} alt="" />
            </div>
            <div className="home-hero__scrim" />
            <div className="home-hero__grid" />
            <ThemeDecor theme={theme} />

            <div className="home-hero__chips" aria-hidden="true">
              <div className="hero-chip hero-chip--online">
                <span className="live-dot is-hot" />
                <span>{friendCount > 0 ? `${friendCount} FRIENDS ON THE MAP` : 'READY · STANDBY'}</span>
              </div>
              <div className="hero-chip hero-chip--card">
                <span className="hero-chip__avatar" style={{ background: '#ff4d1c' }}>林</span>
                <span className="hero-chip__text">
                  <strong>LIN · APPROACHING</strong>
                  <em>1.2 KM · ETA 4 MIN</em>
                </span>
              </div>
              <div className="hero-chip hero-chip--route">
                <span className="hero-chip__avatar" style={{ background: '#eae4d3', color: '#17150f' }}>周</span>
                <span className="hero-chip__text">
                  <strong>ARRIVAL ALERT ON</strong>
                  <em>ROUTE LIVE · 18 MIN</em>
                </span>
              </div>
            </div>

            <div className="home-hero__content">
              <p className="home-hero__eyebrow">
                <span className="live-dot is-hot" />
                {greeting()} · {user?.username?.toUpperCase()}
              </p>
              <h1 className="home-hero__title">
                <span>你的朋友</span>
                <span className={isLoginTitle ? '' : 'text-stroke'}>在同一张</span>
                <span>地图上。</span>
              </h1>
              <p className="home-hero__text">
                出门、聚会、旅行，把彼此的位置、路线和到达状态丢进同一张朋友地图。少一点反复确认，多一份看得见的陪伴。
              </p>
              <div className="home-hero__meta">
                <span><strong>{rooms.length}</strong> MAPS</span>
                <span><strong>{friendCount}</strong> FRIENDS</span>
                <span><span className="live-dot is-hot" /> INVITE-ONLY</span>
              </div>
              <div className="home-actions">
                <button className="btn-primary home-actions__primary" onClick={() => setModal('create')}>
                  <PinIcon />
                  开始共享位置
                </button>
                <button className="btn-secondary home-actions__secondary" onClick={() => setModal('join')}>
                  <UsersIcon />
                  加入朋友地图
                </button>
              </div>
            </div>
          </div>

          <Marquee duration={36}>
            {marqueeWords.map((w, i) => (
              <span className="marquee__chip" key={i}>
                {w.label}
                <em>{w.tag}</em>
              </span>
            ))}
          </Marquee>
        </section>

        <section className="quick-panel anim-fade-up" style={{ animationDelay: '50ms' }}>
          <button className="quick-card quick-card--accent" onClick={() => setModal('create')}>
            <span className="quick-card__icon"><PlusIcon /></span>
            <span className="quick-card__arrow"><ArrowIcon /></span>
            <span className="quick-card__body">
              <strong>创建同行地图</strong>
              <em>邀请可信朋友，一起查看路线、距离和到达状态。</em>
            </span>
          </button>
          <button className="quick-card" onClick={() => setModal('join')}>
            <span className="quick-card__icon"><EnterIcon /></span>
            <span className="quick-card__arrow"><ArrowIcon /></span>
            <span className="quick-card__body">
              <strong>加入朋友地图</strong>
              <em>输入邀请码，进入朋友创建的位置共享空间。</em>
            </span>
          </button>
          <button
            className="quick-card"
            disabled={!latestRoom}
            onClick={() => latestRoom && setInviteRoom(latestRoom)}
          >
            <span className="quick-card__icon"><LinkIcon /></span>
            <span className="quick-card__arrow"><ArrowIcon /></span>
            <span className="quick-card__body">
              <strong>分享邀请链接</strong>
              <em>{latestRoom ? `继续邀请朋友加入「${latestRoom.name}」` : '先创建一张同行地图'}</em>
            </span>
          </button>
        </section>

        <FriendsMapSection
          rooms={rooms}
          loading={loading}
          currentUserId={user?.id}
          copiedKey={copiedKey}
          onCreate={() => setModal('create')}
          onJoin={() => setModal('join')}
          onOpenRoom={room => navigate(`/room/${room.id}`, { state: { room } })}
          onCopyCode={room => copy(room.code, `code-${room.id}`)}
          onInvite={setInviteRoom}
          onLeave={handleLeave}
        />
      </main>

      <nav className="bottom-nav" aria-label="主要操作">
        <button className="bottom-nav__item is-active">
          <MapIcon />
          <span>Map</span>
        </button>
        <button className="bottom-nav__fab" onClick={() => setModal('create')} aria-label="分享位置">
          <PinIcon />
        </button>
        <button className="bottom-nav__item" onClick={() => setModal('join')}>
          <UsersIcon />
          <span>Crew</span>
        </button>
      </nav>

      {modal === 'create' && (
        <CreateRoomModal
          onClose={() => setModal(null)}
          onCreated={room => { setRooms(r => [room, ...r]); setModal(null); setInviteRoom(room) }}
        />
      )}
      {modal === 'join' && (
        <JoinRoomModal
          onClose={() => setModal(null)}
          onJoined={room => {
            setRooms(r => [room, ...r.filter(x => x.id !== room.id)])
            setModal(null)
            navigate(`/room/${room.id}`, { state: { room } })
          }}
        />
      )}
      {inviteRoom && (
        <InviteModal room={inviteRoom} onClose={() => setInviteRoom(null)} onCopy={copy} copiedKey={copiedKey} />
      )}
    </div>
  )
}