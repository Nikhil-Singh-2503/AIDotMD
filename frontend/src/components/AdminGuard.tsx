import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { api, getShareToken } from '@/api/client'

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['meta'],
    queryFn: api.meta.get,
    staleTime: Infinity,
  })

  if (isLoading) return null

  // Authenticated users always have access
  if (user) return <>{children}</>

  // Fallback to localhost / share token for backward compat
  const canAccess = data?.is_local_access || Boolean(getShareToken())
  if (!canAccess) return <Navigate to="/login" replace />

  return <>{children}</>
}
