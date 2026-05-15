import { useToast } from '@/hooks/useToast'
import { Toast } from './Toast'

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div
      className="fixed top-4 right-2 sm:right-4 z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast
            title={t.title}
            description={t.description}
            variant={t.variant}
            action={t.action}
            onDismiss={() => dismiss(t.id)}
          />
        </div>
      ))}
    </div>
  )
}
