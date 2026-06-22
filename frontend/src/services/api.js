import axios from 'axios'

// Same-origin: Vite proxies /api -> backend in dev; in prod they're served together.
export const API_BASE = '/api/v1'

const AUTH_KEY = 'videorag_auth'

const api = axios.create({ baseURL: API_BASE })

// Attach the bearer token (if any) to every request.
api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (raw) {
      const { token } = JSON.parse(raw)
      if (token) {
        config.headers = config.headers || {}
        config.headers.Authorization = `Bearer ${token}`
      }
    }
  } catch {
    // ignore malformed/unavailable storage
  }
  return config
})

api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    // On 401, the session is dead: clear it and bounce to /login.
    if (error.response?.status === 401) {
      try {
        localStorage.removeItem(AUTH_KEY)
      } catch {
        // ignore
      }
      if (
        typeof window !== 'undefined' &&
        window.location.pathname !== '/login'
      ) {
        window.location.assign('/login')
      }
    }
    const detail =
      error.response?.data?.detail || error.message || 'Unexpected error'
    return Promise.reject(new Error(detail))
  },
)

export default api
