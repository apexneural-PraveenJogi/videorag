import api from './api'

// Returns { default, models: [{ id, label }] } — all vision-capable.
export async function getModels() {
  const { data } = await api.get('/models')
  return data
}
