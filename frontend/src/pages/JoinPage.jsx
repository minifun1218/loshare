import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { joinRoom } from '../api/rooms'
import { PinFilledIcon } from '../components/icons'

export default function JoinPage() {
  const { code } = useParams()
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (!user) {
      sessionStorage.setItem('pendingInvite', code.toUpperCase())
      navigate('/login', { replace: true })
      return
    }
    joinRoom(code.toUpperCase())
      .then(room => navigate(`/room/${room.id}`, { state: { room }, replace: true }))
      .catch(() => navigate('/dashboard', { replace: true }))
  }, [loading, user, code, navigate])

  return (
    <div className="simple-page">
      <div className="simple-card join-card anim-fade-up">
        <div className="auth-brand">
          <div className="brand__mark">
            <PinFilledIcon />
          </div>
          <span className="auth-brand__name">LoShare<span className="brand__dot" /></span>
        </div>

        <div className="join-people" aria-hidden="true">
          <span style={{ background: '#ff4d1c' }}>L</span>
          <span style={{ background: '#eae4d3', color: '#17150f' }}>M</span>
          <span style={{ background: '#1c4dff' }}>你</span>
          <span style={{ background: '#17150f' }}>K</span>
        </div>

        <div className="verify-state">
          <div className="join-spinner" />
          <h2>正在加入朋友地图</h2>
          <p>加入后就能看到大家的位置。</p>
          {code && (
            <div className="join-code-chip">
              <span className="join-code-chip__label">邀请码</span>
              <span className="join-code-chip__value">{code.toUpperCase()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
