import { memberColor } from '../utils/memberColor'
import { CheckIcon, CopyIcon, MapIcon, PlusIcon } from './icons'

function formatRelative(dateStr) {
  if (!dateStr) return 'JUST CREATED'
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'JUST UPDATED'
  if (m < 60) return `${m} MIN AGO`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} HR AGO`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} D AGO`
  return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export default function RoomCard({ room, currentUserId, codeCopied, onClick, onCopyCode, onInvite, onLeave, animDelay }) {
  const isOwner = room.owner_id === currentUserId
  const memberCount = room.member_count || 0
  const visibleAvatars = Math.min(Math.max(memberCount, 1), 4)
  const extra = Math.max(0, memberCount - 4)
  const ownerColor = memberColor(room.id)
  const initials = (room.name || '?').trim()[0]?.toUpperCase() || '?'

  return (
    <article
      onClick={onClick}
      className="room anim-fade-up"
      style={{ animationDelay: `${animDelay}ms` }}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onClick() }}
    >
      <div className="room__identity">
        <div className="room__avatar" style={{ background: ownerColor.solid, color: ownerColor.soft }}>
          {initials}
        </div>
        <div className="room__head-info">
          <div className="room__title-row">
            <h3 className="room__title">{room.name}</h3>
            {isOwner && <span className="room__badge">Owner</span>}
          </div>
          <p className="room__time">{formatRelative(room.created_at)}</p>
        </div>
      </div>

      <div className="room__members">
        <div className="stack">
          {Array.from({ length: visibleAvatars }).map((_, i) => {
            const c = memberColor(room.id + i + 1)
            return (
              <div key={i} className="stack__item" style={{ background: c.solid, zIndex: 10 - i }}>
                {i === 0 ? initials : String.fromCharCode(65 + ((i * 5 + room.id) % 26))}
                <span className="stack__dot" />
              </div>
            )
          })}
          {extra > 0 && <div className="stack__item stack__more">+{extra}</div>}
        </div>
        <div className="room__members-meta">
          <p className="room__members-text">{memberCount} MEMBERS</p>
          <p className="room__members-hint"><span className="live-dot is-hot" /> LIVE</p>
        </div>
      </div>

      <button onClick={onCopyCode} className={`code-row${codeCopied ? ' is-copied' : ''}`}>
        <span className="code-row__icon">{codeCopied ? <CheckIcon /> : <CopyIcon />}</span>
        <span className="code-row__label">{codeCopied ? '已复制' : '邀请码'}</span>
        <span className="code-row__value">{room.code}</span>
      </button>

      <div className="room__actions">
        <button onClick={onClick} className="btn-primary btn-sm room__open">
          <MapIcon />
          Open
        </button>
        <button onClick={onInvite} className="room__invite-btn" aria-label="邀请朋友" title="邀请朋友">
          <PlusIcon />
        </button>
        <button onClick={onLeave} className="room__leave">
          STOP
        </button>
      </div>
    </article>
  )
}
