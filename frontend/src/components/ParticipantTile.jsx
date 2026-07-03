import { VideoTrack } from '@livekit/components-react'

export default function ParticipantTile({ participant, cameraTrack, memberInfo, isSelf }) {
  const hasVideo =
    cameraTrack &&
    cameraTrack.publication &&
    !cameraTrack.publication.isMuted

  return (
    <div className="call-tile">
      {hasVideo ? (
        <VideoTrack trackRef={cameraTrack} className="call-tile__video" />
      ) : (
        <div className="call-tile__empty">
          <div
            className="call-tile__avatar"
            style={{ background: memberInfo?.avatar_color || '#4da3a8' }}
          >
            {(memberInfo?.username?.[0] || '?').toUpperCase()}
          </div>
        </div>
      )}
      <div className="call-tile__name">
        {isSelf
          ? `${memberInfo?.username || participant.name} · 我`
          : (memberInfo?.username || participant.name)}
      </div>
    </div>
  )
}
