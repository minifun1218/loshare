import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { login as apiLogin, register as apiRegister, sendCode } from '../api/auth'
import { PinFilledIcon } from '../components/icons'
import authHeroFriends from '../assets/auth-hero-friends.webp'

const COUNTDOWN_SEC = 60

function useCountdown() {
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    if (countdown <= 0) return
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timerRef.current)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [countdown])

  return { countdown, setCountdown }
}

export default function AuthPage({ mode }) {
  const navigate = useNavigate()
  const { login } = useAuth()
  const isLogin = mode === 'login'

  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '', code: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState(false)
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [codeError, setCodeError] = useState('')
  const { countdown, setCountdown } = useCountdown()

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    setErrors(er => ({ ...er, [field]: '' }))
    setServerError('')
    setUnverifiedEmail(false)
  }

  const handleSendCode = async () => {
    if (!form.email.trim()) {
      setErrors(er => ({ ...er, email: '请输入邮箱' }))
      return
    }
    if (countdown > 0) return
    setCodeLoading(true)
    setCodeError('')
    try {
      await sendCode(form.email.trim())
      setCodeSent(true)
      setCountdown(COUNTDOWN_SEC)
    } catch (err) {
      setCodeError(err.response?.data?.detail || '发送失败')
    } finally {
      setCodeLoading(false)
    }
  }

  const validate = () => {
    const errs = {}
    if (!form.username.trim()) errs.username = '请输入用户名'
    if (!isLogin && !form.email.trim()) errs.email = '请输入邮箱'
    if (!form.password) errs.password = '请输入密码'
    if (!isLogin && form.password.length < 6) errs.password = '密码至少 6 位'
    if (!isLogin && form.password !== form.confirm) errs.confirm = '两次密码不一致'
    if (!isLogin && !form.code.trim()) errs.code = '请输入验证码'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setLoading(true)
    setServerError('')
    setUnverifiedEmail(false)
    try {
      const payload = isLogin
        ? { username: form.username, password: form.password }
        : { username: form.username, email: form.email, password: form.password, code: form.code }
      const data = isLogin ? await apiLogin(payload) : await apiRegister(payload)
      login(data)
      if (!data.user.is_verified) navigate('/verify-email', { replace: true })
      else navigate('/dashboard', { replace: true })
    } catch (err) {
      const detail = err.response?.data?.detail
      if (detail === 'EMAIL_NOT_VERIFIED') setUnverifiedEmail(true)
      else setServerError(detail || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-story">
        <div className="auth-story__brand">
          <div className="brand__mark">
            <PinFilledIcon />
          </div>
          <span>LoShare</span>
        </div>

        <div className="auth-story__photo" aria-hidden="true">
          <img src={authHeroFriends} alt="" />
          <div className="auth-story__photo-shade" />
        </div>

        <div className="auth-story__grid" aria-hidden="true" />

        <div className="auth-photo-card auth-photo-card--bottom">
          <div className="auth-photo-stack">
            <span style={{ background: '#ff4d1c' }}>L</span>
            <span style={{ background: '#eae4d3', color: '#17150f' }}>M</span>
            <span style={{ background: '#1c4dff' }}>你</span>
          </div>
          <div>
            <strong>3 FRIENDS NEARBY</strong>
            <em><span className="live-dot is-hot" />SHARING · LIVE NOW</em>
          </div>
        </div>

        <div className="auth-story__copy">
          <p>{isLogin ? 'WELCOME BACK' : 'PULL UP A SEAT'}</p>
          <h1>
            {isLogin ? (
              <>
                <span>看看</span>
                <span className="text-stroke">朋友都</span>
                <span>到哪了。</span>
              </>
            ) : (
              <>
                <span>和朋友</span>
                <span className="text-stroke">共享</span>
                <span>一张地图。</span>
              </>
            )}
          </h1>
          <span>只把位置分享给你邀请的人。需要时打开，不想分享时随时停下。</span>
        </div>
      </section>

      <section className="auth-form-wrap">
        <div className="auth-form-card anim-fade-up" data-mode={isLogin ? 'IN' : 'NEW'}>
          <div className="auth-form-card__head">
            <div className="auth-form-card__mobile-brand">
              <div className="brand__mark">
                <PinFilledIcon />
              </div>
              <span>LoShare</span>
            </div>
            <h2>{isLogin ? '登录' : '创建账号'}</h2>
            <p>{isLogin ? '继续查看朋友位置' : '创建后就能邀请朋友加入'}</p>
          </div>

          {serverError && (
            <Notice tone="error">{serverError}</Notice>
          )}

          {unverifiedEmail && (
            <Notice tone="warning">
              这个账号还没验证邮箱。
              <button type="button" onClick={() => navigate('/verify-email')}>去验证</button>
            </Notice>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <Field label="用户名 / USERNAME" error={errors.username}>
              <input
                type="text"
                placeholder="输入用户名"
                value={form.username}
                onChange={set('username')}
                className={`input-base${errors.username ? ' is-error' : ''}`}
                autoComplete="username"
              />
            </Field>

            {!isLogin && (
              <>
                <Field label="邮箱 / EMAIL" error={errors.email || codeError}>
                  <div className="input-action">
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={e => { set('email')(e); setCodeError(''); setCodeSent(false) }}
                      className={`input-base${(errors.email || codeError) ? ' is-error' : ''}`}
                      autoComplete="email"
                    />
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={codeLoading || countdown > 0}
                      className="btn-secondary btn-sm"
                    >
                      {codeLoading ? <span className="mini-spinner" /> : countdown > 0 ? `${countdown}s` : codeSent ? '重发' : '发送验证码'}
                    </button>
                  </div>
                </Field>

                <Field label="验证码 / CODE" error={errors.code} hint={codeSent ? '验证码 10 分钟内有效' : ''}>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={codeSent ? '输入 6 位验证码' : '请先发送验证码'}
                    value={form.code}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 6)
                      setForm(f => ({ ...f, code: v }))
                      setErrors(er => ({ ...er, code: '' }))
                    }}
                    className={`input-base input-code${errors.code ? ' is-error' : ''}`}
                    maxLength={6}
                    disabled={!codeSent}
                  />
                </Field>
              </>
            )}

            <Field label="密码 / PASSWORD" error={errors.password}>
              <input
                type="password"
                placeholder={isLogin ? '输入密码' : '至少 6 位'}
                value={form.password}
                onChange={set('password')}
                className={`input-base${errors.password ? ' is-error' : ''}`}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
            </Field>

            {!isLogin && (
              <Field label="确认密码 / CONFIRM" error={errors.confirm}>
                <input
                  type="password"
                  placeholder="再次输入密码"
                  value={form.confirm}
                  onChange={set('confirm')}
                  className={`input-base${errors.confirm ? ' is-error' : ''}`}
                  autoComplete="new-password"
                />
              </Field>
            )}

            <button type="submit" disabled={loading} className="btn-primary btn-block">
              {loading && <span className="mini-spinner mini-spinner--light" />}
              {loading ? '处理中' : (isLogin ? '登录' : '创建账号')}
            </button>
          </form>

          <p className="auth-switch">
            {isLogin ? '还没有账号？' : '已有账号？'}
            <Link to={isLogin ? '/register' : '/login'}>
              {isLogin ? '创建一个' : '去登录'}
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}

function Field({ label, error, hint, children }) {
  return (
    <div className="form__field">
      <label className="form__label">{label}</label>
      {children}
      {error && <span className="form__error">{error}</span>}
      {!error && hint && <span className="form__hint form__hint--success">{hint}</span>}
    </div>
  )
}

function Notice({ tone, children }) {
  return (
    <div className={`notice notice--${tone}`}>
      {children}
    </div>
  )
}