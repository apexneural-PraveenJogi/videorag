import { formatTimestamp } from '../utils/formatTimestamp'

// Horizontal strip of all extracted keyframes; click to seek the player.
export default function FrameStrip({ frames, onSeek }) {
  if (!frames?.length) return null
  return (
    <div className="border-t border-slate-200 bg-white px-3 py-2">
      <div className="mb-1 text-xs font-medium text-slate-400">
        Keyframes ({frames.length})
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {frames.map((f, i) => (
          <button
            key={`${f.frame_path}-${i}`}
            type="button"
            onClick={() => onSeek?.(f.timestamp)}
            title={`Jump to ${formatTimestamp(f.timestamp)}`}
            className="group relative shrink-0 overflow-hidden rounded-md border border-slate-200 transition hover:border-brand-500"
          >
            <img
              src={f.frame_path}
              alt={`Frame at ${formatTimestamp(f.timestamp)}`}
              className="h-12 w-20 object-cover"
              loading="lazy"
            />
            <span className="absolute bottom-0 right-0 rounded-tl bg-black/70 px-1 text-[9px] text-white">
              {formatTimestamp(f.timestamp)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
