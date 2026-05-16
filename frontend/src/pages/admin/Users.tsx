import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import {
  RefreshCw, Shield, ShieldAlert, Plus, X, Trash2,
  KeyRound, UserCheck, UserX,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface User {
  id: string
  email: string
  display_name: string
  role: string
  is_active: boolean
  is_service_account: boolean
  created_at: string
}

async function fetchUsers(): Promise<User[]> {
  const token = localStorage.getItem('aidotmd_session_token')
  const res = await fetch('/api/v1/admin/users', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch users')
  return res.json()
}

async function apiCall(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem('aidotmd_session_token')
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(err.detail || 'Request failed')
  }
  if (res.status === 204) return null
  return res.json()
}

const roleOptions = ['admin', 'editor', 'viewer']

const roleBadge = (role: string) => {
  switch (role) {
    case 'admin':
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800">Admin</Badge>
    case 'editor':
      return <Badge variant="secondary">Editor</Badge>
    case 'viewer':
      return <Badge variant="outline">Viewer</Badge>
    default:
      return <Badge variant="outline">{role}</Badge>
  }
}

export default function AdminUsers() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { user: currentUser } = useAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', display_name: '', password: '', role: 'editor' })
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null)
  const [resetResult, setResetResult] = useState<string | null>(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchUsers,
  })

  const createUser = useMutation({
    mutationFn: () => apiCall('POST', '/api/v1/admin/users', newUser),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setShowCreate(false)
      setNewUser({ email: '', display_name: '', password: '', role: 'editor' })
      toast({ title: 'User created', variant: 'success' })
    },
    onError: (err: any) => toast({ title: 'Failed to create user', description: err.message, variant: 'error' }),
  })

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      apiCall('PUT', `/api/v1/admin/users/${id}`, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast({ title: 'Role updated', variant: 'success' })
    },
    onError: (err: any) => toast({ title: 'Failed to update role', description: err.message, variant: 'error' }),
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      apiCall('PUT', `/api/v1/admin/users/${id}`, { is_active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast({ title: 'User status updated', variant: 'success' })
    },
    onError: (err: any) => toast({ title: 'Failed to update status', description: err.message, variant: 'error' }),
  })

  const resetPassword = useMutation({
    mutationFn: (id: string) => apiCall('POST', `/api/v1/admin/users/${id}/reset-password`),
    onSuccess: (data: any) => {
      setResetResult(data.temp_password)
      toast({ title: 'Password reset', description: 'Copy the temp password before closing', variant: 'warning' })
    },
    onError: (err: any) => toast({ title: 'Failed to reset password', description: err.message, variant: 'error' }),
  })

  const deleteUser = useMutation({
    mutationFn: (id: string) => apiCall('DELETE', `/api/v1/admin/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setDeleteConfirm(null)
      toast({ title: 'User deleted', variant: 'warning' })
    },
    onError: (err: any) => toast({ title: 'Failed to delete', description: err.message, variant: 'error' }),
  })

  if (currentUser?.role !== 'admin') {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ShieldAlert className="mx-auto h-8 w-8 mb-2 opacity-50" />
        <p>Admin access required</p>
      </div>
    )
  }

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground animate-pulse">Loading users...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">{users.length} user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ['admin-users'] })}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      <div className="border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="text-left p-3 font-medium">User</th>
              <th className="text-left p-3 font-medium hidden sm:table-cell">Email</th>
              <th className="text-left p-3 font-medium">Role</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">Status</th>
              <th className="p-3 w-24 font-medium text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t hover:bg-muted/30 transition-colors">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {u.is_service_account ? (
                      <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                        {u.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{u.display_name}</p>
                      <p className="text-xs text-muted-foreground sm:hidden">{u.email}</p>
                    </div>
                    {u.is_service_account && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">Service</Badge>
                    )}
                  </div>
                </td>
                <td className="p-3 text-muted-foreground hidden sm:table-cell">{u.email}</td>
                <td className="p-3">
                  {u.is_service_account ? (
                    roleBadge(u.role)
                  ) : u.id === currentUser?.id ? (
                    roleBadge(u.role)
                  ) : (
                    <select
                      value={u.role}
                      onChange={(e) => updateRole.mutate({ id: u.id, role: e.target.value })}
                      className={cn(
                        'rounded-md border border-border bg-transparent px-2 py-1 text-xs font-medium cursor-pointer',
                        u.role === 'admin' && 'text-red-600 dark:text-red-400',
                        u.role === 'editor' && 'text-foreground',
                        u.role === 'viewer' && 'text-muted-foreground',
                      )}
                    >
                      {roleOptions.map((r) => (
                        <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="p-3 hidden md:table-cell">
                  {u.is_active
                    ? <Badge variant="secondary" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">Active</Badge>
                    : <Badge variant="outline" className="text-muted-foreground">Disabled</Badge>
                  }
                </td>
                <td className="p-3">
                  <div className="flex justify-center gap-1">
                    {!u.is_service_account && u.id !== currentUser?.id && (
                      <>
                        <button
                          onClick={() => toggleActive.mutate({ id: u.id, is_active: !u.is_active })}
                          className="p-1.5 rounded-md hover:bg-muted transition-colors"
                          title={u.is_active ? 'Disable' : 'Enable'}
                        >
                          {u.is_active ? <UserX className="w-4 h-4 text-muted-foreground" /> : <UserCheck className="w-4 h-4 text-green-600" />}
                        </button>
                        <button
                          onClick={() => setResetTarget({ id: u.id, name: u.display_name })}
                          className="p-1.5 rounded-md hover:bg-muted transition-colors"
                          title="Reset password"
                        >
                          <KeyRound className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ id: u.id, name: u.display_name })}
                          className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center print:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-background rounded-xl border border-border shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Add User</h2>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Name</label>
                <Input value={newUser.display_name} onChange={e => setNewUser(f => ({ ...f, display_name: e.target.value }))} placeholder="Jane Porter" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Email</label>
                <Input type="email" value={newUser.email} onChange={e => setNewUser(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Password</label>
                <Input type="password" value={newUser.password} onChange={e => setNewUser(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={e => setNewUser(f => ({ ...f, role: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {roleOptions.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button
                  size="sm"
                  onClick={() => createUser.mutate()}
                  disabled={createUser.isPending}
                >
                  {createUser.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center print:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-background rounded-xl border border-border shadow-2xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-semibold mb-3">Delete User</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Are you sure you want to delete <strong>"{deleteConfirm.name}"</strong>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={() => deleteUser.mutate(deleteConfirm.id)}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Confirmation */}
      {resetTarget && !resetResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center print:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setResetTarget(null)} />
          <div className="relative bg-background rounded-xl border border-border shadow-2xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-semibold mb-3">Reset Password</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Reset password for <strong>"{resetTarget.name}"</strong>? They will need to use a temporary password to log in.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setResetTarget(null)}>Cancel</Button>
              <Button
                size="sm"
                onClick={() => {
                  resetPassword.mutate(resetTarget.id)
                  setResetTarget(null)
                }}
                disabled={resetPassword.isPending}
              >
                {resetPassword.isPending ? 'Resetting...' : 'Reset'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Result */}
      {resetResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center print:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setResetResult(null)} />
          <div className="relative bg-background rounded-xl border border-border shadow-2xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-semibold mb-3">Password Reset</h2>
            <p className="text-sm text-muted-foreground mb-3">Temporary password:</p>
            <div className="rounded-lg bg-muted px-3 py-2 font-mono text-sm text-center select-all mb-4">
              {resetResult}
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">
              Share this with the user. They must change it on next login.
            </p>
            <Button size="sm" className="w-full" onClick={() => { navigator.clipboard.writeText(resetResult); toast({ title: 'Copied to clipboard', variant: 'success' }) }}>
              Copy to Clipboard
            </Button>
            <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setResetResult(null)}>
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
