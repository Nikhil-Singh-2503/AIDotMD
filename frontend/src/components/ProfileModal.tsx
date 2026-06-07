import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { X, Key, Copy, Check, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { api } from '@/api/client'
import { cn } from '@/lib/utils'

interface Props {
  onClose: () => void
}

export function ProfileModal({ onClose }: Props) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [key, setKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.auth.myMcpKey()
      .then(res => setKey(res.mcp_key))
      .catch(() => setKey(''))
  }, [])

  const regen = useMutation({
    mutationFn: api.auth.regenerateMyMcpKey,
    onSuccess: (res) => {
      setKey(res.mcp_key)
      toast({ title: 'MCP key regenerated', variant: 'warning' })
    },
    onError: (err: any) => toast({ title: 'Failed to regenerate key', description: err.message, variant: 'error' }),
  })

  const handleCopy = async () => {
    await navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({ title: 'Copied to clipboard', variant: 'success' })
  }

  const maskedKey = key ? `${key.slice(0, 12)}${'•'.repeat(20)}` : '—'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center print:hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-background rounded-xl border border-border shadow-2xl p-6 w-full max-w-sm mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">Profile</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User info */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
            {user?.display_name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{user?.display_name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            <p className="text-[11px] text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>

        {/* MCP Key */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">MCP API Key</span>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 mb-3">
            <code className="flex-1 text-xs font-mono text-foreground truncate">
              {showKey ? key : maskedKey}
            </code>
            <button
              onClick={() => setShowKey(v => !v)}
              className="text-muted-foreground hover:text-foreground shrink-0"
              title={showKey ? 'Hide' : 'Reveal'}
            >
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleCopy}
              className="text-muted-foreground hover:text-foreground shrink-0"
              title="Copy"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-xs"
            onClick={() => regen.mutate()}
            disabled={regen.isPending}
          >
            <RefreshCw className={cn('w-3 h-3', regen.isPending && 'animate-spin')} />
            Regenerate
          </Button>
        </div>
      </div>
    </div>
  )
}
