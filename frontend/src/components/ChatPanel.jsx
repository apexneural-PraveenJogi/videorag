import { useEffect, useRef, useState } from 'react'
import { useChatStore } from '../store/chatStore'
import { streamAnswer } from '../services/queryService'
import MessageBubble from './MessageBubble.jsx'
import ModelSelector from './ModelSelector.jsx'

let counter = 0
const nextId = () => `m${Date.now()}-${counter++}`

// Stable reference so the selector below doesn't return a fresh array each render
// (which would loop React's useSyncExternalStore and blank the page).
const EMPTY = []

export default function ChatPanel({ videoId, onSeek }) {
  const messages = useChatStore((s) => s.byVideo[videoId] ?? EMPTY)
  const model = useChatStore((s) => s.model)
  const addMessage = useChatStore((s) => s.addMessage)
  const updateMessage = useChatStore((s) => s.updateMessage)

  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const ask = async () => {
    const question = input.trim()
    if (!question || busy) return
    setInput('')
    setBusy(true)

    addMessage(videoId, { id: nextId(), role: 'user', text: question })
    const assistantId = nextId()
    addMessage(videoId, {
      id: assistantId,
      role: 'assistant',
      text: '',
      references: [],
      streaming: true,
      model,
    })

    let acc = ''
    await streamAnswer(
      { videoId, question, model },
      {
        onReferences: (refs) => updateMessage(videoId, assistantId, { references: refs || [] }),
        onToken: (tok) => {
          acc += tok
          updateMessage(videoId, assistantId, { text: acc })
        },
        onDone: (meta) =>
          updateMessage(videoId, assistantId, {
            streaming: false,
            model: meta?.model_used || model,
          }),
        onError: (msg) =>
          updateMessage(videoId, assistantId, {
            streaming: false,
            error: true,
            text: acc || `Error: ${msg}`,
          }),
      },
    )
    setBusy(false)
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
        <h2 className="text-sm font-semibold text-slate-700">Chat</h2>
        <ModelSelector />
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="mt-10 text-center text-sm text-slate-400">
            Ask anything about this video.
            <br />
            Answers cite timestamps and keyframes you can click to jump to.
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} onSeek={onSeek} />
        ))}
      </div>

      <div className="border-t border-slate-200 bg-white p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                ask()
              }
            }}
            rows={1}
            placeholder="Ask a question…"
            className="max-h-32 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          <button
            type="button"
            onClick={ask}
            disabled={busy || !input.trim()}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
