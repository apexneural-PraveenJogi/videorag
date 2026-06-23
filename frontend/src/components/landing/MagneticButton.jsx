import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'

// A button that leans subtly toward the cursor and lifts on hover. Renders as a
// router Link. Falls back to a plain Link under reduced motion / touch.
export default function MagneticButton({ to, children, className = '', strength = 0.3 }) {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const x = useSpring(mx, { stiffness: 220, damping: 16 })
  const y = useSpring(my, { stiffness: 220, damping: 16 })

  const onMove = (e) => {
    if (reduce) return
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
    <motion.div
      ref={ref}
      style={reduce ? undefined : { x, y }}
      onMouseMove={onMove}
      onMouseLeave={reset}
      whileHover={reduce ? undefined : { scale: 1.03 }}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      className="inline-block"
    >
      <Link to={to} className={className}>
        {children}
      </Link>
    </motion.div>
  )
}
