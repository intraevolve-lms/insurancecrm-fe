import { beforeEach, describe, expect, it, vi } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import api from './axios'
import { useAuthStore } from '@/store/authStore'
import { queryClient } from '@/lib/queryClient'

const toastWarning = vi.fn()

vi.mock('sonner', () => ({
  toast: { warning: (message: string) => toastWarning(message), success: vi.fn(), error: vi.fn() },
}))

const mock = new MockAdapter(api)

function setLoggedIn(token = 'valid-access-token', refreshToken = 'valid-refresh-token') {
  useAuthStore.getState().login({
    token, refreshToken, userId: 'user-1', name: 'Agent One', email: 'agent@test.com', role: 'AGENT',
  })
}

describe('axios interceptors', () => {
  beforeEach(() => {
    mock.reset()
    useAuthStore.getState().logout()
    queryClient.clear()
    toastWarning.mockClear()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, href: '' },
    })
  })

  it('request interceptor attaches the current auth token as a Bearer header', async () => {
    setLoggedIn('my-token')
    mock.onGet('/customers').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer my-token')
      return [200, { data: [] }]
    })

    await api.get('/customers')
  })

  it('request interceptor sends no Authorization header when logged out', async () => {
    mock.onGet('/customers').reply((config) => {
      expect(config.headers?.Authorization).toBeUndefined()
      return [200, { data: [] }]
    })

    await api.get('/customers')
  })

  it('401 on a normal endpoint triggers a silent refresh and retries the original request', async () => {
    setLoggedIn('expired-token', 'good-refresh-token')

    mock.onGet('/customers').replyOnce(401)
    mock.onPost('/auth/refresh').replyOnce(200, {
      data: { token: 'new-access-token', refreshToken: 'new-refresh-token' },
    })
    mock.onGet('/customers').replyOnce(200, { data: ['ok'] })

    const response = await api.get('/customers')

    expect(response.status).toBe(200)
    expect(response.data.data).toEqual(['ok'])
    expect(useAuthStore.getState().token).toBe('new-access-token')
    expect(useAuthStore.getState().refreshToken).toBe('new-refresh-token')
  })

  it('retried request carries the newly refreshed token, not the stale one', async () => {
    setLoggedIn('expired-token', 'good-refresh-token')

    mock.onGet('/customers').replyOnce(401);
    mock.onPost('/auth/refresh').replyOnce(200, {
      data: { token: 'brand-new-token', refreshToken: 'brand-new-refresh' },
    })
    mock.onGet('/customers').replyOnce((config) => {
      expect(config.headers?.Authorization).toBe('Bearer brand-new-token')
      return [200, { data: [] }]
    })

    await api.get('/customers')
  })

  it('refresh failure logs the user out and clears the query cache', async () => {
    setLoggedIn('expired-token', 'bad-refresh-token')

    mock.onGet('/customers').reply(401)
    mock.onPost('/auth/refresh').reply(403)

    const clearSpy = vi.spyOn(queryClient, 'clear')

    await expect(api.get('/customers')).rejects.toBeTruthy()

    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().token).toBeNull()
    expect(clearSpy).toHaveBeenCalled()
    expect(window.location.href).toBe('/login')
  })

  it('surfaces the backend\'s inactivity-timeout message when the refresh call is rejected for it', async () => {
    // Mirrors AuthService.refresh on the backend: an agent idle past the server-side timeout
    // gets a 403 on /auth/refresh with this exact message.
    setLoggedIn('expired-token', 'idle-refresh-token')

    mock.onGet('/customers').reply(401)
    mock.onPost('/auth/refresh').reply(403, {
      success: false, message: 'Your session expired due to inactivity — please log in again',
    })

    await expect(api.get('/customers')).rejects.toBeTruthy()

    expect(toastWarning).toHaveBeenCalledWith('Your session expired due to inactivity — please log in again')
  })

  it('surfaces the backend\'s admin-force-logout message when the refresh call is rejected for it', async () => {
    setLoggedIn('expired-token', 'revoked-refresh-token')

    mock.onGet('/customers').reply(401)
    mock.onPost('/auth/refresh').reply(403, {
      success: false, message: 'Your session was ended by an administrator — please log in again',
    })

    await expect(api.get('/customers')).rejects.toBeTruthy()

    expect(toastWarning).toHaveBeenCalledWith('Your session was ended by an administrator — please log in again')
  })

  it('does not show a toast when the refresh call fails with no message body', async () => {
    setLoggedIn('expired-token', 'bad-refresh-token')

    mock.onGet('/customers').reply(401)
    mock.onPost('/auth/refresh').reply(403)

    await expect(api.get('/customers')).rejects.toBeTruthy()

    expect(toastWarning).not.toHaveBeenCalled()
  })

  it('a 401 from /auth/login itself does not trigger the refresh/logout flow', async () => {
    setLoggedIn()
    mock.onPost('/auth/login').reply(401, { message: 'Invalid email or password' })

    await expect(api.post('/auth/login', {})).rejects.toBeTruthy()

    // Login failures are the caller's problem — must not wipe an unrelated active session
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(mock.history.post.filter((r) => r.url === '/auth/refresh')).toHaveLength(0)
  })

  it('concurrent 401s from multiple in-flight requests share a single refresh call', async () => {
    setLoggedIn('expired-token', 'good-refresh-token')

    mock.onGet('/customers').replyOnce(401)
    mock.onGet('/leads').replyOnce(401)
    mock.onPost('/auth/refresh').replyOnce(200, {
      data: { token: 'new-token', refreshToken: 'new-refresh' },
    })
    mock.onGet('/customers').replyOnce(200, { data: [] })
    mock.onGet('/leads').replyOnce(200, { data: [] })

    await Promise.all([api.get('/customers'), api.get('/leads')])

    expect(mock.history.post.filter((r) => r.url === '/auth/refresh')).toHaveLength(1)
  })

  it('does not retry a request more than once (no infinite loop if refresh succeeds but the retry also 401s)', async () => {
    setLoggedIn('expired-token', 'good-refresh-token')

    mock.onPost('/auth/refresh').reply(200, { data: { token: 'still-bad', refreshToken: 'still-bad-refresh' } })
    mock.onGet('/customers').reply(401)

    await expect(api.get('/customers')).rejects.toBeTruthy()

    // Exactly one retry attempt: the original call + one retried call, not an unbounded loop
    expect(mock.history.get.filter((r) => r.url === '/customers')).toHaveLength(2)
  })
})
