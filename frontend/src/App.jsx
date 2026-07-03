import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { DialogProvider } from './contexts/DialogContext'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import RoomPage from './pages/RoomPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import JoinPage from './pages/JoinPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--color-paper)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-[3px] border-t-transparent animate-spin" style={{ borderColor: 'var(--color-ink)', borderTopColor: 'transparent' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-mono)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
            Loading…
          </span>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (!user.is_verified) return <Navigate to="/verify-email" replace />
  return children
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return !user ? children : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <DialogProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/login"
            element={<GuestRoute><AuthPage mode="login" /></GuestRoute>}
          />
          <Route
            path="/register"
            element={<GuestRoute><AuthPage mode="register" /></GuestRoute>}
          />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/join/:code" element={<JoinPage />} />
          <Route
            path="/dashboard"
            element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
          />
          <Route
            path="/room/:roomId"
            element={<ProtectedRoute><RoomPage /></ProtectedRoute>}
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      </DialogProvider>
    </AuthProvider>
  )
}
