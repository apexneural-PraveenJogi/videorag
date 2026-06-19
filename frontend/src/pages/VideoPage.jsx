import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useVideoStatus } from '../hooks/useVideoStatus'
import { getFrames, videoStreamUrl } from '../services/videoService'
import FrameStrip from '../components/FrameStrip.jsx'
import ChatPanel from '../components/ChatPanel.jsx'

function ProcessingView({ status }) {
  const progress = status?.progress ?? 0
  return (
    <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />
      <h2 className="text-lg font-semibold text-slate-800">Processing video…</h2>
      <p className="mt-1 text-sm text-slate-500">{status?.stage || 'Working'}</p>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-400">{progress}%</p>
    </div>
  )
}

function FailedView({ status }) {
  return (
    <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center px-6 text-center">
      <h2 className="text-lg font-semibold text-red-600">Processing failed</h2>
      <p className="mt-2 text-sm text-slate-500 break-words">{status?.error || 'Unknown error.'}</p>
      <Link to="/app" className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
        Upload another video
      </Link>
    </div>
  )
}

export default function VideoPage() {
  const { videoId } = useParams()
  const { status, error } = useVideoStatus(videoId)
  const [frames, setFrames] = useState([])
  const videoRef = useRef(null)

  const ready = status?.status === 'ready'

  useEffect(() => {
    if (!ready) return
    getFrames(videoId).then(setFrames).catch(() => {})
  }, [ready, videoId])

  const seekTo = (seconds) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = Math.max(0, seconds)
    v.play().catch(() => {})
    v.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  if (error && !status) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-600">
        {error}
      </div>
    )
  }
  if (!status) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        Loading…
      </div>
    )
  }
  if (status.status === 'failed') return <FailedView status={status} />
  if (!ready) return <ProcessingView status={status} />

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
      {/* Left: player + keyframes */}
      <div className="flex min-h-0 flex-col border-r border-slate-200 bg-slate-900">
        <div className="flex min-h-0 flex-1 items-center justify-center p-3">
          <video
            ref={videoRef}
            src={videoStreamUrl(videoId)}
            controls
            className="max-h-full max-w-full rounded-lg bg-black"
          />
        </div>
        <FrameStrip frames={frames} onSeek={seekTo} />
      </div>

      {/* Right: chat */}
      <div className="min-h-0">
        <ChatPanel videoId={videoId} onSeek={seekTo} />
      </div>
    </div>
  )
}
