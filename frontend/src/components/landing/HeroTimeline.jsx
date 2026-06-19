import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { formatTimestamp } from '../../utils/formatTimestamp'

// The signature motion: a clip plays on a loop in a "monitor". A waveform scrubs
// under a spring-driven playhead, the previewed scene crossfades as the playhead
// crosses each keyframe, and a timecode ticks — the literal act of finding a
// moment in a video, which is what the product does.

const TOTAL = 228 // pretend clip is 3:48
const LOOP_MS = 11000
const BARS = 64

// Scenes the "monitor" cuts between. start is 0..1 along the clip.
const SCENES = [
  { start: 0.0, grad: 'from-sky-500 via-indigo-500 to-indigo-700', label: 'Intro' },
  { start: 0.22, grad: 'from-amber-400 via-orange-500 to-rose-600', label: 'Walkthrough' },
  { start: 0.46, grad: 'from-emerald-400 via-teal-500 to-cyan-700', label: 'The chart' },
  { start: 0.68, grad: 'from-fuchsia-400 via-purple-500 to-indigo-700', label: 'Q&A' },
  { start: 0.88, grad: 'from-orange-400 via-red-500 to-rose-700', label: 'Recap' },
]

// Deterministic waveform heights (no Math.random — keeps SSR/runs stable).
const HEIGHTS = Array.from({ length: BARS }, (_, i) => {
  const a = Math.sin(i * 0.6) * 0.5 + 0.5
  const b = Math.sin(i * 1.7 + 1.1) * 0.5 + 0.5
  return 0.18 + (a * 0.6 + b * 0.4) * 0.82
})

function sceneIndexFor(p) {
  let idx = 0
  for (let i = 0; i < SCENES.length; i++) if (p >= SCENES[i].start) idx = i
  return idx
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export default function HeroTimeline() {
  const [progress, setProgress] = useState(0.5)
  const raf = useRef(0)

  useEffect(() => {
    if (prefersReducedMotion()) return
    let start
    const tick = (now) => {
      if (start === undefined) start = now
      setProgress(((now - start) % LOOP_MS) / LOOP_MS)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [])

  const pct = `${(progress * 100).toFixed(2)}%`
  const scene = SCENES[sceneIndexFor(progress)]

  return (
    <div className="rounded-2xl border border-ink-500/70 bg-ink-800/80 p-3 shadow-2xl backdrop-blur-xl sm:p-5">
      {/* monitor */}
      <div className="relative aspect-video overflow-hidden rounded-xl bg-ink-900">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={scene.label}
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className={`absolute inset-0 bg-gradient-to-br ${scene.grad}`}
          />
        </AnimatePresence>
        {/* film grain / vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.55))]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-900/70 to-transparent" />
        {/* sweeping scanline */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-scan" />
        </div>
        {/* HUD */}
        <div className="absolute left-3 top-3 flex items-center gap-2 font-mono text-[11px] text-white/90">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-blink" />
          REC
        </div>
        <div className="absolute right-3 top-3 rounded bg-ink-900/70 px-2 py-0.5 font-mono text-[11px] text-mist-300">
          {scene.label}
        </div>
        <div className="absolute bottom-3 left-3 font-mono text-sm tabular-nums text-white">
          {formatTimestamp(progress * TOTAL)}
          <span className="text-white/50"> / {formatTimestamp(TOTAL)}</span>
        </div>
      </div>

      {/* waveform scrubber */}
      <div className="relative mt-3 h-16 rounded-lg bg-ink-900/70 px-3">
        <div className="flex h-full items-center justify-between gap-[2px]">
          {HEIGHTS.map((h, i) => {
            const pos = i / (BARS - 1)
            const played = pos <= progress
            const near = Math.abs(pos - progress) < 0.04
            return (
              <span
                key={i}
                className={`w-full rounded-full transition-colors duration-200 ${
                  near ? 'bg-amber-400' : played ? 'bg-amber-500/70' : 'bg-ink-500'
                }`}
                style={{ height: `${(h * (near ? 100 : 86)).toFixed(0)}%` }}
              />
            )
          })}
        </div>
        {/* keyframe markers */}
        {SCENES.map((s) => (
          <span
            key={s.label}
            className="absolute top-0 h-2 w-2 -translate-x-1/2 rounded-full border border-ink-800 bg-mist-500"
            style={{ left: `calc(0.75rem + ${s.start} * (100% - 1.5rem))` }}
          />
        ))}
        {/* spring playhead */}
        <motion.div
          className="absolute inset-y-0 w-px bg-amber-400 shadow-[0_0_12px_2px_rgba(245,196,81,0.7)]"
          style={{ left: `calc(0.75rem + ${progress} * (100% - 1.5rem))` }}
        >
          <span className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 rounded-sm bg-amber-400" />
        </motion.div>
      </div>

      {/* faux question chip — ties the motif to the product */}
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-ink-500/60 bg-ink-900/60 px-3 py-2">
        <span className="font-mono text-[11px] text-amber-500">ASK</span>
        <span className="truncate text-sm text-mist-300">
          “What’s on screen at <span className="font-mono text-amber-400">{formatTimestamp(progress * TOTAL)}</span>?”
        </span>
        <span className="ml-auto h-3 w-1.5 bg-amber-400 animate-blink" />
      </div>
    </div>
  )
}
