import { useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

const ALLOWED_ROLES = ['admin', 'editor']

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && user && !ALLOWED_ROLES.includes(user.role)) {
      navigate('/my-dashboard', { replace: true })
    }
  }, [user, isLoading, navigate])

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground animate-pulse">Loading...</p></div>
  }

  if (!user || !ALLOWED_ROLES.includes(user.role)) return null

  return <>{children}</>
}
