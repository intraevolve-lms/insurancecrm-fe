import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from './authStore'

const loginData = {
  token: 'access-token-1',
  refreshToken: 'refresh-token-1',
  userId: 'user-1',
  name: 'Agent One',
  email: 'agent@test.com',
  role: 'AGENT' as const,
}

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().logout()
  })

  it('starts in a logged-out state', () => {
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.token).toBeNull()
    expect(state.userId).toBeNull()
  })

  it('login populates all user/session fields and flips isAuthenticated', () => {
    useAuthStore.getState().login(loginData)
    const state = useAuthStore.getState()

    expect(state.isAuthenticated).toBe(true)
    expect(state.token).toBe('access-token-1')
    expect(state.refreshToken).toBe('refresh-token-1')
    expect(state.userId).toBe('user-1')
    expect(state.name).toBe('Agent One')
    expect(state.email).toBe('agent@test.com')
    expect(state.role).toBe('AGENT')
  })

  it('logout clears every field back to null and isAuthenticated to false', () => {
    useAuthStore.getState().login(loginData);
    useAuthStore.getState().logout()
    const state = useAuthStore.getState()

    expect(state.isAuthenticated).toBe(false)
    expect(state.token).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.userId).toBeNull()
    expect(state.name).toBeNull()
    expect(state.email).toBeNull()
    expect(state.role).toBeNull()
  })

  it('setTokens updates only the token pair, leaving user identity untouched', () => {
    useAuthStore.getState().login(loginData)
    useAuthStore.getState().setTokens({ token: 'new-access-token', refreshToken: 'new-refresh-token' })
    const state = useAuthStore.getState()

    expect(state.token).toBe('new-access-token')
    expect(state.refreshToken).toBe('new-refresh-token')
    // Identity fields must survive a token refresh
    expect(state.userId).toBe('user-1')
    expect(state.name).toBe('Agent One')
    expect(state.isAuthenticated).toBe(true)
  })

  it('a second login (switching accounts) fully overwrites the previous session', () => {
    useAuthStore.getState().login(loginData)
    useAuthStore.getState().login({
      token: 'admin-token', refreshToken: 'admin-refresh', userId: 'admin-1',
      name: 'Admin', email: 'admin@test.com', role: 'ADMIN',
    })
    const state = useAuthStore.getState()

    expect(state.userId).toBe('admin-1')
    expect(state.role).toBe('ADMIN')
    expect(state.token).toBe('admin-token')
  })
})
