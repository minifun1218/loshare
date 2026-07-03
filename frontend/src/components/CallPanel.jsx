import { useState, useCallback, useMemo } from 'react'
import {
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
  useRoomContext,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { startEgress, stopEgress } from '../api/livekit'
import { getErrorMessage } from '../utils/errorMessage'
import ParticipantTile from './ParticipantTile'
import { MicOnIcon, MicOffIcon, VideoIcon, VideoOffIcon, RecordIcon, HangupIcon } from './icons'

function ControlBtn({ onClick, title, active = false, children }) {
  return (
    <button onClick={onClick} title={title} className={`call-control${active ? ' is-active' : ''}`}>
      {children}
    </button>
  )
}

export default function CallPanel({ members, currentUser, roomId, onStop }) {
  const room = useRoomContext()
  const {
    localParticipant,
    isMicrophoneEnabled,
    isCameraEnabled,
    lastMicrophoneError,
    lastCameraError,
  } = useLocalParticipant()
  const remoteParticipants = useRemoteParticipants()
  const cameraSources = useMemo(
    () => [{ source: Track.Source.Camera, withPlaceholder: true }],
    [],
  )
  const cameraTracks = useTracks(cameraSources, { onlySubscribed: false })

  const [collapsed, setCollapsed] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [egressId, setEgressId] = useState(null)
  const [recordError, setRecordError] = useState(null)

  const memberMap = Object.fromEntries(members.map(m => [String(m.user_id), m]))
  const allParticipants = localParticipant
    ? [localParticipant, ...remoteParticipants]
    : remoteParticipants
  const totalCount = allParticipants.length

  const handleToggleMic = useCallback(() => {
    localParticipant
      ?.setMicrophoneEnabled(!isMicrophoneEnabled)
      ?.catch((err) => console.error('切换麦克风失败:', err))
  }, [localParticipant, isMicrophoneEnabled])

  const handleToggleCam = useCallback(() => {
    localParticipant
      ?.setCameraEnabled(!isCameraEnabled)
      ?.catch((err) => console.error('切换摄像头失败:', err))
  }, [localParticipant, isCameraEnabled])

  const handleStop = useCallback(async () => {
    if (isRecording && egressId) {
      await stopEgress(egressId).catch(() => {})
    }
    await room.disconnect()
    onStop()
  }, [room, isRecording, egressId, onStop])

  const handleToggleRecording = useCallback(async () => {
    setRecordError(null)
    if (isRecording && egressId) {
      try {
        await stopEgress(egressId)
        setIsRecording(false)
        setEgressId(null)
      } catch (err) {
        setRecordError(getErrorMessage(err, '停止录制失败'))
      }
    } else {
      try {
        const res = await startEgress(roomId)
        setEgressId(res.egress_id)
        setIsRecording(true)
      } catch (err) {
        setRecordError(getErrorMessage(err, '启动录制失败，请检查录制服务'))
      }
    }
  }, [isRecording, egressId, roomId])

  const mediaError = lastMicrophoneError || lastCameraError

  return (
    <div className="call-panel-wrap">
      <div className="call-panel">
        {recordError && <div className="call-panel__error">{recordError}</div>}
        {mediaError && (
          <div className="call-panel__error">
            {mediaError.name === 'NotAllowedError'
              ? '无法访问摄像头或麦克风，请在浏览器权限设置中允许访问。'
              : `媒体设备错误: ${mediaError.message}`}
          </div>
        )}

        {!collapsed && (
          <div className="call-panel__tiles">
            {allParticipants.map(p => {
              const isSelf = p.identity === String(currentUser?.id)
              const cameraTrack = cameraTracks.find(t => t.participant?.identity === p.identity)
              return (
                <ParticipantTile
                  key={p.identity}
                  participant={p}
                  cameraTrack={cameraTrack}
                  memberInfo={memberMap[p.identity]}
                  isSelf={isSelf}
                />
              )
            })}
            {remoteParticipants.length === 0 && (
              <div className="call-panel__waiting">
                <p>等朋友加入通话</p>
                <span>他们打开通话后会自动连上。</span>
              </div>
            )}
          </div>
        )}

        <div className="call-panel__bar">
          <div className="call-panel__status">
            <span className="rp-pulse-dot" />
            <span>{collapsed ? `通话中 · ${totalCount} 人` : `${totalCount} 人通话中`}</span>
            {isRecording && <em>录制中</em>}
          </div>

          <div className="call-panel__controls">
            <ControlBtn
              active={!isMicrophoneEnabled}
              onClick={handleToggleMic}
              title={isMicrophoneEnabled ? '关闭麦克风' : '开启麦克风'}
            >
              {isMicrophoneEnabled ? <MicOnIcon /> : <MicOffIcon />}
            </ControlBtn>

            <ControlBtn
              active={!isCameraEnabled}
              onClick={handleToggleCam}
              title={isCameraEnabled ? '关闭摄像头' : '开启摄像头'}
            >
              {isCameraEnabled ? <VideoIcon /> : <VideoOffIcon />}
            </ControlBtn>

            <ControlBtn
              active={isRecording}
              onClick={handleToggleRecording}
              title={isRecording ? '停止录制' : '开始录制'}
            >
              <RecordIcon recording={isRecording} />
            </ControlBtn>

            <ControlBtn onClick={() => setCollapsed(c => !c)} title={collapsed ? '展开' : '收起'}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={collapsed ? 'rotate-180' : ''}>
                <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </ControlBtn>

            <button onClick={handleStop} title="结束通话" className="call-panel__hangup">
              <HangupIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
