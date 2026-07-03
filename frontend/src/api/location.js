import client from './client'

export const updateLocation = (data) => client.post('/api/location/update', data).then(r => r.data)
