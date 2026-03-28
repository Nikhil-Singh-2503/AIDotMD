import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { DocumentVersion, SectionVersion } from '@/api/client'
import { Button } from '@/components/ui/button'
import { History, RotateCcw, X, ChevronDown, ChevronRight } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

type Mode = 'document' | 'section'
type AnyVersion = DocumentVersion | SectionVersion

interface Props {
  id: string
  mode: Mode
  onRestored?: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function isDocVersion(v: AnyVersion): v is DocumentVersion {
  return 'document_id' in v
}

// ── Version row ────────────────────────────────────────────────────────────────

function VersionRow({
  v,
  onRestore,
  restoring,
  expanded,
  onToggleExpand,
  isCurrent,
}: {
  v: AnyVersion
  onRestore: (id: string) => void
  restoring: boolean
  expanded: boolean
  onToggleExpand: () => void
  isCurrent: boolean
}) {
  const docV = isDocVersion(v) ? v : null

  return (
    <div className={`border rounded-lg overflow-hidden transition-colors ${isCurrent ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
      <div className="flex items-center gap-3 px-4 py-2.5">
        {docV ? (
          <button
            onClick={onToggleExpand}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <div className="w-4 shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-semibold text-primary">{v.version || '—'}</span>
            {isCurrent && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium uppercase tracking-wide">
                Current
              </span>
            )}
            <span className="text-xs text-muted-foreground">{v.title}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{formatTime(v.created_at)}</p>
        </div>

        {!isCurrent && (
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 h-7 text-xs gap-1.5"
            disabled={restoring}
            onClick={() => onRestore(v.id)}
          >
            <RotateCcw className="w-3 h-3" />
            Restore
          </Button>
        )}
      </div>

      {docV && expanded && (
        <div className="border-t px-4 py-3 bg-muted/30">
          <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap line-clamp-10 font-mono leading-relaxed max-h-52 overflow-y-auto">
            {docV.content || '(empty)'}
          </pre>
        </div>
      )}
    </div>
  )
}

// ── Main modal ─────────────────────────────────────────────────────────────────

export function VersionHistoryModal({ id, mode, onRestored }: Props) {
  const [open, setOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const qc = useQueryClient()

  const { data: versions = [] as AnyVersion[], isLoading } = useQuery<AnyVersion[]>({
    queryKey: ['versions', mode, id],
    queryFn: () =>
      mode === 'document'
        ? (api.documents.getVersions(id) as Promise<AnyVersion[]>)
        : (api.sections.getVersions(id) as Promise<AnyVersion[]>),
    enabled: open && !!id,
  })

  const restore = useMutation<unknown, Error, string>({
    mutationFn: (versionId: string) =>
      mode === 'document'
        ? api.documents.restoreVersion(id, versionId)
        : api.sections.restoreVersion(id, versionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['versions', mode, id] })
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['sections'] })
      onRestored?.()
    },
  })

  const currentVersionId = (versions as AnyVersion[])[0]?.id

  return (
    <>
      {/* Trigger */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
        title="Version History"
      >
        <History className="w-4 h-4" />
        <span className="hidden sm:inline text-xs">History</span>
      </Button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          <div
            className="relative z-10 w-full max-w-sm h-full bg-background border-l border-border shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold">Version History</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {isLoading ? (
                <p className="text-sm text-muted-foreground animate-pulse px-1">Loading history…</p>
              ) : versions.length === 0 ? (
                <p className="text-sm text-muted-foreground px-1">No versions recorded yet.</p>
              ) : (
                (versions as AnyVersion[]).map(v => (
                  <VersionRow
                    key={v.id}
                    v={v}
                    isCurrent={v.id === currentVersionId}
                    onRestore={(vid) => restore.mutate(vid)}
                    restoring={restore.isPending}
                    expanded={expandedId === v.id}
                    onToggleExpand={() => setExpandedId(prev => prev === v.id ? null : v.id)}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t px-5 py-3">
              <p className="text-[11px] text-muted-foreground">
                Restoring creates a new version. No data is permanently removed.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
