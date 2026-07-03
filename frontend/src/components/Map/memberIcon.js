import L from 'leaflet'

export function createMemberIcon(username, avatarColor, isOnline, isSelf) {
  const initial = (username?.[0] || '?').toUpperCase()
  const size = isSelf ? 50 : 42
  const label = isSelf ? `${username} · 我` : username
  const dotColor = isOnline ? '#52b788' : '#c7c1b6'
  const ringColor = isSelf ? '#4da3a8' : avatarColor

  const html = `
    <div class="map-marker${isSelf ? ' is-self' : ''}${isOnline ? ' is-online' : ' is-offline'}">
      <div class="map-marker__halo" style="border-color:${ringColor}"></div>
      <div class="map-marker__avatar" style="width:${size}px;height:${size}px;background:${avatarColor}">
        ${initial}
        <span class="map-marker__dot" style="background:${dotColor}"></span>
      </div>
      <div class="map-marker__label">${label}</div>
    </div>
  `

  return L.divIcon({
    className: '',
    html,
    iconSize: [isSelf ? 82 : 72, isSelf ? 86 : 78],
    iconAnchor: [isSelf ? 41 : 36, isSelf ? 70 : 64],
    popupAnchor: [0, -62],
  })
}
