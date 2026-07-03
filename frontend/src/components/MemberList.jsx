function formatStatus(member, isOnline, isSelf) {
  if (!member.latitude) return { text: 'NO FIX YET', color: 'muted' }
  if (!isOnline && !isSelf) return { text: 'PAUSED', color: 'muted' }
  const diff = (Date.now() - new Date(member.updated_at).getTime()) / 1000
  if (diff < 60) return { text: 'LIVE', color: 'online' }
  if (diff < 300) return { text: `${Math.floor(diff / 60)} MIN AGO`, color: 'online' }
  if (diff < 3600) return { text: `${Math.floor(diff / 60)} MIN AGO`, color: 'dim' }
  if (diff < 86400) return { text: `${Math.floor(diff / 3600)} HR AGO`, color: 'dim' }
  return { text: `${Math.floor(diff / 86400)} D AGO`, color: 'muted' }
}

function distanceMeters(a, b) {
  if (!a?.latitude || !a?.longitude || !b?.latitude || !b?.longitude) return null
  const r = 6371000
  const toRad = (n) => n * Math.PI / 180
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * r * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function formatDistance(meters, isSelf) {
  if (isSelf) return '我在这里'
  if (meters == null) return 'DIST —'
  if (meters < 1000) return `${Math.round(meters)} M`
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} KM`
}

const STATUS_COLOR = {
  online: 'var(--color-red)',
  dim: 'var(--color-text-2)',
  muted: 'var(--color-text-muted)',
}

export default function MemberList({ members, onlineUserIds, currentUserId, onFlyTo }) {
  const self = members.find(m => m.user_id === currentUserId)
  const sorted = [...members].sort((a, b) => {
    if (a.user_id === currentUserId) return -1
    if (b.user_id === currentUserId) return 1
    const aOnline = onlineUserIds.includes(a.user_id)
    const bOnline = onlineUserIds.includes(b.user_id)
    if (aOnline !== bOnline) return aOnline ? -1 : 1
    return new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
  })

  const onlineCount = onlineUserIds.length

  return (
    <div className="ml-root">
      <div className="ml-head">
        <div>
          <span className="ml-head__label">CREW</span>
          <p className="ml-head__sub">点头像定位到地图上</p>
        </div>
        <div className="ml-head__online">
          <span className="rp-pulse-dot is-hot" />
          {onlineCount} ONLINE
        </div>
      </div>

      <div className="ml-list">
        {sorted.length === 0 ? (
<div className="ml-empty">
          <div className="ml-empty__icon">
            <MembersIcon />
          </div>
          <p className="ml-empty__text">NO CREW YET</p>
        </div>
        ) : (
          sorted.map(member => {
            const isSelf = member.user_id === currentUserId
            const isOnline = isSelf || onlineUserIds.includes(member.user_id)
            const hasLocation = member.latitude != null
            const status = formatStatus(member, isOnline, isSelf)
            const distance = formatDistance(distanceMeters(self, member), isSelf)

            return (
              <button
                key={member.user_id}
                className={`ml-member${hasLocation ? ' clickable' : ''}`}
                onClick={() => hasLocation && onFlyTo?.([member.latitude, member.longitude])}
                disabled={!hasLocation}
              >
                <div className="ml-member__avatar-wrap">
                  <div
                    className="ml-member__avatar"
                    style={{
                      background: member.avatar_color,
                      opacity: isOnline ? 1 : 0.58,
                    }}
                  >
                    {member.username[0].toUpperCase()}
                  </div>
                  <span className={`ml-member__status-dot${isOnline ? ' online' : ''}`} />
                </div>

                <div className="ml-member__info">
                  <div className="ml-member__name-row">
                    <span className="ml-member__name">{member.username}</span>
                    {isSelf && <span className="ml-member__self">You</span>}
                  </div>
                  <span className="ml-member__distance">{distance}</span>
                  <span className="ml-member__time" style={{ color: STATUS_COLOR[status.color] }}>
                    {status.text}
                  </span>
                </div>

                {hasLocation && (
                  <div className="ml-member__fly">
                    <PinIcon />
                  </div>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

function MembersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm7-4a4 4 0 014 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 21s7-6.45 7-12A7 7 0 105 9c0 5.55 7 12 7 12z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="12" cy="9" r="2.4" fill="currentColor" />
    </svg>
  )
}
