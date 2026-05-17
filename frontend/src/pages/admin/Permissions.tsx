import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/useToast'
import { Shield, RefreshCw, Plus, Trash2, X, Search } from 'lucide-react'

interface User {
  id: string; email: string; display_name: string; role: string; is_service_account?: boolean
}

interface Section {
  id: string; title: string; slug: string
}

interface Document {
  id: string; title: string; slug: string; section_id: string
}

interface Permission {
  id: string; user_id: string; document_id?: string | null; section_id?: string | null
  permission: string; granted_by: string; created_at: string
}

const PERM_OPTIONS = ['read', 'write']

export default function AdminPermissions() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { user: currentUser } = useAuth()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ user_id: '', resource_type: 'document' as 'document' | 'section', resource_id: '', permission: 'read' })
  const [search, setSearch] = useState('')

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const token = localStorage.getItem('aidotmd_session_token')
      const res = await fetch('/api/v1/admin/users', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json() as Promise<User[]>
    },
  })

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: async () => {
      const token = localStorage.getItem('aidotmd_session_token')
      const res = await fetch('/api/v1/sections', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json() as Promise<Section[]>
    },
  })

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const token = localStorage.getItem('aidotmd_session_token')
      const res = await fetch('/api/v1/documents', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json() as Promise<Document[]>
    },
  })

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const token = localStorage.getItem('aidotmd_session_token')
      const res = await fetch('/api/v1/permissions', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return []
      return res.json() as Promise<Permission[]>
    },
  })

  const upsertPerm = useMutation({
    mutationFn: () => {
      const body: any = { user_id: form.user_id, permission: form.permission }
      if (form.resource_type === 'document') body.document_id = form.resource_id
      else body.section_id = form.resource_id
      return fetch('/api/v1/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('aidotmd_session_token')}` },
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permissions'] })
      setShowAdd(false)
      setForm({ user_id: '', resource_type: 'document', resource_id: '', permission: 'read' })
      toast({ title: 'Permission saved', variant: 'success' })
    },
    onError: (err: any) => toast({ title: 'Failed', description: err.message, variant: 'error' }),
  })

  const removePerm = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/v1/permissions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('aidotmd_session_token')}` },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permissions'] })
      toast({ title: 'Permission removed', variant: 'success' })
    },
    onError: (err: any) => toast({ title: 'Failed', description: err.message, variant: 'error' }),
  })

  const userName = (id: string) => users.find(u => u.id === id)?.display_name || id.slice(0, 8)
  const sectionTitle = (id: string) => sections.find(s => s.id === id)?.title || id.slice(0, 8)
  const docTitle = (id: string) => documents.find(d => d.id === id)?.title || id.slice(0, 8)

  const filtered = permissions.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return userName(p.user_id).toLowerCase().includes(q)
      || (p.document_id && docTitle(p.document_id).toLowerCase().includes(q))
      || (p.section_id && sectionTitle(p.section_id).toLowerCase().includes(q))
  })

  if (currentUser?.role !== 'admin') {
    return <div className="text-center py-12 text-muted-foreground"><Shield className="mx-auto h-8 w-8 mb-2 opacity-50" /><p>Admin access required</p></div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Permissions</h1>
          <p className="text-sm text-muted-foreground">
            {permissions.length} permission override{permissions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ['permissions'] })}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Permission
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by user or resource..."
          className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground animate-pulse">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <Shield className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm font-medium">No permission overrides</p>
            <p className="text-xs">Access is determined by global user roles. Add a permission to override.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">User</th>
                <th className="text-left p-3 font-medium">Resource</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Level</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Granted</th>
                <th className="p-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                        {userName(p.user_id).charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{userName(p.user_id)}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    {p.document_id ? docTitle(p.document_id) : p.section_id ? sectionTitle(p.section_id) : '—'}
                  </td>
                  <td className="p-3">
                    <Badge variant={p.document_id ? 'secondary' : 'default'}>
                      {p.document_id ? 'Document' : 'Section'}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <select
                      value={p.permission}
                      onChange={(e) => {
                        fetch(`/api/v1/permissions/${p.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('aidotmd_session_token')}` },
                          body: JSON.stringify({ permission: e.target.value }),
                        }).then(res => {
                          if (res.ok) {
                            qc.invalidateQueries({ queryKey: ['permissions'] })
                            toast({ title: 'Permission updated', variant: 'success' })
                          }
                        })
                      }}
                      className="rounded-md border border-border bg-transparent px-2 py-1 text-xs cursor-pointer"
                    >
                      {PERM_OPTIONS.map((o) => (
                        <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => removePerm.mutate(p.id)}
                      className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                      title="Remove permission"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Permission Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center print:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative bg-background rounded-xl border border-border shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Add Permission Override</h2>
              <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1">User</label>
                <select
                  value={form.user_id}
                  onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select user...</option>
                  {users.filter(u => !u.is_service_account).map(u => (
                    <option key={u.id} value={u.id}>{u.display_name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Resource Type</label>
                <div className="flex gap-2">
                  {(['document', 'section'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setForm(f => ({ ...f, resource_type: t, resource_id: '' }))}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        form.resource_type === t
                          ? 'border-foreground bg-foreground/5 font-medium'
                          : 'border-border hover:border-foreground/40'
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">{form.resource_type === 'document' ? 'Document' : 'Section'}</label>
                <select
                  value={form.resource_id}
                  onChange={e => setForm(f => ({ ...f, resource_id: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select {form.resource_type}...</option>
                {(form.resource_type === 'document' ? documents : sections).map((r: any) => (
                  <option key={r.id} value={r.id}>{r.title || r.slug}</option>
                ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Permission Level</label>
                <div className="flex gap-2">
                  {PERM_OPTIONS.map(o => (
                    <button
                      key={o}
                      onClick={() => setForm(f => ({ ...f, permission: o }))}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        form.permission === o
                          ? 'border-foreground bg-foreground/5 font-medium'
                          : 'border-border hover:border-foreground/40'
                      }`}
                    >
                      {o.charAt(0).toUpperCase() + o.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button size="sm" onClick={() => upsertPerm.mutate()} disabled={!form.user_id || !form.resource_id}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
