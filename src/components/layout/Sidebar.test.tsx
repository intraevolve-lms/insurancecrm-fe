import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { Sidebar } from './Sidebar'

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

describe('Sidebar — nav items', () => {
  it('does not show a New Customers nav link — that queue is surfaced as a Dashboard tile instead', () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'agent@test.com', role: 'AGENT',
    })
    renderSidebar()

    expect(screen.queryByRole('link', { name: /new customers/i })).not.toBeInTheDocument()
  })

  it('does not show a standalone Customers nav link — the full list is reachable via the Dashboard\'s Total Customers tile', () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'agent@test.com', role: 'AGENT',
    })
    renderSidebar()

    expect(screen.queryByRole('link', { name: /^customers$/i })).not.toBeInTheDocument()
  })
})
