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
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
            Upload a video
          </h1>
          <p className="mt-2 text-slate-500">
            We’ll extract keyframes and transcribe the audio, then you can ask
            anything about it.
          </p>
        </div>

        <Dropzone onFile={handleFile} disabled={uploading} />

        {uploading && (
          <div className="mt-6">
            <div className="mb-1 flex justify-between text-sm text-slate-500">
              <span className="truncate">{filename}</span>
              <span>
                {progress < 100 ? `Uploading ${progress}%` : 'Starting processing…'}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-brand-600 transition-all"
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
