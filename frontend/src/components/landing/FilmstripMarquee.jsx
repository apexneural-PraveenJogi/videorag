// A reel of real questions you can ask, scrolling like a filmstrip. Doubled
// content makes the loop seamless; edges fade via the .marquee-mask gradient.
const QUESTIONS = [
  'where do they sign the deal?',
  'summarize this call in three bullets',
  'find every time pricing comes up',
  "what's on the whiteboard at the end?",
  'jump to the product demo',
  'who raised the budget question?',
  'show me the part about onboarding',
]

export default function FilmstripMarquee() {
  const items = [...QUESTIONS, ...QUESTIONS]
  return (
    <div className="marquee-mask overflow-hidden border-y border-ink-600 bg-ink-800/40 py-4">
      <div className="marquee-track gap-3">
        {items.map((q, i) => (
          <span
            key={i}
            className="mx-1.5 inline-flex items-center gap-2 rounded-full border border-ink-500 bg-ink-800 px-4 py-2 font-mono text-xs text-mist-300"
          >
            <span className="text-amber-500">›</span>
            {q}
          </span>
        ))}
      </div>
    </div>
  )
}
