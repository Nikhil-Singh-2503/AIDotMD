import { useEffect, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { getShareToken } from '@/api/client'

export function DocsGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const hasShareToken = Boolean(getShareToken() || searchParams.get('share'))

  useEffect(() => {
    if (!isLoading && !user && !hasShareToken) {
      navigate('/login', { replace: true })
    }
  }, [user, isLoading, hasShareToken, navigate])

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground animate-pulse">Loading...</p></div>
  }

  if (!user && !hasShareToken) return null

  return <>{children}</>
}
