export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
  'video/x-msvideo',
]

export const MAX_VIDEO_SIZE_MB = 5120 // 5 GB
// Human-friendly cap for UI copy.
export const MAX_VIDEO_SIZE_LABEL = '5 GB'

export function validateVideoFile(file) {
  if (!file) return 'No file selected.'
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return `Unsupported file type${file.type ? ` (${file.type})` : ''}. Use MP4, MOV, WebM, MKV, or AVI.`
  }
  const sizeMb = file.size / (1024 * 1024)
  if (sizeMb > MAX_VIDEO_SIZE_MB) {
    const sizeGb = (sizeMb / 1024).toFixed(1)
    return `File is ${sizeGb} GB; max is ${MAX_VIDEO_SIZE_LABEL}.`
  }
  return null
}
