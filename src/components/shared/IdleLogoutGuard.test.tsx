import { act } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { queryClient } from '@/lib/queryClient'
import { IdleLogoutGuard, IDLE_TIMEOUT_MS, IDLE_WARNING_LEAD_MS } from './IdleLogoutGuard'

const toastWarning = vi.fn()

vi.mock('sonner', () => ({
  toast: { warning: (message: string) => toastWarning(message), success: vi.fn(), error: vi.fn() },
}))

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<IdleLogoutGuard />} />
        <Route path="/login" element={<div>Login Page Marker</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })
const fireActivity = (type: string) => act(() => { window.dispatchEvent(new Event(type)) })

describe('IdleLogoutGuard — agent-only 30-minute inactivity timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    toastWarning.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does nothing for an ADMIN — no warning, no logout, even well past 30 minutes idle', () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'admin-1', name: 'Admin One', email: 'admin@test.com', role: 'ADMIN',
    })
    renderGuard()

    advance(IDLE_TIMEOUT_MS + IDLE_WARNING_LEAD_MS + 60_000)

    expect(screen.queryByText('Still there?')).not.toBeInTheDocument()
    expect(screen.queryByText('Login Page Marker')).not.toBeInTheDocument()
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('shows a warning countdown before the deadline, then logs an idle AGENT out at 30 minutes', () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'agent@test.com', role: 'AGENT',
    })
    renderGuard()

    advance(IDLE_TIMEOUT_MS - IDLE_WARNING_LEAD_MS)
    expect(screen.getByText('Still there?')).toBeInTheDocument()
    expect(screen.getByText(/60s/)).toBeInTheDocument()
    expect(useAuthStore.getState().isAuthenticated).toBe(true)

    advance(IDLE_WARNING_LEAD_MS)

    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(screen.getByText('Login Page Marker')).toBeInTheDocument()
    expect(toastWarning).toHaveBeenCalledWith('You were logged out due to inactivity. Please log in again.')
  })

  it('clears the tanstack query cache on idle logout', () => {
    const clearSpy = vi.spyOn(queryClient, 'clear')
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'agent@test.com', role: 'AGENT',
    })
    renderGuard()

    advance(IDLE_TIMEOUT_MS)

    expect(clearSpy).toHaveBeenCalled()
    clearSpy.mockRestore()
  })

  it('activity before the deadline resets the clock and prevents logout at the original deadline', () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'agent@test.com', role: 'AGENT',
    })
    renderGuard()

    advance(20 * 60 * 1000)
    fireActivity('keydown')
    // 25 more minutes — only 25 min since the reset, so still under the 30-min limit even
    // though 45 min have passed since the component first mounted.
    advance(25 * 60 * 1000)
    expect(useAuthStore.getState().isAuthenticated).toBe(true)

    advance(5 * 60 * 1000 + 1000)
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('activity while the warning is showing dismisses it without logging out', () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'agent@test.com', role: 'AGENT',
    })
    renderGuard()

    advance(IDLE_TIMEOUT_MS - IDLE_WARNING_LEAD_MS)
    expect(screen.getByText('Still there?')).toBeInTheDocument()

    fireActivity('mousemove')
    expect(screen.queryByText('Still there?')).not.toBeInTheDocument()

    // Advancing right up to (but not past) the original deadline should not log out —
    // the clock was reset by the mousemove above.
    advance(IDLE_TIMEOUT_MS - 1000)
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('clicking "Stay Logged In" resets the clock and hides the warning', () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'agent@test.com', role: 'AGENT',
    })
    renderGuard()

    advance(IDLE_TIMEOUT_MS - IDLE_WARNING_LEAD_MS)
    expect(screen.getByText('Still there?')).toBeInTheDocument()

    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Stay Logged In' })) })
    expect(screen.queryByText('Still there?')).not.toBeInTheDocument()

    advance(IDLE_TIMEOUT_MS - 1000)
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('rapid repeated activity within the throttle window only resets the clock once', () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'agent@test.com', role: 'AGENT',
    })
    renderGuard()

    advance(10 * 60 * 1000)
    // A burst of mousemove events within the 5s throttle window — should count as one reset,
    // not extend the clock past what a single reset at this moment would give.
    fireActivity('mousemove')
    advance(1000)
    fireActivity('mousemove')
    advance(1000)
    fireActivity('mousemove')

    // ~29 minutes after the last effective reset (10 min mark) — should still be logged in.
    advance(IDLE_TIMEOUT_MS - 60_000)
    expect(useAuthStore.getState().isAuthenticated).toBe(true)

    advance(60_000 + 1000)
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })
})
