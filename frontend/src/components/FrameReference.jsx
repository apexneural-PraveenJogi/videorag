import { formatTimestamp } from '../utils/formatTimestamp'

// A clickable keyframe thumbnail; clicking seeks the player to its timestamp.
export default function FrameReference({ reference, onSeek }) {
  const { timestamp, frame_path } = reference
  return (
    <button
      type="button"
      onClick={() => onSeek?.(timestamp)}
      title={`Jump to ${formatTimestamp(timestamp)}`}
      className="group relative shrink-0 overflow-hidden rounded-md border border-ink-500 transition hover:border-amber-500 hover:ring-2 hover:ring-amber-500/30"
    >
      <img
        src={frame_path}
        alt={`Frame at ${formatTimestamp(timestamp)}`}
        className="h-16 w-28 object-cover"
        loading="lazy"
      />
      <span className="absolute bottom-0 right-0 rounded-tl bg-ink-900/80 px-1 font-mono text-[10px] font-medium text-amber-400">
        {formatTimestamp(timestamp)}
      </span>
    </button>
  )
}
