import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useVideoStatus } from '../hooks/useVideoStatus'
import { getFrames, getStreamUrl } from '../services/videoService'
import FrameStrip from '../components/FrameStrip.jsx'
import ChatPanel from '../components/ChatPanel.jsx'

function ProcessingView({ status }) {
  const progress = status?.progress ?? 0
  return (
    <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-ink-400 border-t-amber-500" />
      <h2 className="text-xl font-bold text-mist-100">Reading the footage</h2>
      <p className="mt-1 text-sm text-amber-500">{status?.stage || 'Working'}</p>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-ink-700">
        <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2 text-xs text-mist-500">{progress}%</p>
    </div>
  )
}

function FailedView({ status }) {
  return (
    <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center px-6 text-center">
      <h2 className="text-xl font-bold text-red-600">Processing failed</h2>
      <p className="mt-2 break-words text-sm text-mist-300">{status?.error || 'Unknown error.'}</p>
      <Link to="/app" className="mt-4 rounded-pill bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600">
        Upload another video
      </Link>
    </div>
  )
}

export default function VideoPage() {
  const { videoId } = useParams()
  const { status, error } = useVideoStatus(videoId)
  const [frames, setFrames] = useState([])
  const [streamSrc, setStreamSrc] = useState('')
  const videoRef = useRef(null)

  const ready = status?.status === 'ready'

  useEffect(() => {
    if (!ready) return
    getFrames(videoId).then(setFrames).catch(() => {})
    getStreamUrl(videoId).then(setStreamSrc).catch(() => {})
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
      <div className="flex h-full items-center justify-center text-sm text-mist-500">
        Loading…
      </div>
    )
  }
  if (status.status === 'failed') return <FailedView status={status} />
  if (!ready) return <ProcessingView status={status} />

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[1fr_minmax(320px,400px)]">
      {/* Chat — the wide working column (left on desktop, below on mobile) */}
      <div className="order-2 min-h-0 lg:order-1">
        <ChatPanel
          videoId={videoId}
          onSeek={seekTo}
          title={status?.filename}
          posterFrame={frames[0]?.frame_path}
          frameCount={frames.length}
        />
      </div>

      {/* Player + keyframes — sticky right rail (top on mobile) */}
      <div className="order-1 flex min-h-0 flex-col bg-ink-900 lg:order-2 lg:border-l lg:border-ink-600">
        <div className="flex min-h-0 flex-1 items-center justify-center p-3">
          <video
            ref={videoRef}
            src={streamSrc}
            controls
            className="max-h-full max-w-full rounded-card bg-black"
          />
        </div>
        <FrameStrip frames={frames} onSeek={seekTo} />
      </div>
    </div>
  )
}
