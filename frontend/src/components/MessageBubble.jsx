import FrameReference from './FrameReference.jsx'

// Turn "m:ss" / "h:mm:ss" mentions in the answer into clickable seek chips.
const TS_RE = /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g

function toSeconds(label) {
  const parts = label.split(':').map(Number)
  return parts.length === 3
    ? parts[0] * 3600 + parts[1] * 60 + parts[2]
    : parts[0] * 60 + parts[1]
}

// The set of timecodes (in seconds) the answer explicitly cites.
function citedSeconds(text) {
  const secs = new Set()
  let m
  TS_RE.lastIndex = 0
  while ((m = TS_RE.exec(text)) !== null) secs.add(toSeconds(m[1]))
  return secs
}

// Show only the frame(s) the answer actually points to: those whose timecode is
// cited in the text. Several keyframes are sent to the model so it can choose,
// but we surface just the relevant one(s). If nothing is cited yet, show the
// single best candidate rather than the whole spread.
function relevantReferences(refs, text) {
  if (!refs?.length) return []
  const cited = citedSeconds(text || '')
  if (!cited.size) return refs.slice(0, 1)
  const matched = refs.filter((r) => cited.has(Math.round(r.timestamp)))
  return matched.length ? matched : refs.slice(0, 1)
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
        className="mx-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[0.8em] text-amber-600 transition hover:bg-amber-500/25"
      >
        {label}
      </button>,
    )
    last = m.index + label.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-500"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  )
}

export default function MessageBubble({ message, onSeek }) {
  const isUser = message.role === 'user'
  const waiting = !isUser && message.streaming && !message.text
  const shownRefs = isUser ? [] : relevantReferences(message.references, message.text)

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] rounded-card px-4 py-2.5 ${
          isUser
            ? 'bg-amber-500 text-white'
            : message.error
              ? 'bg-red-50 text-red-600 ring-1 ring-red-500/30'
              : 'bg-ink-800 text-mist-100'
        }`}
      >
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {isUser ? (
            message.text
          ) : waiting ? (
            <TypingDots />
          ) : (
            <>
              {renderText(message.text, onSeek)}
              {message.streaming && (
                <span className="ml-0.5 inline-block h-4 w-1.5 animate-blink bg-amber-500 align-middle" />
              )}
            </>
          )}
        </div>

        {shownRefs.length > 0 && (
          <div className="scroll-slim mt-3 flex gap-2 overflow-x-auto pb-1">
            {shownRefs.map((ref, i) => (
              <FrameReference key={`${ref.frame_path}-${i}`} reference={ref} onSeek={onSeek} />
            ))}
          </div>
        )}

        {!isUser && !message.streaming && !message.error && message.model && (
          <div className="mt-2 font-mono text-[11px] text-mist-500">
            {message.model}
            {message.latencyMs ? ` · ${message.latencyMs} ms` : ''}
          </div>
        )}
      </div>
    </div>
  )
}
