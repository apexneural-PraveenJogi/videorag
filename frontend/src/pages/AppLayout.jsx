import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import HistoryDrawer from '../components/HistoryDrawer.jsx'
import { useAuthStore } from '../store/authStore'

// Shell for everything under /app: a compact dark header + the work area.
export default function AppLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const inVideo = pathname.includes('/app/video/')
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [historyOpen, setHistoryOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="flex h-full flex-col bg-ink-900 text-mist-100">
      <header className="flex items-center justify-between border-b border-ink-700 bg-ink-800/60 px-5 py-3 text-mist-100 backdrop-blur">
        <Link to="/app" className="flex items-center gap-2">
          <Logo className="h-7 w-7" />
          <span className="font-display text-lg font-extrabold tracking-tight">
            Video<span className="text-amber-500">RAG</span>
          </span>
        </Link>
        <div className="flex items-center gap-2 text-sm sm:gap-3">
          {inVideo && (
            <Link
              to="/app"
              className="rounded-lg px-2.5 py-1.5 text-mist-300 transition hover:text-mist-100"
            >
              ← New upload
            </Link>
          )}
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-ink-500 px-3 py-1.5 font-medium text-mist-100 transition hover:border-amber-500/60 hover:text-amber-400"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v5h5 M3.05 13a9 9 0 1 0 2.6-6.3L3 8 M12 7v5l3 2" />
            </svg>
            History
          </button>
          {user?.email && (
            <span className="hidden max-w-[14rem] truncate text-mist-300 md:inline">
              {user.email}
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg px-2.5 py-1.5 text-mist-300 transition hover:text-mist-100"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>

      <HistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  )
}
