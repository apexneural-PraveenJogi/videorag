import { Link } from 'react-router-dom'
import { deleteVideo } from '../services/videoService'
import { useToast } from './Toast.jsx'
import { formatTimestamp } from '../utils/formatTimestamp'

const STATUS_STYLES = {
  ready: 'bg-emerald-500/15 text-emerald-300',
  processing: 'bg-amber-500/15 text-amber-400',
  queued: 'bg-ink-600 text-mist-300',
  failed: 'bg-red-500/15 text-red-300',
}

export default function VideoLibrary({ videos, onChange }) {
  const toast = useToast()

  const remove = async (e, v) => {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm(`Delete “${v.filename}”? This can’t be undone.`)) return
    try {
      await deleteVideo(v.video_id)
      toast('Video deleted.', 'success')
      onChange?.()
    } catch (err) {
      toast(err.message || 'Delete failed.', 'error')
    }
  }

  if (videos === null) {
    return <p className="mt-10 font-mono text-sm text-mist-500">Loading your videos…</p>
  }

  return (
    <section className="mt-12">
      <h2 className="mb-3 font-mono text-xs uppercase tracking-eyebrow text-mist-500">
        Your videos
      </h2>
      {videos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink-500 bg-ink-800/40 px-4 py-8 text-center text-sm text-mist-500">
          Nothing here yet. Upload a video to get started.
        </p>
      ) : (
        <ul className="space-y-2">
          {videos.map((v) => (
            <li key={v.video_id}>
              <Link
                to={`/app/video/${v.video_id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-ink-600 bg-ink-800 px-4 py-3 transition hover:border-amber-500/40 hover:bg-ink-700"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-mist-100">{v.filename}</p>
                  <p className="mt-0.5 font-mono text-xs text-mist-500">
                    {v.status === 'ready'
                      ? `${v.frame_count} frames · ${formatTimestamp(v.duration)}`
                      : v.stage || v.status}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono text-xs font-medium ${
                      STATUS_STYLES[v.status] || STATUS_STYLES.queued
                    }`}
                  >
                    {v.status}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => remove(e, v)}
                    title="Delete video"
                    className="rounded-md p-1.5 text-mist-500 transition hover:bg-red-500/15 hover:text-red-300"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M3 6h18 M8 6V4h8v2 M19 6l-1 14H6L5 6" />
                    </svg>
                  </button>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
