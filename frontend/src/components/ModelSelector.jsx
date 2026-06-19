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
    <label className="flex items-center gap-2 text-xs text-slate-500">
      <span className="hidden sm:inline">Vision model</span>
      <select
        value={model}
        onChange={(e) => setModel(e.target.value)}
        className="max-w-[14rem] rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:border-brand-500 focus:outline-none"
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
