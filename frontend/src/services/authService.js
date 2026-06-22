import api from './api'

export async function register({ email, password }) {
  const { data } = await api.post('/auth/register', { email, password })
  return data // { access_token, token_type, user: { id, email } }
}

export async function login({ email, password }) {
  const { data } = await api.post('/auth/login', { email, password })
  return data // { access_token, token_type, user: { id, email } }
}

export async function me() {
  const { data } = await api.get('/auth/me')
  return data // { id, email }
}
