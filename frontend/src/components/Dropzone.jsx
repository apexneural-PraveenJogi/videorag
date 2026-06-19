import { useRef, useState } from 'react'
import { validateVideoFile, MAX_VIDEO_SIZE_MB } from '../utils/fileValidation'

export default function Dropzone({ onFile, disabled }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState(null)

  const handleFile = (file) => {
    const msg = validateVideoFile(file)
    if (msg) {
      setError(msg)
      return
    }
    setError(null)
    onFile(file)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-8 py-16 transition
          ${dragging ? 'border-amber-500 bg-amber-500/10' : 'border-ink-500 bg-ink-800/60 hover:border-amber-500/60 hover:bg-ink-700/60'}
          ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      >
        <svg viewBox="0 0 24 24" className="h-10 w-10 text-amber-500" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 16V4m0 0 4 4m-4-4L8 8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" strokeLinecap="round" />
        </svg>
        <span className="text-base font-medium text-mist-100">
          Drop a video here, or <span className="text-amber-500">browse</span>
        </span>
        <span className="font-mono text-sm text-mist-500">
          MP4, MOV, WebM, MKV, AVI · up to {MAX_VIDEO_SIZE_MB} MB
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />
      </button>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  )
}
