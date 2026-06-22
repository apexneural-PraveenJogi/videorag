import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useChatStore } from '../store/chatStore'
import { streamAnswer } from '../services/queryService'
import MessageBubble from './MessageBubble.jsx'
import ModelSelector from './ModelSelector.jsx'

let counter = 0
const nextId = () => `m${Date.now()}-${counter++}`

// Stable reference so the selector doesn't return a fresh array each render
// (which would loop React's useSyncExternalStore and blank the page).
const EMPTY = []

const STARTERS = [
  'Give me a short summary of this video.',
  'What are the key moments, with timestamps?',
  'What people or objects appear on screen?',
]

export default function ChatPanel({ videoId, onSeek }) {
  const messages = useChatStore((s) => s.byVideo[videoId] ?? EMPTY)
  const model = useChatStore((s) => s.model)
  const addMessage = useChatStore((s) => s.addMessage)
  const updateMessage = useChatStore((s) => s.updateMessage)

  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef(null)
  const taRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const ask = async (text) => {
    const question = (text ?? input).trim()
    if (!question || busy) return
    setInput('')
    setBusy(true)

    addMessage(videoId, { id: nextId(), role: 'user', text: question })
    const assistantId = nextId()
    addMessage(videoId, {
      id: assistantId, role: 'assistant', text: '', references: [], streaming: true, model,
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
          updateMessage(videoId, assistantId, { streaming: false, model: meta?.model_used || model }),
        onError: (msg) =>
          updateMessage(videoId, assistantId, {
            streaming: false, error: true, text: acc || `Error: ${msg}`,
          }),
      },
    )
    setBusy(false)
  }

  const empty = messages.length === 0

  return (
    <div className="flex h-full flex-col bg-ink-900">
      <div className="flex items-center justify-between border-b border-ink-700 bg-ink-800/60 px-4 py-2.5 backdrop-blur">
        <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-mist-100">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Ask this video
        </h2>
        <ModelSelector />
      </div>

      <div ref={scrollRef} className="scroll-slim flex-1 space-y-4 overflow-y-auto p-4">
        {empty ? (
          <div className="mt-8 flex flex-col items-center text-center">
            <p className="max-w-xs text-sm text-mist-300">
              Ask anything about this video. Answers cite timestamps and keyframes you
              can click to jump to.
            </p>
            <div className="mt-5 flex w-full max-w-sm flex-col gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="rounded-xl border border-ink-600 bg-ink-800 px-4 py-2.5 text-left text-sm text-mist-100 transition hover:border-amber-500/40 hover:bg-ink-700"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <MessageBubble message={m} onSeek={onSeek} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="border-t border-ink-700 bg-ink-800/60 p-3 backdrop-blur">
        <div className="flex items-end gap-2 rounded-2xl border border-ink-600 bg-ink-900 px-2 py-1.5 transition focus-within:border-amber-500/50">
          <textarea
            ref={taRef}
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
            className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-mist-100 placeholder:text-mist-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => ask()}
            disabled={busy || !input.trim()}
            aria-label="Send"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-ink-900 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-900/40 border-t-ink-900" />
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
