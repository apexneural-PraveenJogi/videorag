import api from './api'

export async function uploadVideo(file, onProgress) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/videos/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    },
  })
  return data // { video_id, filename, status }
}

export async function getStatus(videoId) {
  const { data } = await api.get(`/videos/${videoId}`)
  return data // VideoStatus
}

export async function listVideos() {
  const { data } = await api.get('/videos')
  return data.videos // [VideoStatus]
}

export async function deleteVideo(videoId) {
  const { data } = await api.delete(`/videos/${videoId}`)
  return data // { deleted: true }
}

export async function getFrames(videoId) {
  const { data } = await api.get(`/videos/${videoId}/frames`)
  return data.frames // [{ timestamp, frame_path }]
}

// Presigned S3 URL the HTML5 player loads from (Range-enabled by S3).
export async function getStreamUrl(videoId) {
  const { data } = await api.get(`/videos/${videoId}/stream-url`)
  return data.url
}
