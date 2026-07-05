import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { Customer } from '@/types/customer'
import CustomersPage from './CustomersPage'

const customers: Customer[] = [
  {
    id: 'c1', name: 'Ringing Customer', phone: '9111111111',
    lastOutcome: 'RINGING', createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00',
  },
  {
    id: 'c2', name: 'Callback Customer', phone: '9222222222',
    lastOutcome: 'CALLBACK', createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00',
  },
  {
    id: 'c3', name: 'No Outcome Customer', phone: '9333333333',
    createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00',
  },
]

vi.mock('@/api/customers', () => ({
  customersApi: {
    getAll: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: customers })),
    search: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: customers })),
  },
}))

vi.mock('@/api/users', () => ({
  usersApi: { getAll: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: [] })) },
}))

vi.mock('@/api/export', () => ({
  exportApi: { exportCustomers: vi.fn(() => Promise.resolve()) },
}))

function renderWithProviders(initialEntry: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/customers" element={<CustomersPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CustomersPage outcome filtering', () => {
  beforeEach(() => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
  })

  it('shows every customer when there is no outcome filter in the URL', async () => {
    renderWithProviders('/customers')

    await waitFor(() => expect(screen.getByText('Ringing Customer')).toBeInTheDocument())
    expect(screen.getByText('Callback Customer')).toBeInTheDocument()
    expect(screen.getByText('No Outcome Customer')).toBeInTheDocument()
    expect(screen.queryByText(/Filtered by outcome/i)).not.toBeInTheDocument()
  })

  it('shows only customers matching ?outcome=RINGING, and shows the filter banner', async () => {
    renderWithProviders('/customers?outcome=RINGING')

    await waitFor(() => expect(screen.getByText('Ringing Customer')).toBeInTheDocument())
    expect(screen.queryByText('Callback Customer')).not.toBeInTheDocument()
    expect(screen.queryByText('No Outcome Customer')).not.toBeInTheDocument()
    expect(screen.getByText(/Filtered by outcome: Ringing/i)).toBeInTheDocument()
  })

  it('clearing the filter restores the full list', async () => {
    const user = userEvent.setup()
    renderWithProviders('/customers?outcome=CALLBACK')

    await waitFor(() => expect(screen.getByText('Callback Customer')).toBeInTheDocument())
    expect(screen.queryByText('Ringing Customer')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /clear/i }))

    await waitFor(() => expect(screen.getByText('Ringing Customer')).toBeInTheDocument())
    expect(screen.getByText('Callback Customer')).toBeInTheDocument()
    expect(screen.getByText('No Outcome Customer')).toBeInTheDocument()
  })

  it('an outcome with zero matching customers renders the empty state, not a crash', async () => {
    renderWithProviders('/customers?outcome=NEXT_YEAR')

    await waitFor(() => expect(screen.getByText(/no customers found/i)).toBeInTheDocument())
  })
})
