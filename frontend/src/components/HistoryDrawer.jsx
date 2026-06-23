import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { listVideos, deleteVideo } from '../services/videoService'
import { formatTimestamp } from '../utils/formatTimestamp'
import { useToast } from './Toast.jsx'

// Slide-over panel listing the user's videos (their history). Opening a video
// reopens its page, which restores that video's chat thread. Fetches fresh on
// open so statuses stay current; each row can be deleted in place.
const STATUS_DOT = {
  ready: 'bg-emerald-400',
  processing: 'bg-amber-400',
  queued: 'bg-mist-500',
  failed: 'bg-red-400',
}

export default function HistoryDrawer({ open, onClose }) {
  const [videos, setVideos] = useState(null) // null = loading
  const [deletingId, setDeletingId] = useState(null)
  const toast = useToast()

  useEffect(() => {
    if (!open) return
    setVideos(null)
    listVideos()
      .then(setVideos)
      .catch(() => setVideos([]))
  }, [open])

  const remove = async (e, v) => {
    e.preventDefault()
    e.stopPropagation()
    if (deletingId) return
    if (!window.confirm(`Delete “${v.filename}”? This can’t be undone.`)) return
    setDeletingId(v.video_id)
    try {
      await deleteVideo(v.video_id)
      setVideos((vs) => (vs || []).filter((x) => x.video_id !== v.video_id))
      toast('Video deleted.', 'success')
    } catch (err) {
      toast(err.message || 'Delete failed.', 'error')
    } finally {
      setDeletingId(null)
    }
  }

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
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-ink-600 bg-ink-800"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-label="Video history"
          >
            <div className="flex items-center justify-between border-b border-ink-600 px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                History
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close history"
                className="rounded-md p-1.5 text-mist-500 transition-colors hover:bg-ink-700 hover:text-mist-100"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="scroll-slim flex-1 overflow-y-auto p-4">
              {videos === null ? (
                <p className="text-sm text-mist-500">Loading…</p>
              ) : videos.length === 0 ? (
                <p className="rounded-card border-2 border-dashed border-ink-400 bg-ink-700/60 px-4 py-8 text-center text-sm text-mist-500">
                  No videos yet. Upload one to start your history.
                </p>
              ) : (
                <ul className="space-y-2">
                  {videos.map((v) => (
                    <li key={v.video_id} className="group relative">
                      <Link
                        to={`/app/video/${v.video_id}`}
                        onClick={onClose}
                        className="flex items-center gap-3 rounded-card bg-ink-700 py-3 pl-4 pr-12 transition-colors hover:bg-[#DEE3EC]"
                      >
                        <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[v.status] || STATUS_DOT.queued}`} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-mist-100">{v.filename}</span>
                          <span className="mt-0.5 block text-xs text-mist-500">
                            {v.status === 'ready'
                              ? `${v.frame_count} frames · ${formatTimestamp(v.duration)}`
                              : v.stage || v.status}
                          </span>
                        </span>
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => remove(e, v)}
                        disabled={deletingId === v.video_id}
                        title="Delete video"
                        aria-label={`Delete ${v.filename}`}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-mist-500 transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50"
                      >
                        {deletingId === v.video_id ? (
                          <span className="block h-4 w-4 animate-spin rounded-full border-2 border-mist-500/40 border-t-mist-500" />
                        ) : (
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18 M8 6V4h8v2 M19 6l-1 14H6L5 6" />
                          </svg>
                        )}
                      </button>
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
