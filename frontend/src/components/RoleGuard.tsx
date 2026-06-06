import { useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

const ROLE_HIERARCHY: Record<string, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
}

export function RoleGuard({ children, minRole = 'editor' }: { children: ReactNode; minRole?: string }) {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()

  const userLevel = user ? ROLE_HIERARCHY[user.role] ?? 0 : 0
  const requiredLevel = ROLE_HIERARCHY[minRole] ?? 1

  useEffect(() => {
    if (!isLoading && user && userLevel < requiredLevel) {
      navigate('/admin', { replace: true })
    }
  }, [user, isLoading, userLevel, requiredLevel, navigate])

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground animate-pulse">Loading...</p></div>
  }

  if (!user || userLevel < requiredLevel) return null

  return <>{children}</>
}
