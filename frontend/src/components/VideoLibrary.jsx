import { Link } from 'react-router-dom'
import { deleteVideo } from '../services/videoService'
import { useToast } from './Toast.jsx'
import { formatTimestamp } from '../utils/formatTimestamp'

const STATUS_STYLES = {
  ready: 'bg-emerald-100 text-emerald-700',
  processing: 'bg-amber-500/20 text-amber-600',
  queued: 'bg-slate-100 text-slate-600',
  failed: 'bg-red-100 text-red-700',
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
    return <p className="mt-10 text-sm text-slate-400">Loading your videos…</p>
  }

  return (
    <section className="mt-12">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Your videos
      </h2>
      {videos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-400">
          Nothing here yet. Upload a video to get started.
        </p>
      ) : (
        <ul className="space-y-2">
          {videos.map((v) => (
            <li key={v.video_id}>
              <Link
                to={`/app/video/${v.video_id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-brand-400 hover:shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{v.filename}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {v.status === 'ready'
                      ? `${v.frame_count} frames · ${formatTimestamp(v.duration)}`
                      : v.stage || v.status}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_STYLES[v.status] || STATUS_STYLES.queued
                    }`}
                  >
                    {v.status}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => remove(e, v)}
                    title="Delete video"
                    className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
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
