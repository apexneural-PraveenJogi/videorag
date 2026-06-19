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
          ${dragging ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-white hover:border-brand-400 hover:bg-slate-50'}
          ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      >
        <svg viewBox="0 0 24 24" className="h-10 w-10 text-brand-500" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 16V4m0 0 4 4m-4-4L8 8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" strokeLinecap="round" />
        </svg>
        <span className="text-base font-medium text-slate-700">
          Drop a video here, or <span className="text-brand-600">browse</span>
        </span>
        <span className="text-sm text-slate-400">
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
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  )
}
