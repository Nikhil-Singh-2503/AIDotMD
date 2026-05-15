import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

const toastVariants = cva(
  'pointer-events-auto relative flex w-full items-start gap-3 rounded-lg border p-4 shadow-lg',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground border-border',
        success: 'bg-green-50 text-green-900 border-green-200 dark:bg-green-950 dark:text-green-100 dark:border-green-800',
        error: 'bg-red-50 text-red-900 border-red-200 dark:bg-red-950 dark:text-red-100 dark:border-red-800',
        warning: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-800',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

const iconMap = {
  default: Info,
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
}

export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  title: string
  description?: string
  onDismiss?: () => void
  action?: { label: string; onClick: () => void }
}

export function Toast({ className, variant, title, description, onDismiss, action, ...props }: ToastProps) {
  const Icon = iconMap[variant ?? 'default']

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(toastVariants({ variant }), 'animate-in-slide', className)}
      {...props}
    >
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {description && (
          <p className="text-sm opacity-80 mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {action && (
          <button
            onClick={action.onClick}
            className="text-xs font-medium underline underline-offset-2 hover:opacity-80 whitespace-nowrap"
          >
            {action.label}
          </button>
        )}
        <button
          onClick={onDismiss}
          className="rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
