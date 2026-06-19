import FrameReference from './FrameReference.jsx'

// Turn "m:ss" / "h:mm:ss" mentions in the answer into clickable seek links.
const TS_RE = /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g

function toSeconds(label) {
  const parts = label.split(':').map(Number)
  return parts.length === 3
    ? parts[0] * 3600 + parts[1] * 60 + parts[2]
    : parts[0] * 60 + parts[1]
}

function renderText(text, onSeek) {
  const out = []
  let last = 0
  let m
  TS_RE.lastIndex = 0
  while ((m = TS_RE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const label = m[1]
    out.push(
      <button
        key={`${m.index}-${label}`}
        type="button"
        onClick={() => onSeek?.(toSeconds(label))}
        className="font-medium text-brand-600 underline decoration-dotted underline-offset-2 hover:text-brand-700"
      >
        {label}
      </button>,
    )
    last = m.index + label.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export default function MessageBubble({ message, onSeek }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
        isUser
          ? 'bg-brand-600 text-white'
          : 'bg-white text-slate-800 ring-1 ring-slate-200'
      }`}>
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {message.error ? (
            <span className="text-red-600">{message.text}</span>
          ) : isUser ? (
            message.text
          ) : (
            <>
              {renderText(message.text, onSeek)}
              {message.streaming && (
                <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-brand-400 align-middle" />
              )}
            </>
          )}
        </div>

        {!isUser && message.references?.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {message.references.map((ref, i) => (
              <FrameReference key={`${ref.frame_path}-${i}`} reference={ref} onSeek={onSeek} />
            ))}
          </div>
        )}

        {!isUser && !message.streaming && message.model && (
          <div className="mt-2 text-[11px] text-slate-400">
            {message.model}
            {message.latencyMs ? ` · ${message.latencyMs} ms` : ''}
          </div>
        )}
      </div>
    </div>
  )
}
