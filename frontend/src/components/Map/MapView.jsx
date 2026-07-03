import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import { createMemberIcon } from './memberIcon'

function MapController({ center, flyTarget }) {
  const map = useMap()

  useEffect(() => {
    if (flyTarget) map.flyTo(flyTarget, 16, { animate: true, duration: 1.1 })
  }, [flyTarget, map])

  useEffect(() => {
    if (center && !flyTarget) map.flyTo(center, map.getZoom(), { animate: true, duration: 1.1 })
  }, [center, map, flyTarget])

  return null
}

function formatTime(isoStr) {
  if (!isoStr) return '还没更新'
  const diff = (Date.now() - new Date(isoStr).getTime()) / 1000
  if (diff < 60) return '刚刚更新'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  return `${Math.floor(diff / 86400)} 天前`
}

export default function MapView({ members, selfPosition, onlineUserIds, currentUserId, flyTarget }) {
  const selfMember = members.find(m => m.user_id === currentUserId)
  const center = selfMember
    ? [selfMember.latitude, selfMember.longitude]
    : selfPosition
      ? [selfPosition.latitude, selfPosition.longitude]
      : [39.9042, 116.4074]

  return (
    <MapContainer
      center={center}
      zoom={14}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapController
        center={selfMember ? [selfMember.latitude, selfMember.longitude] : null}
        flyTarget={flyTarget}
      />

      {members.filter(member => member.latitude != null && member.longitude != null).map((member) => {
        const isSelf = member.user_id === currentUserId
        const isOnline = onlineUserIds.includes(member.user_id) || isSelf
        const icon = createMemberIcon(member.username, member.avatar_color, isOnline, isSelf)

        return (
          <Marker
            key={member.user_id}
            position={[member.latitude, member.longitude]}
            icon={icon}
            zIndexOffset={isSelf ? 1000 : 0}
          >
            <Popup>
              <div className="map-popup">
                <div className="map-popup__avatar" style={{ background: member.avatar_color }}>
                  {member.username[0].toUpperCase()}
                </div>
                <div className="map-popup__body">
                  <p className="map-popup__name">
                    {member.username}{isSelf ? ' · 我' : ''}
                  </p>
                  <p className="map-popup__status">
                    {isOnline ? '正在共享' : '已暂停共享'} · {formatTime(member.updated_at)}
                  </p>
                  {member.accuracy && (
                    <p className="map-popup__meta">
                      位置精度约 {Math.round(member.accuracy)} m
                    </p>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        )
      })}

      {selfPosition && selfMember && (
        <Circle
          center={[selfMember.latitude, selfMember.longitude]}
          radius={selfPosition.accuracy || 30}
          pathOptions={{ color: '#4da3a8', fillColor: '#4da3a8', fillOpacity: 0.10, weight: 1.5 }}
        />
      )}
    </MapContainer>
  )
}
