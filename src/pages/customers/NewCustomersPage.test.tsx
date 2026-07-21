import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { customersApi } from '@/api/customers'
import type { Customer } from '@/types/customer'
import NewCustomersPage from './NewCustomersPage'

const customers: Customer[] = [
  {
    id: 'c1', name: 'Fresh Import One', phone: '9111111111', email: 'one@test.com',
    assignedAgentId: 'agent-1', assignedAgentName: 'Agent One',
    createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00',
  },
  {
    id: 'c2', name: 'Fresh Import Two', phone: '9222222222',
    assignedAgentId: 'agent-1', assignedAgentName: 'Agent One',
    createdAt: '2026-01-02T00:00:00', updatedAt: '2026-01-02T00:00:00',
  },
]

function pageOf(list: Customer[], page = 0, size = 20) {
  return { content: list, page, size, totalElements: list.length, totalPages: Math.ceil(list.length / size) || 1 }
}

vi.mock('@/api/customers', () => ({
  customersApi: {
    getNew: vi.fn((params: { page?: number } = {}) =>
      Promise.resolve({ success: true, message: 'ok', timestamp: '2026-01-01T00:00:00', data: pageOf(customers, params.page ?? 0) })),
  },
}))

vi.mock('@/api/communications', () => ({
  communicationsApi: {
    getByCustomer: vi.fn(() => Promise.resolve({ success: true, message: 'ok', timestamp: '2026-01-01T00:00:00', data: [] })),
  },
}))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/new-customers']}>
        <Routes>
          <Route path="/new-customers" element={<NewCustomersPage />} />
          <Route path="/customers/:id" element={<div>Customer Detail Page Marker</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('NewCustomersPage — rendering and role scoping', () => {
  beforeEach(() => {
    vi.mocked(customersApi.getNew).mockClear()
  })

  it('renders each uncontacted customer with name, phone, and email', async () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
    renderPage()

    await waitFor(() => expect(screen.getByText('Fresh Import One')).toBeInTheDocument())
    expect(screen.getByText('one@test.com')).toBeInTheDocument()
    expect(screen.getByText('9222222222')).toBeInTheDocument()
  })

  it('an AGENT does not see an Assigned To column', async () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
    renderPage()

    await waitFor(() => expect(screen.getByText('Fresh Import One')).toBeInTheDocument())
    expect(screen.queryByRole('columnheader', { name: /assigned to/i })).not.toBeInTheDocument()
  })

  it('an ADMIN sees an Assigned To column with the agent name', async () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'admin-1', name: 'Admin One', email: 'admin@test.com', role: 'ADMIN',
    })
    renderPage()

    await waitFor(() => expect(screen.getByText('Fresh Import One')).toBeInTheDocument())
    expect(screen.getByRole('columnheader', { name: /assigned to/i })).toBeInTheDocument()
    expect(screen.getAllByText('Agent One').length).toBeGreaterThan(0)
  })

  it('shows the empty state when there are no new customers', async () => {
    vi.mocked(customersApi.getNew).mockResolvedValueOnce({
      success: true, message: 'ok', timestamp: '2026-01-01T00:00:00', data: pageOf([]),
    })
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
    renderPage()

    await waitFor(() => expect(screen.getByText(/you're all caught up/i)).toBeInTheDocument())
  })
})

describe('NewCustomersPage — activity + navigation', () => {
  beforeEach(() => {
    vi.mocked(customersApi.getNew).mockClear()
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
  })

  it('clicking Activity expands the timeline for that row only', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => expect(screen.getByText('Fresh Import One')).toBeInTheDocument())
    const row = screen.getByText('Fresh Import One').closest('tr')!
    await user.click(within(row).getByRole('button', { name: /activity/i }))

    await waitFor(() => expect(screen.getByText(/no activity logged yet/i)).toBeInTheDocument())

    await user.click(within(row).getByRole('button', { name: /activity/i }))
    expect(screen.queryByText(/no activity logged yet/i)).not.toBeInTheDocument()
  })

  it('clicking View navigates to the customer detail page', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => expect(screen.getByText('Fresh Import One')).toBeInTheDocument())
    const row = screen.getByText('Fresh Import One').closest('tr')!
    await user.click(within(row).getByRole('button', { name: /view/i }))

    expect(screen.getByText('Customer Detail Page Marker')).toBeInTheDocument()
  })
})
