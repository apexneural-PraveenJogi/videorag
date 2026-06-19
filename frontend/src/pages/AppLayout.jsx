import { Link, Outlet, useLocation } from 'react-router-dom'
import Logo from '../components/Logo.jsx'

// Shell for everything under /app: a compact dark header + a light work area.
export default function AppLayout() {
  const { pathname } = useLocation()
  const inVideo = pathname.includes('/app/video/')

  return (
    <div className="flex h-full flex-col bg-ink-900 text-mist-100">
      <header className="flex items-center justify-between border-b border-ink-700 bg-ink-800/60 px-5 py-3 text-mist-100 backdrop-blur">
        <Link to="/app" className="flex items-center gap-2">
          <Logo className="h-7 w-7" />
          <span className="font-display text-lg font-semibold tracking-tight">
            Video<span className="text-amber-500">RAG</span>
          </span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {inVideo && (
            <Link to="/app" className="text-mist-300 transition hover:text-mist-100">
              ← New upload
            </Link>
          )}
          <Link
            to="/"
            className="font-mono text-xs uppercase tracking-eyebrow text-mist-500 transition hover:text-mist-300"
          >
            Home
          </Link>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
