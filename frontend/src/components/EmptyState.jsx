import { PinIcon, UsersIcon, EnterIcon } from './icons'

export default function EmptyState({ onCreate, onJoin }) {
  return (
    <div className="empty anim-fade-up">
      <div className="empty__icon" aria-hidden="true">
        <UsersIcon />
      </div>
      <h3 className="empty__title">NO MAPS YET</h3>
      <p className="empty__sub">
        创建一张地图，或输入朋友发来的邀请码。
      </p>
      <div className="empty__actions">
        <button onClick={onCreate} className="btn-primary">
          <PinIcon />
          创建地图
        </button>
        <button onClick={onJoin} className="btn-secondary">
          <EnterIcon />
          加入地图
        </button>
      </div>
    </div>
  )
}
