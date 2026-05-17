import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { setShareToken } from '@/api/client'

/**
 * Extracts a `?share=` query param from the URL on first render,
 * stores it in the API client memory, and cleans it from the address bar.
 */
export function useShareToken() {
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('share')
    if (token) {
      setShareToken(token)
      const next = new URLSearchParams(searchParams)
      next.delete('share')
      setSearchParams(next, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
