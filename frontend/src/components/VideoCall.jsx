import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react'
import CallPanel from './CallPanel'

const LIVEKIT_ROOM_OPTIONS = { disconnectOnPageLeave: true }

export default function VideoCall({
  livekitToken,
  livekitUrl,
  withVideo,
  members,
  currentUser,
  roomId,
  onStop,
  onConnected,
  onError,
}) {
  return (
    <LiveKitRoom
      token={livekitToken}
      serverUrl={livekitUrl}
      connect={Boolean(livekitToken && livekitUrl)}
      video={withVideo}
      audio
      onConnected={onConnected}
      onDisconnected={(reason) => {
        console.log('[LiveKit] disconnected, reason:', reason)
        onStop()
      }}
      onError={(err) => {
        console.error('[LiveKit] connection error:', err)
        onError?.(err)
      }}
      options={LIVEKIT_ROOM_OPTIONS}
    >
      <RoomAudioRenderer />
      <CallPanel
        members={members}
        currentUser={currentUser}
        roomId={roomId}
        onStop={onStop}
      />
    </LiveKitRoom>
  )
}
