// A play-head-on-a-timeline mark: the project's core motif (find the moment).
export default function Logo({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#10141D" stroke="#2A3242" />
      {/* timeline track */}
      <line x1="7" y1="16" x2="25" y2="16" stroke="#2A3242" strokeWidth="2" strokeLinecap="round" />
      {/* playhead */}
      <line x1="19" y1="9" x2="19" y2="23" stroke="#F5C451" strokeWidth="2" strokeLinecap="round" />
      <circle cx="19" cy="16" r="3" fill="#F5C451" />
      {/* ticks */}
      <line x1="10" y1="14" x2="10" y2="18" stroke="#3A4357" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="13.5" y1="14.5" x2="13.5" y2="17.5" stroke="#3A4357" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
