import { useState } from 'react'
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  useReducedMotion,
} from 'framer-motion'

// The signature device: scrolling the page is scrubbing a timeline. A playhead
// rides a thin rail down the right edge while a live timecode advances toward
// the page's "runtime". Desktop + motion only — it's flourish, not function.
const RUNTIME = 161 // 2:41
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export default function TimelineRail() {
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const top = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])
  const [tc, setTc] = useState('0:00')
  useMotionValueEvent(scrollYProgress, 'change', (p) => setTc(fmt(p * RUNTIME)))

  if (reduce) return null
  return (
    <div
      className="pointer-events-none fixed right-5 top-0 z-40 hidden h-screen w-12 lg:block"
      aria-hidden="true"
    >
      <span className="absolute right-0 top-10 font-mono text-[10px] tracking-widest text-mist-500">
        00:00
      </span>
      <span className="absolute right-0 bottom-10 font-mono text-[10px] tracking-widest text-mist-500">
        {fmt(RUNTIME)}
      </span>
      <div className="absolute inset-y-16 right-[7px] w-px bg-ink-500" />
      <motion.div style={{ top }} className="absolute right-[7px]">
        <div className="relative">
          <div className="h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-amber-500 shadow-[0_0_14px_rgba(245,196,81,0.8)]" />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-ink-800/80 px-1.5 py-0.5 font-mono text-[10px] text-amber-400 backdrop-blur">
            {tc}
          </span>
        </div>
      </motion.div>
    </div>
  )
}
