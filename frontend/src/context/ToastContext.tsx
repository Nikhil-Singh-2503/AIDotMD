import { createContext, useCallback, useState, useRef, type ReactNode } from 'react'

export interface Toast {
  id: string
  title: string
  description?: string
  variant: 'default' | 'success' | 'error' | 'warning'
  duration?: number
  action?: { label: string; onClick: () => void }
}

interface ToastContextValue {
  toasts: Toast[]
  toast: (t: Omit<Toast, 'id'>) => string
  dismiss: (id: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = `toast-${++counter.current}`
      const duration = t.duration ?? 4000
      setToasts((prev) => [...prev, { ...t, id }])

      if (duration > 0) {
        setTimeout(() => dismiss(id), duration)
      }

      return id
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  )
}
