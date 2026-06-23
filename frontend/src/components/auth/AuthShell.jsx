import { Link } from 'react-router-dom'
import Logo from '../Logo.jsx'

// Shared chrome for the auth screens: a flat white card on the steel page
// ground. No borders or shadows — depth is the card-vs-page contrast.
export const authInputClass =
  'w-full rounded-badge bg-ink-700 px-3.5 py-2.5 text-[0.95rem] text-mist-100 placeholder:text-mist-500 outline-none transition-colors focus:bg-[#E1E6EE] focus:ring-2 focus:ring-amber-500/40'

export default function AuthShell({ eyebrow, title, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-900 px-6 py-12 text-mist-100">
      <Link to="/" className="mb-8 flex items-center gap-2.5">
        <Logo className="h-9 w-9" />
        <span className="text-xl font-bold tracking-tight">VideoRAG</span>
      </Link>

      <div className="w-full max-w-sm overflow-hidden rounded-card bg-ink-800 p-7">
        <span className="text-[0.7rem] font-semibold uppercase tracking-eyebrow text-amber-500">{eyebrow}</span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{title}</h1>
        <div className="mt-6">{children}</div>
        {footer ? <div className="mt-6 text-center text-[0.9rem] text-mist-300">{footer}</div> : null}
      </div>
    </div>
  )
}
