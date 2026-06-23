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
      <header className="flex h-16 items-center justify-between px-6 text-mist-100">
        <Link to="/app" className="flex items-center gap-2.5">
          <Logo className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight">VideoRAG</span>
        </Link>
        <div className="flex items-center gap-2 text-[0.9rem] sm:gap-4">
          {inVideo && (
            <Link
              to="/app"
              className="px-2.5 py-1.5 font-normal text-[#333333] transition-colors hover:text-mist-100"
            >
              ← New upload
            </Link>
          )}
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-1.5 rounded-pill border-[1.5px] border-mist-100 px-4 py-1.5 font-medium text-mist-100 transition-colors hover:bg-mist-100 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v5h5 M3.05 13a9 9 0 1 0 2.6-6.3L3 8 M12 7v5l3 2" />
            </svg>
            History
          </button>
          {user?.email && (
            <span className="hidden max-w-[14rem] truncate font-normal text-mist-500 md:inline">
              {user.email}
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="px-2.5 py-1.5 font-normal text-[#333333] transition-colors hover:text-mist-100"
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
