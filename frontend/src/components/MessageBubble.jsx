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

// Inline: turn timecode mentions into clickable seek chips. `keyBase` keeps React
// keys unique across the many segments a single answer is split into.
function renderTimecodes(text, onSeek, keyBase) {
  const out = []
  let last = 0
  let m
  TS_RE.lastIndex = 0
  while ((m = TS_RE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const label = m[1]
    out.push(
      <button
        key={`${keyBase}-${m.index}-${label}`}
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

const BOLD_RE = /\*\*([^*]+)\*\*/g

// Inline rendering for one line: render **bold** as bold, timecodes as chips, and
// strip any stray Markdown asterisks so the user never sees raw `*` symbols.
function renderInline(text, onSeek, keyBase) {
  const nodes = []
  let seg = 0
  let last = 0
  let m
  BOLD_RE.lastIndex = 0
  const pushPlain = (s) => {
    if (!s) return
    const cleaned = s.replace(/\*+/g, '') // drop any leftover asterisks
    if (cleaned) nodes.push(...renderTimecodes(cleaned, onSeek, `${keyBase}-p${seg++}`))
  }
  while ((m = BOLD_RE.exec(text)) !== null) {
    pushPlain(text.slice(last, m.index))
    nodes.push(
      <strong key={`${keyBase}-b${seg++}`} className="font-semibold">
        {renderTimecodes(m[1], onSeek, `${keyBase}-bi${seg}`)}
      </strong>,
    )
    last = BOLD_RE.lastIndex
  }
  pushPlain(text.slice(last))
  return nodes
}

// Block rendering: split the answer into paragraphs and bullet lists so it reads
// as clean formatted text rather than a wall of Markdown symbols.
function renderRich(text, onSeek) {
  const lines = (text || '').split('\n')
  const blocks = []
  let bullets = null
  const flush = (k) => {
    if (bullets && bullets.length) {
      blocks.push(
        <ul key={`ul-${k}`} className="list-disc space-y-1 pl-5">
          {bullets}
        </ul>,
      )
    }
    bullets = null
  }
  lines.forEach((line, i) => {
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/)
    if (bullet) {
      if (!bullets) bullets = []
      bullets.push(<li key={`li-${i}`}>{renderInline(bullet[1], onSeek, `li-${i}`)}</li>)
    } else if (line.trim() === '') {
      flush(i)
    } else {
      flush(i)
      blocks.push(
        <p key={`p-${i}`} className="break-words">
          {renderInline(line, onSeek, `p-${i}`)}
        </p>,
      )
    }
  })
  flush('end')
  return blocks
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
        <div className="break-words text-sm leading-relaxed">
          {isUser ? (
            <span className="whitespace-pre-wrap">{message.text}</span>
          ) : waiting ? (
            <TypingDots />
          ) : (
            <div className="space-y-2">
              {renderRich(message.text, onSeek)}
              {message.streaming && (
                <span className="ml-0.5 inline-block h-4 w-1.5 animate-blink bg-amber-500 align-middle" />
              )}
            </div>
          )}
        </div>

        {shownRefs.length > 0 && (
          <div className="scroll-slim mt-3 flex gap-2 overflow-x-auto pb-1">
            {shownRefs.map((ref, i) => (
              <FrameReference key={`${ref.frame_path}-${i}`} reference={ref} onSeek={onSeek} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
