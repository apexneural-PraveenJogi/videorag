import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { formatTimestamp } from '../../utils/formatTimestamp'
import { getHeroVideoUrl } from '../../services/videoService'

// The hero centrepiece: a looping "live stream" on the left and, beside it, a
// self-playing chat that types out grounded questions & answers — the actual
// product in miniature. The timecode chips seek the live video (shared ref).
// Both render as bento cells; honours prefers-reduced-motion (no typing).
// The clip streams from S3 (presigned URL); the bundled file is a fallback.
const LIVE_FALLBACK = '/live.mp4'

const cell = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
}

// Scripted Q&A grounded in the real clip: a father's-sacrifice story about
// buying school shoes for his son. Plain text only (bubbles render literally —
// no markdown); the chips seek the live video to each cited second.
const SCRIPT = [
  {
    q: 'Give me a short summary of this video.',
    a: "This video tells a heartwarming story of a father's sacrifice and hard work to give his son a better future. Discouraged by the high price of new shoes for his school-age son at 0:28, the father labours at a construction site, lifting heavy cement bags at 1:03 to earn the money. His dedication lets him buy the school shoes and tie them onto his son at 0:53. As the months and years pass — captured in a photo album at 2:24 — the son grows up and is later seen shopping in a modern shoe store at 2:37. The video closes on their strong, lifelong bond as they walk hand-in-hand through their village at 3:06.",
    chips: [{ t: 28 }, { t: 53 }, { t: 63 }, { t: 144 }, { t: 157 }, { t: 186 }],
  },
  {
    q: 'How many people are there in this video?',
    a: 'There are a few distinct people. The main characters are the father (seen at 0:23, 0:36, 0:46 and 3:13), his young son (at 0:23 and 0:46), and the grown-up son (seen at 2:39, walking beside his father at 3:13). In the background, one person sits outside a house at 0:23 and three more are on the street at 0:36 — one on a motorcycle and two standing near the shops.',
    chips: [{ t: 23 }, { t: 36 }, { t: 46 }, { t: 159 }, { t: 193 }],
  },
  {
    q: 'What is the cost of the shoes?',
    a: 'Based on the keyframe at 0:29, the price tag on the shoes reads 999/-.',
    chips: [{ t: 29 }],
  },
]

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export default function LiveDemo() {
  const videoRef = useRef(null)
  const raf = useRef(0)
  const scrollRef = useRef(null)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(193)
  const [videoOk, setVideoOk] = useState(true)
  const [src, setSrc] = useState(null)
  const [messages, setMessages] = useState([])

  // Load the hero clip from S3 (presigned); fall back to the bundled file if
  // S3 isn't configured or the request fails.
  useEffect(() => {
    let alive = true
    getHeroVideoUrl()
      .then((url) => {
        if (alive) setSrc(url || LIVE_FALLBACK)
      })
      .catch(() => {
        if (alive) setSrc(LIVE_FALLBACK)
      })
    return () => {
      alive = false
    }
  }, [])

  // live timecode from the real video
  useEffect(() => {
    if (!videoOk) return
    const loop = () => {
      const v = videoRef.current
      if (v && v.duration) {
        setProgress(v.currentTime / v.duration)
      }
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
              await wait(11)
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

  const total = videoOk ? duration : 193
  const seek = (t) => {
    const v = videoRef.current
    if (v) {
      v.currentTime = t
      v.play().catch(() => {})
    }
  }

  return (
    <>
      {/* live stream — left half */}
      <motion.div
        variants={cell}
        className="relative h-full min-h-[260px] overflow-hidden rounded-card bg-night-900"
      >
        {videoOk && src ? (
          <video
            ref={videoRef}
            src={src}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            onLoadedMetadata={(e) => {
              setDuration(e.currentTarget.duration || 193)
              e.currentTarget.muted = true
              if (!prefersReducedMotion()) e.currentTarget.play().catch(() => {})
            }}
            onError={() => setVideoOk(false)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-night-950" />
        )}
        {/* readability veil at the edges */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(to_top,rgba(0,0,0,0.65),transparent)]" />
        {/* LIVE badge */}
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-badge bg-black/55 px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-eyebrow text-white backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
          Live
        </div>
        {/* timecode HUD */}
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between text-[0.75rem] tabular-nums text-white">
          <span>{formatTimestamp(progress * total)} <span className="text-white/55">/ {formatTimestamp(total)}</span></span>
        </div>
      </motion.div>

      {/* ask-the-video chat — right half */}
      <motion.div
        variants={cell}
        className="flex h-full min-h-[260px] flex-col overflow-hidden rounded-card bg-night-900 text-white"
      >
        <div className="flex items-center gap-2 border-b border-night-line px-4 py-3 text-[0.85rem] font-semibold">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Ask this video
        </div>
        <div ref={scrollRef} className="scroll-slim flex-1 space-y-2.5 overflow-y-auto p-3.5">
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-card px-3 py-1.5 text-[0.8rem] leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-amber-500 font-medium text-white'
                      : 'bg-night-950 text-white/90'
                  }`}
                >
                  {m.text}
                  {m.typing && <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-amber-500 align-middle" />}
                  {m.chips?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.chips.map((c, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => seek(c.t)}
                          title={`Jump to ${formatTimestamp(c.t)}`}
                          className="rounded-pill bg-amber-500/20 px-2 py-0.5 text-[0.7rem] font-medium tabular-nums text-amber-400 transition-colors hover:bg-amber-500/35"
                        >
                          {formatTimestamp(c.t)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="border-t border-night-line p-3">
          <div className="flex items-center gap-2 rounded-pill bg-night-950 px-3 py-1.5">
            <span className="flex-1 truncate text-[0.8rem] text-fog">Ask a question…</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white">
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </span>
          </div>
        </div>
      </motion.div>
    </>
  )
}
