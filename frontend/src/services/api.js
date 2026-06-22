import axios from 'axios'

// Same-origin: Vite proxies /api -> backend in dev; in prod they're served together.
export const API_BASE = '/api/v1'

const AUTH_KEY = 'videorag_auth'

const api = axios.create({ baseURL: API_BASE })

function readAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function clearAndRedirect() {
  try {
    localStorage.removeItem(AUTH_KEY)
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.assign('/login')
  }
}

// Attach the bearer token (if any) to every request.
api.interceptors.request.use((config) => {
  const auth = readAuth()
  if (auth?.token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${auth.token}`
  }
  return config
})

api.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    const original = error.config || {}
    const status = error.response?.status
    const auth = readAuth()
    const isRefreshCall = original.url && original.url.includes('/auth/refresh')

    // On a 401, try a single silent refresh, then replay the original request.
    if (status === 401 && auth?.refreshToken && !original._retried && !isRefreshCall) {
      original._retried = true
      try {
        const { data } = await api.post('/auth/refresh', {
          refresh_token: auth.refreshToken,
        })
        const next = { ...auth, token: data.access_token }
        localStorage.setItem(AUTH_KEY, JSON.stringify(next))
        original.headers = original.headers || {}
        original.headers.Authorization = `Bearer ${data.access_token}`
        return api(original)
      } catch {
        clearAndRedirect()
      }
    } else if (status === 401) {
      clearAndRedirect()
    }

    const detail =
      error.response?.data?.detail || error.message || 'Unexpected error'
    return Promise.reject(new Error(detail))
  },
)

export default api
