import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Share2, Check, Copy, Eye, Pencil, X, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/useToast'
import type { AppSettings } from '@/api/client'

interface ShareLink {
  id: string
  token: string
  document_id?: string | null
  permission: string
  expires_at?: string | null
  max_uses?: number | null
  use_count: number
  created_at: string
}

interface ShareModalProps {
  docPath: string
  documentId: string
  settings: AppSettings | undefined
}

async function fetchLinks(documentId: string): Promise<ShareLink[]> {
  const token = localStorage.getItem('aidotmd_session_token')
  const res = await fetch(`/api/v1/share-links?document_id=${documentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return []
  return res.json()
}

async function createLink(documentId: string, permission: string, expiresIn: number | null, maxUses: number | null) {
  const token = localStorage.getItem('aidotmd_session_token')
  const body: any = { document_id: documentId, permission }
  if (expiresIn) body.expires_in_seconds = expiresIn
  if (maxUses) body.max_uses = maxUses
  const res = await fetch('/api/v1/share-links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Failed to create link')
  return res.json()
}

async function revokeLink(id: string) {
  const token = localStorage.getItem('aidotmd_session_token')
  await fetch(`/api/v1/share-links/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

const EXPIRY_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Never', value: null },
  { label: '1 hour', value: 3600 },
  { label: '24 hours', value: 86400 },
  { label: '7 days', value: 604800 },
  { label: '30 days', value: 2592000 },
]

export function ShareModal({ docPath, documentId, settings }: ShareModalProps) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [perm, setPerm] = useState<'read' | 'write'>('read')
  const [expiry, setExpiry] = useState<number | null>(null)
  const [maxUses, setMaxUses] = useState<number | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const baseUrl = (() => {
    if (settings?.use_public_url && settings?.base_url) {
      return settings.base_url.replace(/\/$/, '')
    }
    return window.location.origin
  })()

  const { data: links = [] } = useQuery({
    queryKey: ['share-links', documentId],
    queryFn: () => fetchLinks(documentId),
    enabled: open && !!documentId,
  })

  const create = useMutation({
    mutationFn: () => createLink(documentId, perm, expiry, maxUses),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['share-links', documentId] })
      toast({ title: 'Share link created', variant: 'success' })
    },
    onError: (err: any) => toast({ title: 'Failed', description: err.message, variant: 'error' }),
  })

  const revoke = useMutation({
    mutationFn: revokeLink,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['share-links', documentId] })
      toast({ title: 'Link revoked', variant: 'warning' })
    },
  })

  const copyLink = useCallback((token: string) => {
    const url = `${baseUrl}${docPath}?share=${token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(token)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }, [baseUrl, docPath])

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground/50 hover:text-foreground"
        onClick={() => { setOpen(true); setPerm('read'); setExpiry(null); setMaxUses(null) }}
        title="Share"
      >
        <Share2 className="w-4 h-4" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center print:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-background rounded-xl border border-border shadow-2xl p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Share this document</h2>
              <button className="text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Existing links */}
            {links.length > 0 && (
              <div className="mb-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Active share links</p>
                {links.map((link) => {
                  const isCopied = copiedId === link.token
                  return (
                    <div key={link.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <Badge variant={link.permission === 'write' ? 'secondary' : 'outline'}>
                            {link.permission === 'write' ? 'Edit' : 'View'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {link.use_count}{link.max_uses ? `/${link.max_uses}` : ''} uses
                          </span>
                          {link.expires_at && (
                            <span className="text-xs text-muted-foreground">
                              · expires {new Date(link.expires_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-muted-foreground truncate mt-0.5 select-all">
                          {`${baseUrl}${docPath}?share=${link.token}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyLink(link.token)}>
                          {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => revoke.mutate(link.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Create new link */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Create new link</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPerm('read')}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    perm === 'read'
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-medium">View only</span>
                </button>
                <button
                  onClick={() => setPerm('write')}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    perm === 'write'
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-medium">Can edit</span>
                </button>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Expires</label>
                <select
                  value={expiry ?? ''}
                  onChange={e => setExpiry(e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                >
                  {EXPIRY_OPTIONS.map(o => (
                    <option key={o.label} value={o.value ?? ''}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Max uses</label>
                <select
                  value={maxUses ?? ''}
                  onChange={e => setMaxUses(e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                >
                  <option value="">Unlimited</option>
                  <option value="1">1 use</option>
                  <option value="5">5 uses</option>
                  <option value="10">10 uses</option>
                  <option value="25">25 uses</option>
                  <option value="100">100 uses</option>
                </select>
              </div>

              <Button
                size="sm"
                className="w-full gap-1.5"
                onClick={() => create.mutate()}
                disabled={create.isPending}
              >
                <Plus className="w-3.5 h-3.5" />
                {create.isPending ? 'Creating...' : 'Create Share Link'}
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
              {perm === 'read'
                ? 'Recipients can read the document.'
                : 'Recipients can edit this document. Keep this link private.'}
              {expiry ? ' Link auto-expires.' : ' Link never expires.'}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
