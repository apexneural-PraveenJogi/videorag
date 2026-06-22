import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { listVideos } from '../services/videoService'
import { formatTimestamp } from '../utils/formatTimestamp'

// Slide-over panel listing the user's videos (their history). Opening a video
// reopens its page, which restores that video's chat thread. Fetches fresh on
// open so statuses stay current.
const STATUS_DOT = {
  ready: 'bg-emerald-400',
  processing: 'bg-amber-400',
  queued: 'bg-mist-500',
  failed: 'bg-red-400',
}

export default function HistoryDrawer({ open, onClose }) {
  const [videos, setVideos] = useState(null) // null = loading

  useEffect(() => {
    if (!open) return
    setVideos(null)
    listVideos()
      .then(setVideos)
      .catch(() => setVideos([]))
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-ink-600 bg-ink-800 shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-label="Video history"
          >
            <div className="flex items-center justify-between border-b border-ink-600 px-5 py-4">
              <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                History
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close history"
                className="rounded-md p-1.5 text-mist-400 transition hover:bg-ink-700 hover:text-mist-100"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="scroll-slim flex-1 overflow-y-auto p-4">
              {videos === null ? (
                <p className="font-mono text-sm text-mist-500">Loading…</p>
              ) : videos.length === 0 ? (
                <p className="rounded-xl border border-dashed border-ink-500 bg-ink-900/40 px-4 py-8 text-center text-sm text-mist-500">
                  No videos yet. Upload one to start your history.
                </p>
              ) : (
                <ul className="space-y-2">
                  {videos.map((v) => (
                    <li key={v.video_id}>
                      <Link
                        to={`/app/video/${v.video_id}`}
                        onClick={onClose}
                        className="flex items-center gap-3 rounded-xl border border-ink-600 bg-ink-900/60 px-4 py-3 transition hover:border-amber-500/40 hover:bg-ink-700"
                      >
                        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[v.status] || STATUS_DOT.queued}`} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-mist-100">{v.filename}</span>
                          <span className="mt-0.5 block font-mono text-xs text-mist-500">
                            {v.status === 'ready'
                              ? `${v.frame_count} frames · ${formatTimestamp(v.duration)}`
                              : v.stage || v.status}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
