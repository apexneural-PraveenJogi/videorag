import { useEffect, useRef, useState } from 'react'
import { formatTimestamp } from '../../utils/formatTimestamp'

// The signature motion: a playhead scrubs a clip on a loop; keyframes light up
// as it passes and a timecode counter ticks — the literal act of finding a
// moment in a video, which is what the product does.

const TOTAL = 228 // pretend the clip is 3:48 long
const LOOP_MS = 9000

// Faux scenes rendered as CSS gradients (no image assets). Position is 0..1.
const FRAMES = [
  { at: 0.08, grad: 'from-sky-400/80 to-indigo-500/70', tag: 'intro' },
  { at: 0.28, grad: 'from-amber-400/80 to-rose-500/60', tag: 'demo' },
  { at: 0.5, grad: 'from-emerald-400/80 to-teal-600/60', tag: 'chart' },
  { at: 0.72, grad: 'from-fuchsia-400/80 to-purple-600/60', tag: 'q&a' },
  { at: 0.9, grad: 'from-orange-400/80 to-red-500/60', tag: 'recap' },
]

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export default function HeroTimeline() {
  const [progress, setProgress] = useState(0.62)
  const raf = useRef(0)

  useEffect(() => {
    if (prefersReducedMotion()) return
    let start
    const tick = (now) => {
      if (start === undefined) start = now
      const p = ((now - start) % LOOP_MS) / LOOP_MS
      setProgress(p)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [])

  const pct = `${(progress * 100).toFixed(2)}%`

  return (
    <div className="rounded-2xl border border-ink-500/70 bg-ink-800/80 p-4 shadow-2xl backdrop-blur sm:p-6">
      {/* readout row */}
      <div className="mb-4 flex items-center justify-between font-mono text-xs text-mist-500">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-blink" />
          SCRUBBING
        </span>
        <span className="tabular-nums text-mist-300">
          {formatTimestamp(progress * TOTAL)} / {formatTimestamp(TOTAL)}
        </span>
      </div>

      {/* keyframe row */}
      <div className="mb-4 grid grid-cols-5 gap-2 sm:gap-3">
        {FRAMES.map((f) => {
          const active = progress >= f.at
          return (
            <div
              key={f.tag}
              className={`relative overflow-hidden rounded-lg border transition-all duration-500 ${
                active
                  ? 'border-amber-500/50 opacity-100'
                  : 'border-ink-500/60 opacity-40'
              }`}
            >
              <div className={`aspect-video bg-gradient-to-br ${f.grad}`} />
              {/* scanline shine */}
              {active && (
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-scan" />
              )}
              <span className="absolute bottom-1 left-1 rounded bg-ink-900/80 px-1 font-mono text-[9px] text-mist-300">
                {formatTimestamp(f.at * TOTAL)}
              </span>
            </div>
          )
        })}
      </div>

      {/* timeline track */}
      <div className="relative h-12 rounded-lg bg-ink-900/80">
        {/* ticks */}
        <div className="absolute inset-x-3 inset-y-0 flex items-center justify-between">
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className={`w-px ${i % 4 === 0 ? 'h-5 bg-ink-400' : 'h-2.5 bg-ink-500'}`}
            />
          ))}
        </div>
        {/* progress fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-l-lg bg-amber-500/10"
          style={{ width: pct }}
        />
        {/* playhead */}
        <div
          className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-amber-500 shadow-[0_0_12px_2px_rgba(245,196,81,0.6)]"
          style={{ left: pct }}
        >
          <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 rounded-sm bg-amber-500" />
        </div>
      </div>
    </div>
  )
}
