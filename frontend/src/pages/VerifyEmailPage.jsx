import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { verifyEmail, resendVerification } from '../api/auth'
import { useAuth } from '../contexts/AuthContext'
import { PinFilledIcon, CheckIcon, CloseIcon, MailIcon } from '../components/icons'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const token = searchParams.get('token')

  const [verifyState, setVerifyState] = useState(() => token ? 'loading' : 'idle')
  const [verifyError, setVerifyError] = useState('')
  const [email, setEmail] = useState(user?.email || '')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [resendError, setResendError] = useState('')

  useEffect(() => {
    if (!token) return
    verifyEmail(token)
      .then(() => setVerifyState('success'))
      .catch(err => {
        setVerifyState('error')
        setVerifyError(err.response?.data?.detail || '验证失败，请重试')
      })
  }, [token])

  const handleResend = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setResendLoading(true)
    setResendMessage('')
    setResendError('')
    try {
      const res = await resendVerification(email.trim())
      setResendMessage(res.message)
    } catch (err) {
      setResendError(err.response?.data?.detail || '发送失败，请稍后重试')
    } finally {
      setResendLoading(false)
    }
  }

  if (token && verifyState === 'loading') {
    return (
      <PageShell>
        <div className="verify-state">
          <div className="join-spinner" />
          <h2>正在确认邮箱</h2>
          <p>马上就好。</p>
        </div>
      </PageShell>
    )
  }

  if (token && verifyState === 'success') {
    return (
      <PageShell>
        <div className="verify-state anim-fade-up">
          <div className="auth-icon auth-icon--success">
            <CheckIcon size={28} />
          </div>
          <h2>邮箱已验证</h2>
          <p>现在可以回到 LoShare，和朋友共享位置。</p>
          <button
            onClick={() => { logout(); navigate('/login', { replace: true }) }}
            className="btn-primary btn-block"
          >
            前往登录
          </button>
        </div>
      </PageShell>
    )
  }

  if (token && verifyState === 'error') {
    return (
      <PageShell>
        <div className="verify-state anim-fade-up">
          <div className="auth-icon auth-icon--error">
            <CloseIcon size={28} strokeWidth={2.5} />
          </div>
          <h2>链接不可用</h2>
          <p className="text-error">{verifyError}</p>
          <ResendForm
            email={email}
            onChange={setEmail}
            onSubmit={handleResend}
            loading={resendLoading}
            message={resendMessage}
            error={resendError}
          />
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="verify-state anim-fade-up">
        <div className="auth-icon auth-icon--primary">
          <MailIcon />
        </div>
        <h2>验证一下邮箱</h2>
        <p>
          验证邮件已发到 {user?.email ? <strong>{user.email}</strong> : '你的邮箱'}，点开链接就能继续。
        </p>
        <div className="auth-note">
          没收到的话，先看看垃圾邮件文件夹，也可以重新发一封。
        </div>
        <ResendForm
          email={email}
          onChange={setEmail}
          onSubmit={handleResend}
          loading={resendLoading}
          message={resendMessage}
          error={resendError}
        />
        <Link to="/login" onClick={logout} className="quiet-link">
          返回登录
        </Link>
      </div>
    </PageShell>
  )
}

function ResendForm({ email, onChange, onSubmit, loading, message, error }) {
  return (
    <form onSubmit={onSubmit} className="resend-form">
      <div className="input-action">
        <input
          type="email"
          placeholder="输入注册邮箱"
          value={email}
          onChange={e => onChange(e.target.value)}
          className="input-base"
          required
        />
        <button type="submit" disabled={loading} className="btn-primary btn-sm">
          {loading ? '发送中' : '重新发送'}
        </button>
      </div>
      {message && <p className="form__hint form__hint--success">{message}</p>}
      {error && <p className="form__error">{error}</p>}
    </form>
  )
}

function PageShell({ children }) {
  return (
    <div className="simple-page">
      <div className="simple-card">
        <div className="auth-brand">
          <div className="brand__mark">
            <PinFilledIcon />
          </div>
          <span className="auth-brand__name">LoShare<span className="brand__dot" /></span>
        </div>
        {children}
      </div>
    </div>
  )
}
