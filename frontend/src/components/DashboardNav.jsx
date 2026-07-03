import { PinFilledIcon, LogoutIcon } from './icons'
import ThemeSwitcher from './ThemeSwitcher'
import useScrolled from '../hooks/useScrolled'

export default function DashboardNav({ user, avatarColor, theme, onThemeChange, onLogout }) {
  const scrolled = useScrolled(40)

  return (
    <header className={`app-header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="app-header__inner">
        <div className="nav-edge nav-edge--brand">
          <div className="brand">
            <div className="brand__mark">
              <PinFilledIcon />
            </div>
            <span className="brand__name">LoShare<span className="brand__dot" /></span>
          </div>
        </div>

        <div className="nav-edge nav-edge--actions">
          <div className="account-bar">
            <ThemeSwitcher value={theme} onChange={onThemeChange} />
            <div className="zine-stamp" title={user?.email || user?.username || '当前用户'}>
              <div className="zine-stamp__avatar" style={{ background: avatarColor }}>
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <div className="zine-stamp__text">
                <span className="zine-stamp__label">{user?.is_verified ? 'VERIFIED' : 'SIGNED IN'}</span>
                <span className="zine-stamp__name">{user?.username}</span>
              </div>
            </div>
            <button className="logout-btn" onClick={onLogout} aria-label="退出登录" title="退出登录">
              <LogoutIcon />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}