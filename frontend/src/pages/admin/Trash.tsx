import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, type Section, type Document } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, RefreshCw, Trash2, X, AlertTriangle } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

function TrashItemRow({ 
  item, 
  type, 
  onRestore, 
  onHardDelete 
}: { 
  item: Section | Document, 
  type: 'section' | 'document',
  onRestore: (id: string, t: 'section'|'document') => void,
  onHardDelete: (id: string, t: 'section'|'document', title: string) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <Badge variant={type === 'section' ? 'default' : 'secondary'} className="w-20 justify-center">
          {type === 'section' ? 'Section' : 'Document'}
        </Badge>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{item.title}</span>
          <span className="text-xs text-muted-foreground font-mono">{item.slug}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-muted-foreground mr-4 hidden sm:inline-block">
          Deleted: {item.deleted_at ? new Date(item.deleted_at.endsWith('Z') || item.deleted_at.includes('+') ? item.deleted_at : item.deleted_at + 'Z').toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown'}
        </span>
        <Button variant="outline" size="sm" onClick={() => onRestore(item.id, type)} className="gap-1.5 h-8">
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline-block">Restore</span>
        </Button>
        <Button variant="destructive" size="sm" onClick={() => onHardDelete(item.id, type, item.title)} className="gap-1.5 h-8">
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline-block">Delete</span>
        </Button>
      </div>
    </div>
  )
}

export default function AdminTrash() {
  const qc = useQueryClient()
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; id: string; type: 'section' | 'document'; title: string } | null>(null)

  const { data: trashData, isLoading } = useQuery({
    queryKey: ['trash'],
    queryFn: api.trash.list,
  })

  const restore = useMutation({
    mutationFn: ({ id, type }: { id: string, type: 'section' | 'document' }) => api.trash.restore(id, type),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trash'] })
      qc.invalidateQueries({ queryKey: ['sections'] })
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['nav'] })
      // optional toast('Restored successfully') if toaster imported
    },
    onError: (err: any) => alert(err.message)
  })

  const hardDelete = useMutation({
    mutationFn: ({ id, type }: { id: string, type: 'section' | 'document' }) => api.trash.hardDelete(id, type),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trash'] })
    },
    onError: (err: any) => alert(err.message)
  })

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading trash...</div>
  }

  const sections = trashData?.sections || []
  const documents = trashData?.documents || []
  const isEmpty = sections.length === 0 && documents.length === 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Trash</h1>
            <p className="text-xs text-muted-foreground">
              Restore soft-deleted items or delete them permanently
            </p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      {isEmpty ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <Trash2 className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm font-medium">Trash is empty</p>
            <p className="text-xs">No deleted sections or documents available.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {sections.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-1">
                Deleted Sections ({sections.length})
              </h2>
              <div className="space-y-2">
                {sections.map(s => (
                  <TrashItemRow
                    key={s.id}
                    item={s}
                    type="section"
                    onRestore={(id, type) => restore.mutate({ id, type })}
                    onHardDelete={(id, type, title) => setDeleteDialog({ isOpen: true, id, type, title })}
                  />
                ))}
              </div>
            </div>
          )}

          {documents.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-1">
                Deleted Documents ({documents.length})
              </h2>
              <div className="space-y-2">
                {documents.map(d => (
                  <TrashItemRow
                    key={d.id}
                    item={d}
                    type="document"
                    onRestore={(id, type) => restore.mutate({ id, type })}
                    onHardDelete={(id, type, title) => setDeleteDialog({ isOpen: true, id, type, title })}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteDialog?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center print:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDeleteDialog(null)}
          />

          {/* Panel */}
          <div className="relative bg-background rounded-xl border border-border shadow-2xl p-6 w-full max-w-sm mx-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-500" />
              </div>
              <h2 className="text-base font-semibold">Delete Permanently</h2>
              <button
                className="absolute top-4 right-4 text-muted-foreground/60 hover:text-foreground transition-colors"
                onClick={() => setDeleteDialog(null)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to permanently delete <span className="font-semibold text-foreground">"{deleteDialog.title}"</span>? This action cannot be undone and the content will be lost forever.
            </p>

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteDialog(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={hardDelete.isPending}
                onClick={() => {
                  hardDelete.mutate({ id: deleteDialog.id, type: deleteDialog.type }, {
                    onSuccess: () => setDeleteDialog(null)
                  })
                }}
              >
                {hardDelete.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
