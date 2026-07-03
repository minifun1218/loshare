import client from './client'

export const createRoom = (name) => client.post('/api/rooms', { name }).then(r => r.data)
export const joinRoom = (code) => client.post(`/api/rooms/join/${code}`).then(r => r.data)
export const listMyRooms = () => client.get('/api/rooms').then(r => r.data)
export const getRoomMembers = (roomId) => client.get(`/api/rooms/${roomId}/members`).then(r => r.data)
export const leaveRoom = (roomId) => client.delete(`/api/rooms/${roomId}/leave`).then(r => r.data)
