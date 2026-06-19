import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Link } from 'react-router-dom'

// A button that leans subtly toward the cursor. Disabled for touch / reduced
// motion (no pointer hover there anyway). Renders as a router Link.
export default function MagneticButton({ to, children, className = '', strength = 0.35 }) {
  const ref = useRef(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const x = useSpring(mx, { stiffness: 220, damping: 16 })
  const y = useSpring(my, { stiffness: 220, damping: 16 })
  const glow = useTransform([x, y], ([lx, ly]) => `${50 + lx}% ${50 + ly}%`)

  const onMove = (e) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    mx.set((e.clientX - (r.left + r.width / 2)) * strength)
    my.set((e.clientY - (r.top + r.height / 2)) * strength)
  }
  const reset = () => {
    mx.set(0)
    my.set(0)
  }

  return (
    <motion.div ref={ref} style={{ x, y }} onMouseMove={onMove} onMouseLeave={reset} className="inline-block">
      <Link to={to} className={className}>
        <motion.span
          style={{ backgroundPosition: glow }}
          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.35),transparent_60%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
        {children}
      </Link>
    </motion.div>
  )
}
