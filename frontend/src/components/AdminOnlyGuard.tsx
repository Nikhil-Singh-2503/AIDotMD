import { useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function AdminOnlyGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && user && user.role !== 'admin') {
      navigate('/admin', { replace: true })
    }
  }, [user, isLoading, navigate])

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground animate-pulse">Loading...</p></div>
  }

  if (!user || user.role !== 'admin') return null

  return <>{children}</>
}
