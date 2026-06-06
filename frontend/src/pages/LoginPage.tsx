import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetMode, setResetMode] = useState<'idle' | 'resetting' | 'done'>('idle')
  const [resetPassword, setResetPassword] = useState('')

  const { data: meta } = useQuery({
    queryKey: ['meta'],
    queryFn: async () => {
      const res = await fetch('/api/v1/meta')
      if (!res.ok) return { is_local_access: false }
      return res.json()
    },
    staleTime: Infinity,
  })

  const isLocal = meta?.is_local_access ?? false

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/admin')
    } catch (err: any) {
      setError(err.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    setResetMode('resetting')
    try {
      const res = await fetch('/api/v1/auth/reset-admin', { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Reset failed' }))
        setError(err.detail || 'Reset failed')
        setResetMode('idle')
        return
      }
      const data = await res.json()
      setResetPassword(data.temp_password)
      setEmail(data.email)
      setResetMode('done')
    } catch {
      setError('Failed to reset password. Are you on localhost?')
      setResetMode('idle')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 font-semibold text-lg hover:opacity-80">
            <BookOpen className="h-6 w-6" />
            <span>AIDotMD</span>
          </Link>
          <p className="text-sm text-muted-foreground">
            {resetMode === 'done' ? 'Your new password is ready' : 'Sign in to your account'}
          </p>
        </div>

        {resetMode === 'done' ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 p-4 text-sm text-green-800 dark:text-green-200">
              <p className="font-medium mb-2">Password reset successful</p>
              <p className="text-xs mb-3">Use this temporary password to sign in:</p>
              <div className="rounded bg-white dark:bg-green-900 px-3 py-2 font-mono text-sm text-center select-all border border-green-300 dark:border-green-700">
                {resetPassword}
              </div>
              <p className="text-xs mt-3 text-green-700 dark:text-green-300">
                Change it after signing in via Settings → Change Password.
              </p>
            </div>
            <Button className="w-full" onClick={() => { setResetMode('idle'); setResetPassword('') }}>
              Back to Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Email</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@aidotmd.local"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Password</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-lg px-3 py-2 border border-red-200 dark:border-red-800">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>

            {isLocal && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={resetMode === 'resetting'}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                >
                  {resetMode === 'resetting' ? 'Resetting...' : 'Forgot password? Reset on localhost'}
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
