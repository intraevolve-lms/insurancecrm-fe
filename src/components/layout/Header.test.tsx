import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Header } from './Header'

vi.mock('@/api/reminders', () => ({
  remindersApi: { getAll: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: [] })) },
}))

function renderHeader(initialPath: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Header />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Header — page title by route', () => {
  it('shows "New Lead" on /new-customers, not "New Customers"', () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
    renderHeader('/new-customers')

    expect(screen.getByRole('heading', { name: 'New Lead' })).toBeInTheDocument()
    expect(screen.queryByText('New Customers')).not.toBeInTheDocument()
  })

  it('shows "Dashboard" on /dashboard', () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
    renderHeader('/dashboard')

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })
})
