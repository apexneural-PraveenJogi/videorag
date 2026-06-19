import { formatTimestamp } from '../utils/formatTimestamp'

// Horizontal strip of all extracted keyframes; click to seek the player.
export default function FrameStrip({ frames, onSeek }) {
  if (!frames?.length) return null
  return (
    <div className="scroll-slim border-t border-ink-700 bg-ink-800/60 px-3 py-2">
      <div className="mb-1 font-mono text-xs font-medium text-mist-500">
        Keyframes ({frames.length})
      </div>
      <div className="scroll-slim flex gap-2 overflow-x-auto pb-1">
        {frames.map((f, i) => (
          <button
            key={`${f.frame_path}-${i}`}
            type="button"
            onClick={() => onSeek?.(f.timestamp)}
            title={`Jump to ${formatTimestamp(f.timestamp)}`}
            className="group relative shrink-0 overflow-hidden rounded-md border border-ink-500 transition hover:border-amber-500"
          >
            <img
              src={f.frame_path}
              alt={`Frame at ${formatTimestamp(f.timestamp)}`}
              className="h-12 w-20 object-cover"
              loading="lazy"
            />
            <span className="absolute bottom-0 right-0 rounded-tl bg-ink-900/80 px-1 font-mono text-[9px] text-amber-400">
              {formatTimestamp(f.timestamp)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
