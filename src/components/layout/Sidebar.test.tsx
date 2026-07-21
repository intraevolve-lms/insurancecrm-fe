import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { customersApi } from '@/api/customers'
import { Sidebar } from './Sidebar'

vi.mock('@/api/customers', () => ({
  customersApi: {
    getNew: vi.fn(() => Promise.resolve({
      success: true, message: 'ok', timestamp: '2026-01-01T00:00:00',
      data: { content: [], page: 0, size: 1, totalElements: 0, totalPages: 0 },
    })),
  },
}))

function renderSidebar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Sidebar — change password link is admin-only', () => {
  beforeEach(() => {
    vi.mocked(customersApi.getNew).mockClear()
  })

  it('shows "Change password" for an ADMIN', () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'admin-1', name: 'Admin One', email: 'admin@test.com', role: 'ADMIN',
    })

    renderSidebar()

    expect(screen.getByText('Change password')).toBeInTheDocument()
  })

  it('hides "Change password" for an AGENT — they must ask an admin instead', () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'agent@test.com', role: 'AGENT',
    })

    renderSidebar()

    expect(screen.queryByText('Change password')).not.toBeInTheDocument()
  })
})

describe('Sidebar — New Customers nav item and badge count', () => {
  beforeEach(() => {
    vi.mocked(customersApi.getNew).mockClear()
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'agent@test.com', role: 'AGENT',
    })
  })

  it('always shows the New Customers nav link', () => {
    renderSidebar()

    expect(screen.getByRole('link', { name: /new customers/i })).toBeInTheDocument()
  })

  it('shows no badge when there are zero new customers', async () => {
    renderSidebar()

    await waitFor(() => expect(customersApi.getNew).toHaveBeenCalled())
    const link = screen.getByRole('link', { name: /new customers/i })
    expect(link).toHaveTextContent('New Customers')
    expect(link.textContent).toBe('New Customers')
  })

  it('shows the count as a badge when there are new customers', async () => {
    vi.mocked(customersApi.getNew).mockResolvedValueOnce({
      success: true, message: 'ok', timestamp: '2026-01-01T00:00:00',
      data: { content: [], page: 0, size: 1, totalElements: 7, totalPages: 7 },
    })
    renderSidebar()

    await waitFor(() => expect(screen.getByRole('link', { name: /new customers/i })).toHaveTextContent('7'))
  })

  it('caps the badge display at "99+"', async () => {
    vi.mocked(customersApi.getNew).mockResolvedValueOnce({
      success: true, message: 'ok', timestamp: '2026-01-01T00:00:00',
      data: { content: [], page: 0, size: 1, totalElements: 150, totalPages: 150 },
    })
    renderSidebar()

    await waitFor(() => expect(screen.getByRole('link', { name: /new customers/i })).toHaveTextContent('99+'))
  })
})
