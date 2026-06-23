import { useEffect, useState } from 'react'
import { getModels } from '../services/modelService'
import { useChatStore } from '../store/chatStore'

export default function ModelSelector() {
  const model = useChatStore((s) => s.model)
  const setModel = useChatStore((s) => s.setModel)
  const [models, setModels] = useState([])

  useEffect(() => {
    let cancelled = false
    getModels()
      .then((data) => {
        if (cancelled) return
        setModels(data.models)
        if (!model) setModel(data.default)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <label className="flex items-center gap-2 text-xs text-mist-500">
      <span className="hidden sm:inline">Model</span>
      <select
        value={model}
        onChange={(e) => setModel(e.target.value)}
        className="max-w-[14rem] rounded-pill bg-ink-700 px-3 py-1.5 text-xs text-mist-100 outline-none transition-shadow focus:ring-2 focus:ring-amber-500/40"
      >
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
    </label>
  )
}
