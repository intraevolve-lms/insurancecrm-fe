import { describe, expect, it } from 'vitest'
import { queryClient } from './queryClient'

describe('queryClient', () => {
  it('has a bounded staleTime rather than caching forever', () => {
    // Regression guard: an unbounded/very long staleTime is exactly what let stale
    // cross-session customer data linger after login/logout in the past.
    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(30_000)
  })

  it('does not refetch on window focus (avoids surprise refetch storms)', () => {
    expect(queryClient.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false)
  })

  it('clear() empties every cached query — the mechanism the login/logout flow relies on', () => {
    queryClient.setQueryData(['customers', 'user-1', ''], { data: ['stale-data-from-previous-session'] })
    expect(queryClient.getQueryData(['customers', 'user-1', ''])).toBeDefined()

    queryClient.clear()

    expect(queryClient.getQueryData(['customers', 'user-1', ''])).toBeUndefined()
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })
})
