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
    assignedAgentId: 'agent-1', assignedAgentName: 'Agent One', lastYearPremium: 12000,
    expiryDate: '2026-03-15', createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00',
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
    logForCustomer: vi.fn(() => Promise.resolve({
      success: true, message: 'ok', timestamp: '2026-01-01T00:00:00',
      data: { id: 'log-1', customerId: 'c1', channel: 'CALL', outcome: 'RINGING', loggedAt: '2026-01-01T00:00:00' },
    })),
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

describe('NewCustomersPage — rendering and role scoping (mirrors CustomersPage layout)', () => {
  beforeEach(() => {
    vi.mocked(customersApi.getNew).mockClear()
  })

  it('shows "New Lead" as the page heading, not "New Customers"', async () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
    renderPage()

    await waitFor(() => expect(screen.getByRole('heading', { name: 'New Lead' })).toBeInTheDocument())
    expect(screen.queryByText('New Customers')).not.toBeInTheDocument()
  })

  it('renders each uncontacted customer with name, email, expiry date, and created date', async () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
    renderPage()

    await waitFor(() => expect(screen.getByText('Fresh Import One')).toBeInTheDocument())
    expect(screen.getByText('one@test.com')).toBeInTheDocument()
    expect(screen.getByText('15 Mar 2026')).toBeInTheDocument()
    expect(screen.getAllByText('01 Jan 2026').length).toBeGreaterThan(0)
  })

  it('an AGENT sees Assigned To but not Phone or Premium', async () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
    renderPage()

    await waitFor(() => expect(screen.getByText('Fresh Import One')).toBeInTheDocument())
    expect(screen.getByRole('columnheader', { name: /assigned to/i })).toBeInTheDocument()
    expect(screen.getAllByText('Agent One').length).toBeGreaterThan(0)
    expect(screen.queryByRole('columnheader', { name: /^phone$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /premium/i })).not.toBeInTheDocument()
    expect(screen.queryByText('9111111111')).not.toBeInTheDocument()
  })

  it('an ADMIN additionally sees Phone and Premium columns', async () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'admin-1', name: 'Admin One', email: 'admin@test.com', role: 'ADMIN',
    })
    renderPage()

    await waitFor(() => expect(screen.getByText('Fresh Import One')).toBeInTheDocument())
    expect(screen.getByRole('columnheader', { name: /^phone$/i })).toBeInTheDocument()
    expect(screen.getByText('9111111111')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /premium/i })).toBeInTheDocument()
    expect(screen.getByText('₹12,000')).toBeInTheDocument()
  })

  it('shows "Unassigned" for a customer with no assigned agent (admin reviewing coverage gaps)', async () => {
    vi.mocked(customersApi.getNew).mockResolvedValueOnce({
      success: true, message: 'ok', timestamp: '2026-01-01T00:00:00',
      data: pageOf([{ id: 'c3', name: 'Untouched Unassigned', phone: '9333333333', createdAt: '2026-01-03T00:00:00', updatedAt: '2026-01-03T00:00:00' }]),
    })
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'admin-1', name: 'Admin One', email: 'admin@test.com', role: 'ADMIN',
    })
    renderPage()

    await waitFor(() => expect(screen.getByText('Untouched Unassigned')).toBeInTheDocument())
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
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

describe('NewCustomersPage — search', () => {
  beforeEach(() => {
    vi.mocked(customersApi.getNew).mockClear()
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
  })

  it('typing in the search box calls getNew with the query (debounced)', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => expect(screen.getByText('Fresh Import One')).toBeInTheDocument())
    await user.type(screen.getByPlaceholderText(/search by name or phone/i), 'Fresh')

    await waitFor(() => {
      const lastCall = vi.mocked(customersApi.getNew).mock.calls.at(-1)?.[0]
      expect(lastCall).toMatchObject({ q: 'Fresh' })
    }, { timeout: 2000 })
  })
})

describe('NewCustomersPage — sorting', () => {
  beforeEach(() => {
    vi.mocked(customersApi.getNew).mockClear()
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'admin-1', name: 'Admin One', email: 'admin@test.com', role: 'ADMIN',
    })
  })

  it('clicking the Expiry Date header sorts asc then desc', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => expect(screen.getByText('Fresh Import One')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /expiry date/i }))
    await waitFor(() => {
      const lastCall = vi.mocked(customersApi.getNew).mock.calls.at(-1)?.[0]
      expect(lastCall).toMatchObject({ sortBy: 'expiryDate', sortDir: 'asc' })
    })

    await user.click(screen.getByRole('button', { name: /expiry date/i }))
    await waitFor(() => {
      const lastCall = vi.mocked(customersApi.getNew).mock.calls.at(-1)?.[0]
      expect(lastCall).toMatchObject({ sortBy: 'expiryDate', sortDir: 'desc' })
    })
  })

  it('clicking the Premium header (ADMIN-only) sorts by premium', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => expect(screen.getByText('Fresh Import One')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /premium/i }))

    await waitFor(() => {
      const lastCall = vi.mocked(customersApi.getNew).mock.calls.at(-1)?.[0]
      expect(lastCall).toMatchObject({ sortBy: 'premium', sortDir: 'asc' })
    })
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

describe('NewCustomersPage — end to end: logging an outcome removes the customer live', () => {
  beforeEach(() => {
    vi.mocked(customersApi.getNew).mockClear()
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
  })

  it('the customer disappears from the list on refetch after Log Activity is saved, no manual refresh', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => expect(screen.getByText('Fresh Import One')).toBeInTheDocument())
    expect(screen.getByText('Fresh Import Two')).toBeInTheDocument()

    // Mirrors the real backend: once logForCustomer sets lastOutcome, the customer no longer
    // matches lastOutcome=null, so the next getNew fetch (triggered by cache invalidation) omits it.
    vi.mocked(customersApi.getNew).mockResolvedValueOnce({
      success: true, message: 'ok', timestamp: '2026-01-01T00:00:00',
      data: pageOf([customers[1]]),
    })

    const row = screen.getByText('Fresh Import One').closest('tr')!
    await user.click(within(row).getByRole('button', { name: /activity/i }))
    await waitFor(() => expect(screen.getByText(/no activity logged yet/i)).toBeInTheDocument())

    await user.click(screen.getAllByRole('button', { name: /log activity/i })[0])
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(screen.queryByText('Fresh Import One')).not.toBeInTheDocument())
    expect(screen.getByText('Fresh Import Two')).toBeInTheDocument()
  })
})
