import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { formatTimestamp } from '../../utils/formatTimestamp'

// The signature hero: a REAL video loops in a "monitor" while a waveform scrubs
// under a playhead and a timecode ticks — all driven by the video's actual
// playback time. If the clip can't load we fall back to a synthetic animation
// so the hero never looks broken.

const HERO_SRC = '/hero.mp4'
const BARS = 64

// Deterministic waveform heights (no Math.random — stable across SSR/runs).
const HEIGHTS = Array.from({ length: BARS }, (_, i) => {
  const a = Math.sin(i * 0.6) * 0.5 + 0.5
  const b = Math.sin(i * 1.7 + 1.1) * 0.5 + 0.5
  return 0.18 + (a * 0.6 + b * 0.4) * 0.82
})

// Fallback "scenes" (only used if the video fails to load).
const FALLBACK_TOTAL = 228
const FALLBACK_LOOP_MS = 11000
const SCENES = [
  { start: 0.0, grad: 'from-sky-500 via-indigo-500 to-indigo-700' },
  { start: 0.22, grad: 'from-amber-400 via-orange-500 to-rose-600' },
  { start: 0.46, grad: 'from-emerald-400 via-teal-500 to-cyan-700' },
  { start: 0.68, grad: 'from-fuchsia-400 via-purple-500 to-indigo-700' },
  { start: 0.88, grad: 'from-orange-400 via-red-500 to-rose-700' },
]

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export default function HeroTimeline() {
  const videoRef = useRef(null)
  const raf = useRef(0)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(10)
  const [videoOk, setVideoOk] = useState(true)

  // Drive progress from the video's real currentTime (smooth via rAF).
  useEffect(() => {
    if (!videoOk) return
    const loop = () => {
      const v = videoRef.current
      if (v && v.duration) setProgress(v.currentTime / v.duration)
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf.current)
  }, [videoOk])

  // Fallback synthetic playhead if the video can't load.
  useEffect(() => {
    if (videoOk || prefersReducedMotion()) return
    let start
    const tick = (now) => {
      if (start === undefined) start = now
      setProgress(((now - start) % FALLBACK_LOOP_MS) / FALLBACK_LOOP_MS)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [videoOk])

  const total = videoOk ? duration : FALLBACK_TOTAL
  let sceneIdx = 0
  for (let i = 0; i < SCENES.length; i++) if (progress >= SCENES[i].start) sceneIdx = i
  const fallbackScene = SCENES[sceneIdx]

  return (
    <div className="rounded-2xl border border-ink-500/70 bg-ink-800/80 p-3 shadow-2xl backdrop-blur-xl sm:p-5">
      {/* monitor */}
      <div className="relative aspect-video overflow-hidden rounded-xl bg-ink-900">
        {videoOk ? (
          <video
            ref={videoRef}
            src={HERO_SRC}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onLoadedMetadata={(e) => {
              setDuration(e.currentTarget.duration || 10)
              e.currentTarget.muted = true
              if (!prefersReducedMotion()) e.currentTarget.play().catch(() => {})
            }}
            onError={() => setVideoOk(false)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div
              key={fallbackScene.grad}
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              className={`absolute inset-0 bg-gradient-to-br ${fallbackScene.grad}`}
            />
          </AnimatePresence>
        )}

        {/* vignette + grade */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.5))]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink-900/80 to-transparent" />
        {/* sweeping scanline */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/8 to-transparent animate-scan" />
        </div>
        {/* HUD */}
        <div className="absolute left-3 top-3 flex items-center gap-2 font-mono text-[11px] text-white/90">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-blink" />
          LIVE
        </div>
        <div className="absolute right-3 top-3 rounded bg-ink-900/70 px-2 py-0.5 font-mono text-[11px] text-mist-300">
          sample.mp4
        </div>
        <div className="absolute bottom-3 left-3 font-mono text-sm tabular-nums text-white">
          {formatTimestamp(progress * total)}
          <span className="text-white/50"> / {formatTimestamp(total)}</span>
        </div>
      </div>

      {/* waveform scrubber (synced to the video) */}
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
        {/* playhead */}
        <div
          className="absolute inset-y-0 w-px bg-amber-400 shadow-[0_0_12px_2px_rgba(245,196,81,0.7)]"
          style={{ left: `calc(0.75rem + ${progress} * (100% - 1.5rem))` }}
        >
          <span className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 rounded-sm bg-amber-400" />
        </div>
      </div>

      {/* faux question chip — ties the motif to the product */}
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-ink-500/60 bg-ink-900/60 px-3 py-2">
        <span className="font-mono text-[11px] text-amber-500">ASK</span>
        <span className="truncate text-sm text-mist-300">
          “What’s on screen at <span className="font-mono text-amber-400">{formatTimestamp(progress * total)}</span>?”
        </span>
        <span className="ml-auto h-3 w-1.5 bg-amber-400 animate-blink" />
      </div>
    </div>
  )
}
