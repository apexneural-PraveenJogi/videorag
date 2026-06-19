import { formatTimestamp } from '../utils/formatTimestamp'

// A clickable keyframe thumbnail; clicking seeks the player to its timestamp.
export default function FrameReference({ reference, onSeek }) {
  const { timestamp, frame_path } = reference
  return (
    <button
      type="button"
      onClick={() => onSeek?.(timestamp)}
      title={`Jump to ${formatTimestamp(timestamp)}`}
      className="group relative shrink-0 overflow-hidden rounded-md border border-slate-200 transition hover:border-brand-500 hover:ring-2 hover:ring-brand-200"
    >
      <img
        src={frame_path}
        alt={`Frame at ${formatTimestamp(timestamp)}`}
        className="h-16 w-28 object-cover"
        loading="lazy"
      />
      <span className="absolute bottom-0 right-0 rounded-tl bg-black/70 px-1 text-[10px] font-medium text-white">
        {formatTimestamp(timestamp)}
      </span>
    </button>
  )
}
