import { useState } from 'react'
import { createRoom } from '../../api/rooms'
import { getErrorMessage } from '../../utils/errorMessage'
import Modal from '../Modal'

export default function CreateRoomModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError('给这张地图起个名字'); return }
    setLoading(true)
    try {
      const room = await createRoom(name.trim())
      onCreated(room)
    } catch (err) {
      setError(getErrorMessage(err, '创建失败'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="分享我的位置" onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <div className="form__field">
          <label className="form__label">地图名称</label>
          <input
            type="text"
            placeholder="比如：周五聚餐、周末徒步"
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            className={`input-base${error ? ' is-error' : ''}`}
            autoFocus
            maxLength={50}
          />
          {error && <span className="form__error">{error}</span>}
          <p className="form__hint">创建后可以复制链接发给朋友。</p>
        </div>
        <div className="form__actions">
          <button type="button" onClick={onClose} className="btn-secondary btn-sm">取消</button>
          <button type="submit" disabled={loading} className="btn-primary btn-sm">
            {loading && <span className="mini-spinner" />}
            创建并分享
          </button>
        </div>
      </form>
    </Modal>
  )
}
