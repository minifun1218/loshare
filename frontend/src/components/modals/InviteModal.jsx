import { memberColor } from '../../utils/memberColor'
import Modal from '../Modal'
import { CheckIcon, CopyIcon, LinkIcon, MapIcon } from '../icons'

export default function InviteModal({ room, onClose, onCopy, copiedKey, onEnterRoom }) {
  const inviteLink = `${window.location.origin}/join/${room.code}`
  const codeCopied = copiedKey === `inv-code-${room.id}`
  const linkCopied = copiedKey === `inv-link-${room.id}`
  const ownerColor = memberColor(room.id)
  const initials = (room.name || '?').trim()[0]?.toUpperCase() || '?'

  return (
    <Modal title="邀请朋友" onClose={onClose}>
      <div className="invite">
        <div className="invite__hero">
          <div className="invite__avatar" style={{ background: ownerColor.solid, color: ownerColor.soft }}>
            {initials}
          </div>
          <div>
            <p className="invite__name">{room.name}</p>
            <p className="invite__hint">发给朋友后，他们就能加入这张地图。</p>
          </div>
        </div>

        <div className="invite__code">
          {room.code.split('').map((ch, i) => (
            <span key={i} className="invite__code-char">{ch}</span>
          ))}
        </div>

        <div className="invite__buttons">
          <button
            onClick={() => onCopy(room.code, `inv-code-${room.id}`)}
            className={`invite__btn${codeCopied ? ' is-copied' : ''}`}
          >
            <span className="invite__btn-ico">{codeCopied ? <CheckIcon /> : <CopyIcon />}</span>
            <span>{codeCopied ? '邀请码已复制' : '复制邀请码'}</span>
          </button>

          <button
            onClick={() => onCopy(inviteLink, `inv-link-${room.id}`)}
            className={`btn-primary invite__btn-primary${linkCopied ? ' is-copied' : ''}`}
          >
            {linkCopied ? <CheckIcon /> : <LinkIcon />}
            {linkCopied ? '链接已复制' : '复制邀请链接'}
          </button>
        </div>

        <div className="invite__link-preview">
          <span>{inviteLink}</span>
        </div>

        {onEnterRoom && (
          <button type="button" onClick={() => onEnterRoom(room)} className="invite__enter-btn">
            <MapIcon />
            进入房间
          </button>
        )}
      </div>
    </Modal>
  )
}
