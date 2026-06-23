import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Logo from '../components/Logo.jsx'
import MagneticButton from '../components/landing/MagneticButton.jsx'
import SmoothScroll from '../components/landing/SmoothScroll.jsx'
import LiveDemo from '../components/landing/LiveDemo.jsx'

const EASE = [0.16, 1, 0.3, 1]

const grid = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const cell = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE } },
}

function Reveal({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

const NAV_LINKS = [
  { label: 'Product', href: '#hero' },
  { label: 'How it works', href: '#how' },
  { label: 'Advantages', href: '#advantages' },
  { label: 'Pricing', href: '#release' },
]

const Icon = ({ d, className = 'h-6 w-6' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const PATHS = {
  crosshair: 'M12 2v3 M12 19v3 M2 12h3 M19 12h3 M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  asterisk: 'M12 4v16 M4.5 8 19.5 16 M19.5 8 4.5 16',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  clock: 'M12 7v5l3 2 M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
  stream: 'M4 7h16 M4 12h10 M4 17h7',
  layers: 'M12 3 3 8l9 5 9-5-9-5Z M3 16l9 5 9-5 M3 12l9 5 9-5',
  film: 'm10 8 6 4-6 4V8Z M3 5h18v14H3z',
  lock: 'M6 11h12v9H6z M9 11V8a3 3 0 0 1 6 0v3',
}

const STEPS = [
  { n: '01', t: 'Drop it in', b: 'MP4, MOV, or WebM up to 5 GB. Processing starts the moment the file lands.' },
  { n: '02', t: 'It gets watched', b: 'A vision model reads the keyframes while Whisper transcribes the audio — every moment indexed.' },
  { n: '03', t: 'Ask anything', b: 'Type a question in plain language. The answer cites the exact timecode and the frames behind it.' },
  { n: '04', t: 'Land on the frame', b: 'Click any timecode and the player jumps straight to that second.' },
]

const ADVANTAGES = [
  { icon: PATHS.eye, t: 'Reads the picture', b: 'A vision model sees the actual frames — charts, faces, slides, scenery — not just the transcript.' },
  { icon: PATHS.clock, t: 'Answers carry timecode', b: 'Every claim links to the exact second it came from. Click it and the player jumps there.' },
  { icon: PATHS.stream, t: 'Streams as it thinks', b: 'Responses arrive token by token — read the opening line while the rest is still writing.' },
  { icon: PATHS.layers, t: 'Your pick of model', b: 'Switch between GPT-4o, Gemini, Claude, and Qwen vision models from a single dropdown.' },
  { icon: PATHS.film, t: 'Frames you can scrub', b: 'Keyframe thumbnails and timecodes seek the player straight to the moment in question.' },
  { icon: PATHS.lock, t: 'Stays on your box', b: 'Footage, frames, and embeddings live on your machine. One API key powers the answers.' },
]

// ── Bottom ticker marquee ─────────────────────────────────────────
const TICKER = [
  { title: 'Reading the picture and the transcript together', date: 'Jun 2026' },
  { title: 'Answers that carry the exact timecode', date: 'Jun 2026' },
  { title: 'Switch between GPT-4o, Gemini, Claude & Qwen', date: 'May 2026' },
  { title: 'Keyframes you can scrub to in one click', date: 'May 2026' },
  { title: 'Footage and embeddings stay on your box', date: 'Apr 2026' },
]
function Ticker() {
  const items = [...TICKER, ...TICKER]
  return (
    <div className="marquee-mask overflow-hidden rounded-pill bg-ink-800 py-2.5">
      <div className="marquee-track animate-marquee">
        {items.map((t, i) => (
          <span key={i} className="mx-5 inline-flex items-center gap-3 text-[0.85rem]">
            <span className="h-5 w-5 shrink-0 rounded-full bg-amber-500" />
            <span className="text-mist-300">{t.title}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span className="text-[0.8rem] text-mist-500">{t.date}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return <span className="text-[0.7rem] font-semibold uppercase tracking-eyebrow text-amber-500">{children}</span>
}

export default function LandingPage() {
  return (
    <div className="min-h-full bg-ink-900 text-mist-100">
      <SmoothScroll />

      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* ── Navbar ───────────────────────────────────────────── */}
        <motion.nav
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="flex items-center justify-between"
        >
          <Link to="/" className="flex items-center gap-2.5">
            <Logo className="h-9 w-9" />
            <span className="text-xl font-bold tracking-tight text-mist-100">VideoRAG</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} className="text-[0.9rem] font-normal text-[#333333] transition-colors hover:text-mist-100">
                {l.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden text-[0.9rem] font-normal text-[#333333] transition-colors hover:text-mist-100 sm:inline">
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-pill border-[1.5px] border-mist-100 bg-transparent px-5 py-2 text-[0.9rem] font-medium text-mist-100 transition-colors hover:bg-mist-100 hover:text-white"
            >
              Sign Up
            </Link>
          </div>
        </motion.nav>

        {/* ── Hero — heading + 50/50 live video (left) | ask chat (right) ── */}
        <section id="hero" className="mt-10">
          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
            <SectionLabel>AI video search</SectionLabel>
            <h1 className="headline mt-3 max-w-3xl text-[2.5rem] font-bold uppercase leading-[1.05] text-mist-100 sm:text-[3.25rem]">
              Ask your footage with AI
            </h1>
            <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-mist-300">
              Upload a video and ask in plain language. VideoRAG reads the picture and
              the transcript, then answers with the exact timecode — click it to jump
              straight to the moment.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <MagneticButton
                to="/register"
                className="inline-flex items-center gap-2 rounded-pill bg-mist-100 px-7 py-3.5 text-[0.85rem] font-semibold uppercase tracking-[0.05em] text-white transition-colors hover:bg-[#333333]"
              >
                Get started
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </MagneticButton>
              <div className="flex items-center gap-2">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-700 text-amber-500">
                  <Icon d={PATHS.crosshair} className="h-5 w-5" />
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-500 text-white">
                  <Icon d={PATHS.asterisk} className="h-5 w-5" />
                </span>
              </div>
            </div>
          </motion.div>

          {/* video aside (left half) · ask chat (right half) */}
          <motion.div
            variants={grid}
            initial="hidden"
            animate="show"
            className="mt-8 grid gap-3 lg:h-[440px] lg:grid-cols-2"
          >
            <LiveDemo />
          </motion.div>
        </section>

        {/* ── How it works ─────────────────────────────────────── */}
        <section id="how" className="mt-16 scroll-mt-20">
          <Reveal>
            <SectionLabel>How it works</SectionLabel>
            <h2 className="mt-3 text-display-xl text-mist-100">Four steps from upload to answer</h2>
          </Reveal>
          <motion.div
            variants={grid}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            {STEPS.map((s) => (
              <motion.div
                key={s.n}
                variants={cell}
                whileHover={{ y: -4 }}
                className="flex h-full flex-col rounded-card bg-ink-800 p-6 transition-colors hover:bg-[#FAFBFC]"
              >
                <span className="text-3xl font-bold text-amber-500">{s.n}</span>
                <h3 className="mt-4 text-[1.05rem] font-semibold text-mist-100">{s.t}</h3>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-mist-300">{s.b}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ── Advantages ───────────────────────────────────────── */}
        <section id="advantages" className="mt-16 scroll-mt-20">
          <Reveal>
            <SectionLabel>Advantages</SectionLabel>
            <h2 className="mt-3 text-display-xl text-mist-100">Grounded answers, not guesses</h2>
          </Reveal>
          <motion.div
            variants={grid}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {ADVANTAGES.map((a) => (
              <motion.div
                key={a.t}
                variants={cell}
                whileHover={{ y: -4 }}
                className="group flex h-full flex-col rounded-card bg-ink-800 p-6 transition-colors hover:bg-[#FAFBFC]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-badge bg-amber-500/10 text-amber-500 transition-colors group-hover:bg-amber-500 group-hover:text-white">
                  <Icon d={a.icon} className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-[1.05rem] font-semibold text-mist-100">{a.t}</h3>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-mist-300">{a.b}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ── New release strip ────────────────────────────────── */}
        <section id="release" className="mt-16 scroll-mt-20">
          <div className="grid items-center gap-3 rounded-card bg-night-900 p-8 text-white sm:grid-cols-[1fr_auto]">
            <div>
              <span className="text-[0.7rem] font-semibold uppercase tracking-eyebrow text-fog">New release</span>
              <h2 className="mt-2 text-[1.4rem] font-semibold">Now answering with the exact timecode</h2>
              <p className="mt-2 max-w-md text-[0.9rem] leading-relaxed text-fog">
                Every claim links to the second it came from. Click the timecode and the
                player jumps straight there — grounded answers, not guesses.
              </p>
              <Link
                to="/register"
                className="mt-5 inline-flex items-center gap-2 rounded-pill bg-amber-500 px-6 py-3 text-[0.85rem] font-semibold uppercase tracking-[0.05em] text-white transition-colors hover:bg-amber-600"
              >
                Try it free
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Link>
            </div>
            <div className="flex items-center justify-center rounded-card bg-night-950 p-6">
              <svg viewBox="0 0 120 120" className="h-24 w-24" aria-hidden="true">
                <polygon points="60,22 98,43 60,64 22,43" fill="#3B82F6" />
                <polygon points="22,43 60,64 60,104 22,83" fill="#1F2937" />
                <polygon points="98,43 60,64 60,104 98,83" fill="#93C5FD" />
              </svg>
            </div>
          </div>
        </section>

        {/* ── Ticker ───────────────────────────────────────────── */}
        <section className="mt-3">
          <Ticker />
        </section>

        {/* ── Footer ───────────────────────────────────────────── */}
        <footer className="mt-12 flex flex-col items-center justify-between gap-4 py-6 text-[0.85rem] text-mist-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo className="h-6 w-6" />
            <span className="font-semibold text-mist-300">VideoRAG</span>
          </div>
          <p>picture · transcript · timecode</p>
        </footer>
      </div>
    </div>
  )
}
