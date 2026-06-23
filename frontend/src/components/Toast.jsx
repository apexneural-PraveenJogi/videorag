import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const ToastContext = createContext(() => {})

// useToast() returns a function: toast(message, type?) where type is
// 'error' | 'success' | 'info'. Auto-dismisses after 5s.
export function useToast() {
  return useContext(ToastContext)
}

const STYLES = {
  error: 'border-red-500/40 bg-red-50 text-red-700',
  success: 'border-amber-500/40 bg-ink-800 text-mist-100',
  info: 'border-ink-600 bg-ink-800 text-mist-100',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const toast = useCallback(
    (message, type = 'info') => {
      const id = ++idRef.current
      setToasts((t) => [...t, { id, message, type }])
      setTimeout(() => dismiss(id), 5000)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.2 }}
              onClick={() => dismiss(t.id)}
              className={`pointer-events-auto cursor-pointer rounded-card border px-4 py-3 text-sm ${STYLES[t.type] || STYLES.info}`}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
