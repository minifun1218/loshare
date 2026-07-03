import { useState } from 'react'
import { joinRoom } from '../../api/rooms'
import Modal from '../Modal'

export default function JoinRoomModal({ onClose, onJoined }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!code.trim()) { setError('请输入邀请码'); return }
    setLoading(true)
    try {
      const room = await joinRoom(code.trim().toUpperCase())
      onJoined(room)
    } catch (err) {
      setError(err.response?.data?.detail || '邀请码不对或已失效')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="查看朋友位置" onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <div className="form__field">
          <label className="form__label">6 位邀请码</label>
          <input
            type="text"
            placeholder="例如 A3K9P2"
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }}
            className={`input-base input-code${error ? ' is-error' : ''}`}
            autoFocus
            maxLength={6}
          />
          {error && <span className="form__error">{error}</span>}
          <p className="form__hint">邀请码在朋友分享的链接里也能看到。</p>
        </div>
        <div className="form__actions">
          <button type="button" onClick={onClose} className="btn-secondary btn-sm">取消</button>
          <button type="submit" disabled={loading || code.length < 6} className="btn-primary btn-sm">
            {loading && <span className="mini-spinner" />}
            加入地图
          </button>
        </div>
      </form>
    </Modal>
  )
}
