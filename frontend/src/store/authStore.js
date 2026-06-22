import { create } from 'zustand'

const STORAGE_KEY = 'videorag_auth'

// Read persisted auth from localStorage so a refresh keeps the session.
function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { token: null, user: null }
    const parsed = JSON.parse(raw)
    return { token: parsed.token || null, user: parsed.user || null }
  } catch {
    return { token: null, user: null }
  }
}

export const useAuthStore = create((set) => ({
  ...loadInitial(),
  setAuth: (token, user) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }))
    } catch {
      // ignore storage failures (private mode, quota)
    }
    set({ token, user })
  },
  logout: () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    set({ token: null, user: null })
  },
}))
