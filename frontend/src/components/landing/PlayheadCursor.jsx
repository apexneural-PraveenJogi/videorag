import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion'

// The pointer becomes a playhead: a small amber crosshair that springs after
// the cursor. Fine pointers only; hidden under reduced-motion and on touch.
export default function PlayheadCursor() {
  const reduce = useReducedMotion()
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const sx = useSpring(x, { stiffness: 600, damping: 40, mass: 0.4 })
  const sy = useSpring(y, { stiffness: 600, damping: 40, mass: 0.4 })
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (reduce || !window.matchMedia('(pointer: fine)').matches) return
    setEnabled(true)
    document.documentElement.classList.add('cursor-cut')
    const move = (e) => {
      x.set(e.clientX)
      y.set(e.clientY)
    }
    window.addEventListener('pointermove', move)
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.classList.remove('cursor-cut')
    }
  }, [reduce, x, y])

  if (!enabled) return null
  return (
    <motion.div className="playhead-cursor" style={{ x: sx, y: sy }} aria-hidden="true">
      {/* centered on the pointer from here, so Framer owns the outer transform */}
      <div className="relative -translate-x-1/2 -translate-y-1/2">
        <div className="h-6 w-6 rounded-full border border-amber-500/70" />
        <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500" />
      </div>
    </motion.div>
  )
}
