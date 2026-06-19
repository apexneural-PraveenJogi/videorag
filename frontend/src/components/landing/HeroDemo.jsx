import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { formatTimestamp } from '../../utils/formatTimestamp'

// A self-playing product demo: a real video on the left, and on the right a
// chat that asks questions and types out grounded answers — the actual app in
// miniature. The timecode chips seek the video. Falls back gracefully and
// honours prefers-reduced-motion (shows the finished transcript, no typing).

const HERO_SRC = '/hero.mp4'
const BARS = 48

const HEIGHTS = Array.from({ length: BARS }, (_, i) => {
  const a = Math.sin(i * 0.7) * 0.5 + 0.5
  const b = Math.sin(i * 1.9 + 1.1) * 0.5 + 0.5
  return 0.2 + (a * 0.6 + b * 0.4) * 0.8
})

// Scripted exchanges about the clip. Timecodes are within the ~10s loop.
const SCRIPT = [
  {
    q: 'What’s happening in this clip?',
    a: 'A single translucent jellyfish drifts through deep water, its bell pulsing slowly while the tentacles trail behind it.',
    chips: [{ t: 3, grad: 'from-sky-500 to-indigo-700' }, { t: 7, grad: 'from-cyan-500 to-teal-700' }],
  },
  {
    q: 'What colors dominate the shot?',
    a: 'Cool blues and teal fill the frame, with the jellyfish lit a pale white-pink against the dark background.',
    chips: [{ t: 5, grad: 'from-blue-500 to-cyan-700' }],
  },
  {
    q: 'When is it most centered?',
    a: 'It sits dead-center around 0:06 before drifting toward the left edge of the frame.',
    chips: [{ t: 6, grad: 'from-indigo-500 to-sky-700' }],
  },
]

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export default function HeroDemo() {
  const videoRef = useRef(null)
  const raf = useRef(0)
  const scrollRef = useRef(null)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(10)
  const [videoOk, setVideoOk] = useState(true)
  const [messages, setMessages] = useState([])

  // playhead/timecode from the real video
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

  // auto-playing scripted transcript
  useEffect(() => {
    let alive = true
    const timers = []
    const wait = (ms) => new Promise((r) => timers.push(setTimeout(r, ms)))
    const reduced = prefersReducedMotion()

    async function run() {
      while (alive) {
        setMessages([])
        for (let i = 0; i < SCRIPT.length && alive; i++) {
          const ex = SCRIPT[i]
          setMessages((m) => [...m, { id: `u${i}`, role: 'user', text: ex.q }])
          await wait(reduced ? 0 : 650)
          if (!alive) return
          const aid = `a${i}`
          setMessages((m) => [...m, { id: aid, role: 'assistant', text: '', chips: [], typing: !reduced }])
          if (reduced) {
            setMessages((m) => m.map((x) => (x.id === aid ? { ...x, text: ex.a, chips: ex.chips, typing: false } : x)))
          } else {
            for (let c = 1; c <= ex.a.length && alive; c++) {
              setMessages((m) => m.map((x) => (x.id === aid ? { ...x, text: ex.a.slice(0, c) } : x)))
              await wait(12)
            }
            setMessages((m) => m.map((x) => (x.id === aid ? { ...x, chips: ex.chips, typing: false } : x)))
          }
          await wait(reduced ? 500 : 1700)
        }
        if (reduced) break
        await wait(1100)
      }
    }
    run()
    return () => {
      alive = false
      timers.forEach(clearTimeout)
    }
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const total = videoOk ? duration : 10
  const seek = (t) => {
    const v = videoRef.current
    if (v) {
      v.currentTime = t
      v.play().catch(() => {})
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-500/70 bg-ink-800/90 shadow-2xl backdrop-blur-xl">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-ink-600 px-4 py-2.5 font-mono text-xs text-mist-500">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
        <span className="ml-2 text-mist-300">jellyfish.mp4</span>
        <span className="ml-auto hidden sm:inline">vision · gpt-4o</span>
      </div>

      <div className="grid lg:grid-cols-[1.5fr_1fr]">
        {/* video */}
        <div className="relative aspect-video lg:aspect-auto lg:min-h-[440px]">
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
            <div className="absolute inset-0 bg-gradient-to-br from-sky-600 via-cyan-700 to-indigo-900" />
          )}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.45))]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink-900/90 to-transparent" />
          {/* sweeping scanline */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/8 to-transparent animate-scan" />
          </div>
          {/* HUD */}
          <div className="absolute left-3 top-3 flex items-center gap-2 font-mono text-[11px] text-white/90">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-blink" />
            LIVE
          </div>
          {/* waveform + timecode */}
          <div className="absolute inset-x-3 bottom-3">
            <div className="mb-1.5 font-mono text-xs tabular-nums text-white">
              {formatTimestamp(progress * total)}
              <span className="text-white/50"> / {formatTimestamp(total)}</span>
            </div>
            <div className="relative flex h-7 items-center justify-between gap-[2px]">
              {HEIGHTS.map((h, i) => {
                const pos = i / (BARS - 1)
                const played = pos <= progress
                const near = Math.abs(pos - progress) < 0.05
                return (
                  <span
                    key={i}
                    className={`w-full rounded-full transition-colors duration-200 ${
                      near ? 'bg-amber-400' : played ? 'bg-amber-500/80' : 'bg-white/25'
                    }`}
                    style={{ height: `${(h * (near ? 100 : 80)).toFixed(0)}%` }}
                  />
                )
              })}
              <div
                className="absolute inset-y-0 w-px bg-amber-400 shadow-[0_0_10px_2px_rgba(245,196,81,0.7)]"
                style={{ left: `${(progress * 100).toFixed(2)}%` }}
              />
            </div>
          </div>
        </div>

        {/* chat */}
        <div className="flex min-h-[300px] flex-col border-t border-ink-600 lg:min-h-0 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2 border-b border-ink-600 px-4 py-2.5 font-display text-sm font-semibold text-mist-100">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Ask this video
          </div>
          <div ref={scrollRef} className="scroll-slim flex-1 space-y-3 overflow-y-auto p-4">
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-amber-500 font-medium text-ink-900'
                        : 'bg-ink-700 text-mist-100 ring-1 ring-ink-500'
                    }`}
                  >
                    {m.text}
                    {m.typing && <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-blink bg-amber-400 align-middle" />}
                    {m.chips?.length > 0 && (
                      <div className="mt-2.5 flex gap-2">
                        {m.chips.map((c, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => seek(c.t)}
                            title={`Jump to ${formatTimestamp(c.t)}`}
                            className={`relative h-12 w-20 shrink-0 overflow-hidden rounded-md border border-amber-500/40 bg-gradient-to-br ${c.grad} transition hover:ring-2 hover:ring-amber-500/40`}
                          >
                            <span className="absolute bottom-0.5 right-0.5 rounded bg-ink-900/80 px-1 font-mono text-[9px] text-amber-400">
                              {formatTimestamp(c.t)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {/* faux input */}
          <div className="border-t border-ink-600 p-3">
            <div className="flex items-center gap-2 rounded-xl border border-ink-600 bg-ink-900 px-3 py-2">
              <span className="flex-1 truncate text-sm text-mist-500">Ask a question…</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-ink-900">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
