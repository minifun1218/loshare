import client from './client'

export async function getLivekitToken(roomId) {
  const { data } = await client.get('/api/livekit/token', { params: { room_id: roomId } })
  return data // { token, url, room_name }
}

export async function startEgress(roomId) {
  const { data } = await client.post('/api/livekit/egress/start', { room_id: roomId })
  return data // { egress_id, filepath }
}

export async function stopEgress(egressId) {
  const { data } = await client.delete(`/api/livekit/egress/${egressId}`)
  return data
}
