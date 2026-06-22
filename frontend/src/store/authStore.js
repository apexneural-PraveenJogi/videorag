import { create } from 'zustand'

const STORAGE_KEY = 'videorag_auth'

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { token: null, refreshToken: null, user: null }
    const parsed = JSON.parse(raw)
    return {
      token: parsed.token || null,
      refreshToken: parsed.refreshToken || null,
      user: parsed.user || null,
    }
  } catch {
    return { token: null, refreshToken: null, user: null }
  }
}

export const useAuthStore = create((set) => ({
  ...loadInitial(),
  setAuth: (token, refreshToken, user) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, refreshToken, user }))
    } catch {
      // ignore storage failures (private mode, quota)
    }
    set({ token, refreshToken, user })
  },
  setAccessToken: (token) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : {}
      parsed.token = token
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
    } catch {
      // ignore
    }
    set({ token })
  },
  logout: () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    set({ token: null, refreshToken: null, user: null })
  },
}))
