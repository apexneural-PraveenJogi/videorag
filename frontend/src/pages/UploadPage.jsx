import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Dropzone from '../components/Dropzone.jsx'
import VideoLibrary from '../components/VideoLibrary.jsx'
import { uploadVideo, listVideos } from '../services/videoService'
import { useVideoStore } from '../store/videoStore'
import { useToast } from '../components/Toast.jsx'

export default function UploadPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const setVideo = useVideoStore((s) => s.setVideo)
  const [progress, setProgress] = useState(null)
  const [filename, setFilename] = useState('')
  const [videos, setVideos] = useState(null) // null = loading

  const refresh = () =>
    listVideos()
      .then(setVideos)
      .catch(() => setVideos([]))

  useEffect(() => {
    refresh()
  }, [])

  const handleFile = async (file) => {
    setFilename(file.name)
    setProgress(0)
    try {
      const res = await uploadVideo(file, setProgress)
      setVideo(res.video_id, res.filename)
      navigate(`/app/video/${res.video_id}`)
    } catch (e) {
      toast(e.message || 'Upload failed.', 'error')
      setProgress(null)
    }
  }

  const uploading = progress !== null

  return (
    <div className="h-full overflow-y-auto scroll-slim">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8">
          <p className="text-[0.75rem] font-medium uppercase tracking-eyebrow text-amber-500">New video</p>
          <h1 className="mt-4 text-display-lg text-mist-100">
            Bring in footage
          </h1>
          <p className="mt-3 text-[0.95rem] text-mist-300">
            We pull the keyframes and transcribe the audio, then you can ask
            anything about it — and land on the exact moment.
          </p>
        </div>

        <Dropzone onFile={handleFile} disabled={uploading} />

        {uploading && (
          <div className="mt-6">
            <div className="mb-1 flex justify-between text-sm text-mist-300">
              <span className="truncate">{filename}</span>
              <span>
                {progress < 100 ? `Uploading ${progress}%` : 'Starting processing…'}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink-700">
              <div
                className="h-full rounded-full bg-amber-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <VideoLibrary videos={videos} onChange={refresh} />
      </div>
    </div>
  )
}
