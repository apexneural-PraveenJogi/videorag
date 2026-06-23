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

export default function ChatPanel({ videoId, onSeek, title, posterFrame, frameCount }) {
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
      <div className="flex items-center justify-between border-b border-ink-600 bg-ink-800 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-mist-100">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Ask this video
        </h2>
        <ModelSelector />
      </div>

      <div ref={scrollRef} className="scroll-slim flex-1 overflow-y-auto">
        {empty ? (
          <div className="relative flex min-h-full flex-col items-center justify-center px-6 py-12 text-center">
            <div className="relative flex w-full max-w-md flex-col items-center">
              {/* video thumbnail card */}
              <div className="overflow-hidden rounded-card bg-ink-800">
                {posterFrame ? (
                  <img
                    src={posterFrame}
                    alt=""
                    className="aspect-video w-72 object-cover"
                  />
                ) : (
                  <div className="flex aspect-video w-72 items-center justify-center bg-ink-700 text-mist-500">
                    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                )}
              </div>

              <p className="mt-7 text-[0.95rem] font-medium text-mist-300">Ask anything to start learning</p>
              <h1 className="mt-1 break-words text-2xl font-bold tracking-tight text-amber-500 sm:text-3xl">
                {title || 'This video'}
              </h1>

              <div className="mt-3 flex items-center gap-5 text-[0.875rem] text-mist-300">
                <span className="flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-mist-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
                  </svg>
                  {frameCount ? `${frameCount} keyframes` : 'Indexed'}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Ready
                </span>
              </div>

              <button
                type="button"
                onClick={() => taRef.current?.focus()}
                className="mt-7 rounded-pill bg-amber-500 px-7 py-3 text-base font-semibold text-white transition-colors hover:bg-amber-600"
              >
                Start asking
              </button>

              {/* "try asking" card */}
              <div className="mt-9 w-full rounded-card bg-ink-800 p-5 text-left">
                <h2 className="text-base font-semibold text-mist-100">Try asking</h2>
                <div className="mt-3 flex flex-col gap-2">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => ask(s)}
                      className="rounded-badge bg-ink-700 px-4 py-2.5 text-left text-[0.95rem] text-mist-100 transition-colors hover:bg-[#DEE3EC]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-4">
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
          </div>
        )}
      </div>

      <div className="border-t border-ink-600 bg-ink-800 p-3">
        <div className="flex items-end gap-2 rounded-card bg-ink-700 px-2 py-1.5 transition-shadow focus-within:ring-2 focus-within:ring-amber-500/40">
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
            className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-[0.95rem] text-mist-100 placeholder:text-mist-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => ask()}
            disabled={busy || !input.trim()}
            aria-label="Send"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
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
