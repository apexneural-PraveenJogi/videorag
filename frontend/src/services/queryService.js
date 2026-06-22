import api, { API_BASE } from './api'
import { useAuthStore } from '../store/authStore'
import { refreshAccessToken } from './authService'

// Non-streaming query (returns full QueryResponse).
export async function sendQuery({ videoId, question, model, topK = 5 }) {
  const { data } = await api.post('/query', {
    video_id: videoId,
    question,
    model: model || undefined,
    top_k: topK,
  })
  return data // { answer, references, model_used, latency_ms }
}

// Streaming query over POST SSE. EventSource is GET-only and can't send headers,
// so we parse the text/event-stream body from fetch manually — and attach the
// bearer token ourselves (the axios interceptor doesn't run for raw fetch).
//
// callbacks: { onReferences(refs), onToken(text), onDone(meta), onError(msg) }
export async function streamAnswer({ videoId, question, model, topK = 5 }, callbacks = {}) {
  const { onReferences, onToken, onDone, onError } = callbacks
  const body = JSON.stringify({
    video_id: videoId,
    question,
    model: model || undefined,
    top_k: topK,
  })

  const doFetch = (token) =>
    fetch(`${API_BASE}/query/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
    })

  let resp = await doFetch(useAuthStore.getState().token)

  // Access token may have expired mid-session: refresh once, then retry.
  if (resp.status === 401) {
    const rt = useAuthStore.getState().refreshToken
    if (rt) {
      try {
        const { access_token } = await refreshAccessToken(rt)
        useAuthStore.getState().setAccessToken(access_token)
        resp = await doFetch(access_token)
      } catch {
        /* fall through to the error handling below */
      }
    }
  }

  if (!resp.ok || !resp.body) {
    let detail = `Request failed (${resp.status})`
    try {
      detail = (await resp.json()).detail || detail
    } catch {
      /* ignore */
    }
    onError?.(detail)
    return
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const dispatch = (event, dataRaw) => {
    let data
    try {
      data = JSON.parse(dataRaw)
    } catch {
      data = dataRaw
    }
    if (event === 'references') onReferences?.(data)
    else if (event === 'token') onToken?.(data)
    else if (event === 'done') onDone?.(data)
    else if (event === 'error') onError?.(data)
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() ?? ''
    for (const block of blocks) {
      let event = 'message'
      let dataRaw = ''
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) dataRaw += line.slice(5).trim()
      }
      if (dataRaw) dispatch(event, dataRaw)
    }
  }
}
