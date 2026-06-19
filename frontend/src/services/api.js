import axios from 'axios'

// Same-origin: Vite proxies /api -> backend in dev; in prod they're served together.
export const API_BASE = '/api/v1'

const api = axios.create({ baseURL: API_BASE })

api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const detail =
      error.response?.data?.detail || error.message || 'Unexpected error'
    return Promise.reject(new Error(detail))
  },
)

export default api
