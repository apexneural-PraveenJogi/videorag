import { useEffect, useRef, useState } from 'react'
import { getStatus } from '../services/videoService'

const TERMINAL = new Set(['ready', 'failed'])

// Polls GET /videos/:id every `intervalMs` until status is terminal.
export function useVideoStatus(videoId, intervalMs = 1500) {
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const timer = useRef(null)

  useEffect(() => {
    if (!videoId) return
    let cancelled = false

    const tick = async () => {
      try {
        const s = await getStatus(videoId)
        if (cancelled) return
        setStatus(s)
        if (TERMINAL.has(s.status)) return // stop polling
        timer.current = setTimeout(tick, intervalMs)
      } catch (e) {
        if (cancelled) return
        setError(e.message)
        timer.current = setTimeout(tick, intervalMs * 2)
      }
    }
    tick()

    return () => {
      cancelled = true
      if (timer.current) clearTimeout(timer.current)
    }
  }, [videoId, intervalMs])

  return { status, error }
}
