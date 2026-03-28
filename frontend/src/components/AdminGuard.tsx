import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, getShareToken } from '@/api/client'

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ['meta'],
    queryFn: api.meta.get,
    staleTime: Infinity,
  })

  if (isLoading) return null

  const canAccess = data?.is_local_access || Boolean(getShareToken())
  if (!canAccess) return <Navigate to="/" replace />

  return <>{children}</>
}
