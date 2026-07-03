import client from './client'

export const register = (data) => client.post('/api/auth/register', data).then(r => r.data)
export const login = (data) => client.post('/api/auth/login', data).then(r => r.data)
export const getMe = () => client.get('/api/auth/me').then(r => r.data)
export const sendCode = (email) => client.post('/api/auth/send-code', { email }).then(r => r.data)
export const verifyEmail = (token) => client.get(`/api/auth/verify-email?token=${token}`).then(r => r.data)
export const resendVerification = (email) => client.post('/api/auth/resend-verification', { email }).then(r => r.data)
