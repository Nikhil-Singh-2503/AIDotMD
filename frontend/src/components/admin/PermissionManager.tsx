import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/useToast'
import { X, Shield, Plus, Trash2 } from 'lucide-react'

interface User {
  id: string
  email: string
  display_name: string
  role: string
  is_service_account?: boolean
}

interface Permission {
  id: string
  user_id: string
  document_id?: string | null
  section_id?: string | null
  permission: string
}

type Mode = 'document' | 'section'

interface Props {
  documentId?: string
  sectionId?: string
  mode: Mode
  open: boolean
  onClose: () => void
}

const PERM_OPTIONS = ['read', 'write']

async function fetchUsers(): Promise<User[]> {
  const token = localStorage.getItem('aidotmd_session_token')
  const res = await fetch('/api/v1/admin/users', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return []
  return res.json()
}

async function fetchPermissions(params: { document_id?: string; section_id?: string }): Promise<Permission[]> {
  const token = localStorage.getItem('aidotmd_session_token')
  const query = new URLSearchParams()
  if (params.document_id) query.set('document_id', params.document_id)
  if (params.section_id) query.set('section_id', params.section_id)
  const res = await fetch(`/api/v1/permissions?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return []
  return res.json()
}

async function upsertPermission(data: { user_id: string; document_id?: string; section_id?: string; permission: string }) {
  const token = localStorage.getItem('aidotmd_session_token')
  const res = await fetch('/api/v1/permissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to save permission')
  return res.json()
}

async function deletePermission(id: string) {
  const token = localStorage.getItem('aidotmd_session_token')
  await fetch(`/api/v1/permissions/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function PermissionManager({ documentId, sectionId, mode, open, onClose }: Props) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [adding, setAdding] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedPerm, setSelectedPerm] = useState('read')

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchUsers,
    enabled: open,
  })

  const params = documentId ? { document_id: documentId } : { section_id: sectionId! }

  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions', documentId, sectionId],
    queryFn: () => fetchPermissions(params),
    enabled: open,
  })

  const addPerm = useMutation({
    mutationFn: () => upsertPermission({
      user_id: selectedUserId,
      ...(documentId ? { document_id: documentId } : { section_id: sectionId! }),
      permission: selectedPerm,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permissions', documentId, sectionId] })
      setAdding(false)
      setSelectedUserId('')
      toast({ title: 'Permission added', variant: 'success' })
    },
    onError: (err: any) => toast({ title: 'Failed', description: err.message, variant: 'error' }),
  })

  const removePerm = useMutation({
    mutationFn: deletePermission,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permissions', documentId, sectionId] })
      toast({ title: 'Permission removed', variant: 'success' })
    },
    onError: (err: any) => toast({ title: 'Failed', description: err.message, variant: 'error' }),
  })

  const updatePerm = useMutation({
    mutationFn: ({ id, permission }: { id: string; permission: string }) =>
      fetch(`/api/v1/permissions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('aidotmd_session_token')}` },
        body: JSON.stringify({ permission }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permissions', documentId, sectionId] })
      qc.invalidateQueries({ queryKey: ['nav-tree'] })
      toast({ title: 'Permission updated', variant: 'success' })
    },
    onError: (err: any) => toast({ title: 'Failed', description: err.message, variant: 'error' }),
  })

  const availableUsers = users.filter(
    u => !u.is_service_account && !permissions.some(p => p.user_id === u.id)
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center print:hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background rounded-xl border border-border shadow-2xl p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-base font-semibold">
              Manage Access — {mode === 'document' ? 'Document' : 'Section'}
            </h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 mb-4">
          {permissions.length === 0 && !adding && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No specific permissions set. Access is determined by global user roles.
            </p>
          )}
          {permissions.map((p) => {
            const user = users.find(u => u.id === p.user_id)
            return (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                    {user?.display_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{user?.display_name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email || ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={p.permission}
                    onChange={(e) => updatePerm.mutate({ id: p.id, permission: e.target.value })}
                    className="rounded-md border border-border bg-transparent px-2 py-1 text-xs cursor-pointer"
                  >
                    {PERM_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removePerm.mutate(p.id)}
                    className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {adding ? (
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">User</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">Select a user...</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.display_name} ({u.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Permission</label>
              <select
                value={selectedPerm}
                onChange={(e) => setSelectedPerm(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {PERM_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
              <Button size="sm" onClick={() => addPerm.mutate()} disabled={!selectedUserId || addPerm.isPending}>
                {addPerm.isPending ? 'Adding...' : 'Add'}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => setAdding(true)}>
            <Plus className="w-3.5 h-3.5" />
            Add People
          </Button>
        )}
      </div>
    </div>
  )
}
