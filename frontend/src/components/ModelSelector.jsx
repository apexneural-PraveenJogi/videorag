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
    <label className="flex items-center gap-2 font-mono text-xs text-mist-500">
      <span className="hidden sm:inline">Model</span>
      <select
        value={model}
        onChange={(e) => setModel(e.target.value)}
        className="max-w-[14rem] rounded-md border border-ink-600 bg-ink-900 px-2 py-1 text-xs text-mist-100 focus:border-amber-500/50 focus:outline-none"
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
