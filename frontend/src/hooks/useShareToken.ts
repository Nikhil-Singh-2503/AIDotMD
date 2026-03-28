import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { setShareToken } from '@/api/client'

/**
 * Extracts a `?share_token=` query param from the URL on first render,
 * stores it in the API client memory (so all subsequent write requests
 * include it as `X-Share-Token`), and removes it from the address bar.
 *
 * Call this once inside DocPage — it's a no-op if no token is present.
 */
export function useShareToken() {
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('share_token')
    if (token) {
      setShareToken(token)
      // Clean the token out of the URL bar so it doesn't leak in screenshots etc.
      const next = new URLSearchParams(searchParams)
      next.delete('share_token')
      setSearchParams(next, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
