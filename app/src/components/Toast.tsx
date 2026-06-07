import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'

/** Transient ~2s confirmation toasts (created / cancelled / saved).
 *  Toasts are never destination screens (CLAUDE.md §4 save-then-route). */

interface ToastContextValue {
  showToast: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((msg: string) => {
    if (timer.current) clearTimeout(timer.current)
    setMessage(msg)
    timer.current = setTimeout(() => setMessage(null), 2000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[104px] z-50 flex justify-center">
          <div
            className="inline-flex items-center gap-2 rounded-pill bg-ink px-4 py-2.5 text-[12.5px] font-semibold text-onbrand"
            style={{ boxShadow: '0 12px 28px -12px rgba(26,26,26,0.5)' }}
          >
            <Check size={13} strokeWidth={2.6} />
            {message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
