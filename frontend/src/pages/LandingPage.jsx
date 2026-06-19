import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import Logo from '../components/Logo.jsx'
import HeroDemo from '../components/landing/HeroDemo.jsx'
import MagneticButton from '../components/landing/MagneticButton.jsx'

// reveal on scroll into view
function Reveal({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

// staggered container for grids
const grid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}
const item = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}

// hero choreography
const heroBox = { hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } } }
const heroItem = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
}

const STEPS = [
  { n: '01', title: 'Upload', body: 'Drop in an MP4, MOV, or WebM — up to 500 MB. It starts processing the moment it lands.' },
  { n: '02', title: 'Process', body: 'We pull keyframes and transcribe the audio, then index every moment so it’s searchable.' },
  { n: '03', title: 'Ask', body: 'Ask in plain language. Answers come back with the exact timestamps and frames behind them.' },
]

const FEATURES = [
  { title: 'Sees, not just hears', body: 'A vision model reads the actual frames — colors, charts, faces — not only the transcript.', icon: <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" /> },
  { title: 'Timestamped answers', body: 'Every claim links to the exact second it came from. No scrubbing to verify.', icon: <path d="M12 7v5l3 2 M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" /> },
  { title: 'Streaming responses', body: 'Answers stream in token by token — you read the first words while the rest arrives.', icon: <path d="M4 7h16 M4 12h10 M4 17h7" /> },
  { title: 'Pick your model', body: 'Swap between GPT-4o, Gemini, Claude, and Qwen vision models from one dropdown.', icon: <path d="M12 3 3 8l9 5 9-5-9-5Z M3 16l9 5 9-5 M3 12l9 5 9-5" /> },
  { title: 'Click to jump', body: 'Frame thumbnails and timecodes seek the player straight to the moment.', icon: <path d="m10 8 6 4-6 4V8Z M3 5h18v14H3z" /> },
  { title: 'Runs on your machine', body: 'Videos, frames, and embeddings stay local. One API key powers the answers.', icon: <path d="M4 4h16v6H4z M4 14h16v6H4z M8 7h.01 M8 17h.01" /> },
]

function FeatureIcon({ children }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-amber-500" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

export default function LandingPage() {
  const { scrollYProgress } = useScroll()
  const glowA = useTransform(scrollYProgress, [0, 1], [0, -180])
  const glowB = useTransform(scrollYProgress, [0, 1], [0, 220])
  const gridY = useTransform(scrollYProgress, [0, 1], [0, -60])

  return (
    <div className="relative min-h-full overflow-hidden bg-ink-900 text-mist-100">
      {/* ambient parallax field */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div style={{ y: glowA }} className="absolute -top-40 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[130px] animate-gradient-drift" />
        <motion.div style={{ y: glowB }} className="absolute bottom-10 right-0 h-[30rem] w-[30rem] rounded-full bg-indigo-500/10 blur-[130px]" />
        {/* faint timeline grid */}
        <motion.div
          style={{ y: gridY }}
          className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px)] [background-size:88px_100%]"
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        {/* nav */}
        <nav className="flex items-center justify-between py-5">
          <div className="flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <span className="font-display text-lg font-semibold tracking-tight">
              Video<span className="text-amber-500">RAG</span>
            </span>
          </div>
          <Link to="/app" className="rounded-lg border border-ink-500 px-4 py-2 text-sm font-medium text-mist-100 transition hover:border-amber-500/60 hover:text-amber-400">
            Open app
          </Link>
        </nav>

        {/* hero */}
        <header className="grid items-center gap-10 py-12 sm:py-20 lg:grid-cols-2 lg:gap-12">
          <motion.div variants={heroBox} initial="hidden" animate="show">
            <motion.p variants={heroItem} className="font-mono text-xs uppercase tracking-eyebrow text-amber-500">
              Ask your videos
            </motion.p>
            <motion.h1 variants={heroItem} className="mt-4 font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              Skip to the
              <span className="relative whitespace-nowrap text-amber-500">
                {' '}answer
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.7, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute -bottom-1 left-0 h-1 w-full origin-left rounded bg-amber-500/40"
                />
              </span>
              .
            </motion.h1>
            <motion.p variants={heroItem} className="mt-6 max-w-md text-lg leading-relaxed text-mist-300">
              Upload a video and ask in plain language. VideoRAG watches the frames
              and reads the transcript, then answers with the exact timestamps —
              click to jump straight there.
            </motion.p>
            <motion.div variants={heroItem} className="mt-8 flex flex-wrap items-center gap-4">
              <MagneticButton
                to="/app"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-amber-500 px-6 py-3 font-semibold text-ink-900 shadow-[0_0_28px_rgba(245,196,81,0.3)] transition hover:bg-amber-400"
              >
                <span className="relative">Upload a video</span>
                <svg className="relative h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </MagneticButton>
              <a href="#how" className="rounded-xl border border-ink-500 px-6 py-3 font-medium text-mist-100 transition hover:border-ink-400">
                See how it works
              </a>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <HeroDemo />
          </motion.div>
        </header>

        {/* how it works */}
        <section id="how" className="scroll-mt-20 py-16 sm:py-24">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-eyebrow text-mist-500">How it works</p>
            <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Three steps from upload to answer
            </h2>
          </Reveal>
          <motion.div variants={grid} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-ink-600 bg-ink-600 sm:grid-cols-3">
            {STEPS.map((s) => (
              <motion.div key={s.n} variants={item} className="group flex h-full flex-col bg-ink-800 p-7 transition-colors hover:bg-ink-700">
                <span className="font-mono text-sm text-amber-500">{s.n}</span>
                <h3 className="mt-4 font-display text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mist-300">{s.body}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* features */}
        <section className="py-16 sm:py-24">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-eyebrow text-mist-500">What you get</p>
            <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Grounded answers, not guesses
            </h2>
          </Reveal>
          <motion.div variants={grid} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <motion.div key={f.title} variants={item} whileHover={{ y: -4 }} className="group h-full rounded-2xl border border-ink-600 bg-ink-800 p-6 transition hover:border-amber-500/40">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-ink-500 bg-ink-700 transition group-hover:border-amber-500/40 group-hover:bg-ink-600">
                  <FeatureIcon>{f.icon}</FeatureIcon>
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mist-300">{f.body}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* footer CTA */}
        <section className="py-16 sm:py-24">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-ink-800 px-8 py-14 text-center">
              <div className="pointer-events-none absolute inset-0 bg-amber-500/5" />
              <h2 className="relative font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Got a video with answers in it?
              </h2>
              <p className="relative mx-auto mt-4 max-w-md text-mist-300">
                Upload one and start asking. No account needed.
              </p>
              <div className="relative mt-8 flex justify-center">
                <MagneticButton
                  to="/app"
                  className="group relative inline-block overflow-hidden rounded-xl bg-amber-500 px-7 py-3 font-semibold text-ink-900 shadow-[0_0_28px_rgba(245,196,81,0.3)] transition hover:bg-amber-400"
                >
                  <span className="relative">Upload a video</span>
                </MagneticButton>
              </div>
            </div>
          </Reveal>
        </section>

        {/* footer */}
        <footer className="flex flex-col items-center justify-between gap-4 border-t border-ink-700 py-8 text-sm text-mist-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo className="h-6 w-6" />
            <span className="font-display font-semibold text-mist-300">VideoRAG</span>
          </div>
          <p className="font-mono text-xs">Vision · transcript · timestamps</p>
        </footer>
      </div>
    </div>
  )
}
