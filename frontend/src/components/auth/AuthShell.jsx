import { Link } from 'react-router-dom'
import Logo from '../Logo.jsx'

// Shared chrome for the auth screens: the cutting-room ground (ambient amber
// glow + faint timeline grid) wrapping a "slate" card. Keeps Login/Register
// visually identical to the landing without duplicating the scaffolding.
export const authInputClass =
  'w-full rounded-lg border border-ink-600 bg-ink-900/60 px-3 py-2.5 text-mist-100 placeholder:text-mist-500 transition focus:border-amber-500/60 focus:outline-none'

export default function AuthShell({ eyebrow, title, children, footer }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ink-900 px-6 py-12 text-mist-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[130px]" />
        <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px)] [background-size:96px_100%]" />
      </div>

      <Link to="/" className="relative mb-8 flex items-center gap-2.5">
        <Logo className="h-8 w-8" />
        <span className="font-display text-xl font-extrabold tracking-tight">
          Video<span className="text-amber-500">RAG</span>
        </span>
      </Link>

      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-ink-600 bg-ink-800/70 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)] backdrop-blur">
        <div className="flex items-center justify-between border-b border-ink-600 px-7 py-3">
          <span className="font-mono text-[11px] uppercase tracking-eyebrow text-amber-500">{eyebrow}</span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-mist-500">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> REC
          </span>
        </div>
        <div className="p-7">
          <h1 className="font-display text-3xl font-black uppercase tracking-tight">{title}</h1>
          <div className="mt-6">{children}</div>
          {footer ? <div className="mt-6 text-center text-sm text-mist-300">{footer}</div> : null}
        </div>
      </div>
    </div>
  )
}
