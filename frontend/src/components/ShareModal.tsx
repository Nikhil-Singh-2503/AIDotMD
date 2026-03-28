import { useState, useCallback } from 'react'
import { Share2, Check, Copy, Eye, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AppSettings } from '@/api/client'

interface ShareModalProps {
  docPath: string
  settings: AppSettings | undefined
}

type Permission = 'view' | 'edit'

export function ShareModal({ docPath, settings }: ShareModalProps) {
  const [open, setOpen] = useState(false)
  const [perm, setPerm] = useState<Permission>('view')
  const [copied, setCopied] = useState(false)

  const baseUrl = (() => {
    if (settings?.use_public_url && settings?.base_url) {
      return settings.base_url.replace(/\/$/, '')
    }
    return window.location.origin
  })()

  const shareUrl = perm === 'edit' && settings?.share_edit_token
    ? `${baseUrl}${docPath}?share_token=${settings.share_edit_token}`
    : `${baseUrl}${docPath}`

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [shareUrl])

  return (
    <>
      {/* Trigger button */}
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground/50 hover:text-foreground"
        onClick={() => { setOpen(true); setPerm('view'); setCopied(false) }}
        title="Share"
      >
        <Share2 className="w-4 h-4" />
      </Button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center print:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="relative bg-background rounded-xl border border-border shadow-2xl p-6 w-full max-w-sm mx-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold">Share this document</h2>
              <button
                className="text-muted-foreground/60 hover:text-foreground transition-colors"
                onClick={() => setOpen(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Permission toggle */}
            <p className="text-xs text-muted-foreground mb-2 font-medium">Permission</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              <button
                onClick={() => setPerm('view')}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  perm === 'view'
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                }`}
              >
                <Eye className="w-3.5 h-3.5 shrink-0" />
                <span className="font-medium">View only</span>
              </button>
              <button
                onClick={() => setPerm('edit')}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  perm === 'edit'
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                }`}
              >
                <Pencil className="w-3.5 h-3.5 shrink-0" />
                <span className="font-medium">Can edit</span>
              </button>
            </div>

            {/* URL display + copy */}
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 rounded-lg border border-border bg-muted/40 px-3 py-2">
                <p className="text-xs font-mono text-muted-foreground truncate" title={shareUrl}>
                  {shareUrl}
                </p>
              </div>
              <Button
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={handleCopy}
              >
                {copied
                  ? <><Check className="w-3.5 h-3.5" /> Copied</>
                  : <><Copy className="w-3.5 h-3.5" /> Copy</>
                }
              </Button>
            </div>

            {/* Helper text */}
            <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
              {perm === 'view'
                ? 'Recipients can read the document but cannot make any changes.'
                : 'Recipients can edit this document. Keep this link private.'}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
