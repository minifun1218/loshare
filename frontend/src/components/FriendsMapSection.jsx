import RoomCard from './RoomCard'
import EmptyState from './EmptyState'

export default function FriendsMapSection({
  rooms,
  loading,
  currentUserId,
  copiedKey,
  onCreate,
  onJoin,
  onOpenRoom,
  onCopyCode,
  onInvite,
  onLeave,
}) {
  return (
    <section className="friends-map anim-fade-up" style={{ animationDelay: '90ms' }}>
      <div className="section-head friends-map__head">
        <div>
          <p className="section-head__kicker">和谁分享</p>
          <h2>朋友地图</h2>
        </div>
        <span>{rooms.length} 张</span>
      </div>

      <div className="app-main friends-map__main">
        {loading ? (
          <div className="loading-row">
            <div className="join-spinner" />
          </div>
        ) : rooms.length === 0 ? (
          <EmptyState onCreate={onCreate} onJoin={onJoin} />
        ) : (
          <div className="rooms">
            {rooms.map((room, i) => (
              <RoomCard
                key={room.id}
                room={room}
                currentUserId={currentUserId}
                codeCopied={copiedKey === `code-${room.id}`}
                onClick={() => onOpenRoom(room)}
                onCopyCode={(e) => { e.stopPropagation(); onCopyCode(room) }}
                onInvite={(e) => { e.stopPropagation(); onInvite(room) }}
                onLeave={(e) => { e.stopPropagation(); onLeave(e, room.id) }}
                animDelay={i * 35}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
