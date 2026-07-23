import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { customersApi } from '@/api/customers'
import { exportApi } from '@/api/export'
import type { Customer } from '@/types/customer'
import CustomersPage from './CustomersPage'

const customers: Customer[] = [
  {
    id: 'c1', name: 'Ringing Customer', phone: '9111111111',
    lastOutcome: 'RINGING', createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00',
    expiryDate: '2026-03-15',
  },
  {
    id: 'c2', name: 'Callback Customer', phone: '9222222222',
    lastOutcome: 'CALLBACK', createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00',
  },
  {
    id: 'c3', name: 'No Outcome Customer', phone: '9333333333',
    createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00',
  },
  {
    id: 'c4', name: 'Smiths Customer', phone: '9444444444',
    assignedAgentId: 'a1', assignedAgentName: 'Agent Smith',
    createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00',
  },
]

function pageOf(list: Customer[]) {
  return { content: list, page: 0, size: 20, totalElements: list.length, totalPages: 1 }
}

function applyFilters(list: Customer[], params: { outcome?: string; assignedAgentId?: string }) {
  let filtered = list
  if (params.outcome) filtered = filtered.filter((c) => c.lastOutcome === params.outcome)
  if (params.assignedAgentId) filtered = filtered.filter((c) => c.assignedAgentId === params.assignedAgentId)
  return filtered
}

vi.mock('@/api/customers', () => ({
  customersApi: {
    getAll: vi.fn((params: { outcome?: string; assignedAgentId?: string } = {}) =>
      Promise.resolve({ success: true, message: 'ok', data: pageOf(applyFilters(customers, params)) })),
    search: vi.fn((_q: string, params: { outcome?: string; assignedAgentId?: string } = {}) =>
      Promise.resolve({ success: true, message: 'ok', data: pageOf(applyFilters(customers, params)) })),
    create: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: customers[0] })),
    update: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: customers[0] })),
    delete: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: undefined })),
    assignAgent: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: customers[0] })),
    bulkDelete: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: { deletedCount: 1, notFoundIds: [] } })),
  },
}))

const agents = [{ id: 'a1', name: 'Agent Smith', email: 'smith@test.com', role: 'AGENT', active: true, createdAt: '2026-01-01T00:00:00' }]

vi.mock('@/api/users', () => ({
  usersApi: { getAll: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: agents })) },
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

describe('CustomersPage — bulk Excel/CSV import and export are admin-only', () => {
  it('an AGENT does not see the Import or Export buttons', async () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
    renderWithProviders('/customers')

    await waitFor(() => expect(screen.getByText('Ringing Customer')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Import' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Export' })).not.toBeInTheDocument()
    expect(screen.queryByTitle(/filter by agent/i)).not.toBeInTheDocument()
  })

  it('an ADMIN sees the Import and Export buttons', async () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'admin-1', name: 'Admin One', email: 'admin@test.com', role: 'ADMIN',
    })
    renderWithProviders('/customers')

    await waitFor(() => expect(screen.getByText('Ringing Customer')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument()
    expect(screen.getByTitle(/filter by agent/i)).toBeInTheDocument()
  })
})

describe('CustomersPage — agent filter dropdown also filters the visible table', () => {
  beforeEach(() => {
    vi.mocked(customersApi.getAll).mockClear()
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'admin-1', name: 'Admin One', email: 'admin@test.com', role: 'ADMIN',
    })
  })

  it('selecting an agent shows only that agent\'s customers', async () => {
    const user = userEvent.setup()
    renderWithProviders('/customers')

    await waitFor(() => expect(screen.getByText('Ringing Customer')).toBeInTheDocument())
    expect(screen.getByText('Smiths Customer')).toBeInTheDocument()

    await user.selectOptions(screen.getByTitle(/filter by agent/i), 'a1')

    await waitFor(() => expect(screen.queryByText('Ringing Customer')).not.toBeInTheDocument())
    expect(screen.getByText('Smiths Customer')).toBeInTheDocument()
  })

  it('the selected agent is also used to scope Export', async () => {
    const user = userEvent.setup()
    renderWithProviders('/customers')

    await waitFor(() => expect(screen.getByText('Ringing Customer')).toBeInTheDocument())
    await user.selectOptions(screen.getByTitle(/filter by agent/i), 'a1')
    await user.click(screen.getByRole('button', { name: 'Export' }))

    await waitFor(() => expect(exportApi.exportCustomers).toHaveBeenCalledWith('a1'))
  })

  it('resetting back to "All Agents" restores the full list', async () => {
    const user = userEvent.setup()
    renderWithProviders('/customers')

    await waitFor(() => expect(screen.getByText('Ringing Customer')).toBeInTheDocument())
    const select = screen.getByTitle(/filter by agent/i)
    await user.selectOptions(select, 'a1')
    await waitFor(() => expect(screen.queryByText('Ringing Customer')).not.toBeInTheDocument())

    await user.selectOptions(select, '')

    await waitFor(() => expect(screen.getByText('Ringing Customer')).toBeInTheDocument())
    expect(screen.getByText('Smiths Customer')).toBeInTheDocument()
  })
})

describe('CustomersPage — Expiry Date column is visible and sortable for every role', () => {
  beforeEach(() => {
    vi.mocked(customersApi.getAll).mockClear()
  })

  it('an AGENT sees the Expiry Date column and its values, but not Premium', async () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
    renderWithProviders('/customers')

    await waitFor(() => expect(screen.getByText('Ringing Customer')).toBeInTheDocument())
    expect(screen.getByRole('columnheader', { name: /expiry date/i })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /premium/i })).not.toBeInTheDocument()
    expect(screen.getByText('15 Mar 2026')).toBeInTheDocument()
  })

  it('an ADMIN sees both Expiry Date and Premium columns', async () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'admin-1', name: 'Admin One', email: 'admin@test.com', role: 'ADMIN',
    })
    renderWithProviders('/customers')

    await waitFor(() => expect(screen.getByText('Ringing Customer')).toBeInTheDocument())
    expect(screen.getByRole('columnheader', { name: /expiry date/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /premium/i })).toBeInTheDocument()
  })

  it('an AGENT can sort by Expiry Date — first click asc, second click desc', async () => {
    const user = userEvent.setup()
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
    renderWithProviders('/customers')

    await waitFor(() => expect(screen.getByText('Ringing Customer')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /expiry date/i }))
    await waitFor(() => {
      const lastCall = vi.mocked(customersApi.getAll).mock.calls.at(-1)?.[0]
      expect(lastCall).toMatchObject({ sortBy: 'expiryDate', sortDir: 'asc' })
    })

    await user.click(screen.getByRole('button', { name: /expiry date/i }))
    await waitFor(() => {
      const lastCall = vi.mocked(customersApi.getAll).mock.calls.at(-1)?.[0]
      expect(lastCall).toMatchObject({ sortBy: 'expiryDate', sortDir: 'desc' })
    })
  })
})

describe('CustomersPage — search', () => {
  beforeEach(() => {
    vi.mocked(customersApi.getAll).mockClear()
    vi.mocked(customersApi.search).mockClear()
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
  })

  it('typing in the search box calls search (debounced) instead of getAll, with the query', async () => {
    const user = userEvent.setup()
    renderWithProviders('/customers')

    await waitFor(() => expect(screen.getByText('Ringing Customer')).toBeInTheDocument())
    await user.type(screen.getByPlaceholderText(/search by name or phone/i), 'Ringing')

    await waitFor(() => expect(customersApi.search).toHaveBeenCalledWith('Ringing', expect.anything()), { timeout: 2000 })
  })
})

describe('CustomersPage — create customer (available to every role)', () => {
  beforeEach(() => {
    vi.mocked(customersApi.create).mockClear()
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
  })

  it('submitting the create form with name and phone calls create and closes the dialog', async () => {
    const user = userEvent.setup()
    renderWithProviders('/customers')

    await waitFor(() => expect(screen.getByText('Ringing Customer')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /create customer/i }))

    await user.type(screen.getByPlaceholderText('Full name'), 'Brand New Customer')
    await user.type(screen.getByPlaceholderText('+91 XXXXX XXXXX'), '9555555555')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(customersApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Brand New Customer', phone: '9555555555' }),
    ))
    await waitFor(() => expect(screen.queryByPlaceholderText('Full name')).not.toBeInTheDocument())
  })

  it('submitting without name or phone does not call create', async () => {
    const user = userEvent.setup()
    renderWithProviders('/customers')

    await waitFor(() => expect(screen.getByText('Ringing Customer')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /create customer/i }))
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(customersApi.create).not.toHaveBeenCalled()
  })
})

describe('CustomersPage — ADMIN-only CRUD actions', () => {
  beforeEach(() => {
    vi.mocked(customersApi.update).mockClear()
    vi.mocked(customersApi.delete).mockClear()
    vi.mocked(customersApi.assignAgent).mockClear()
    vi.mocked(customersApi.bulkDelete).mockClear()
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'admin-1', name: 'Admin One', email: 'admin@test.com', role: 'ADMIN',
    })
  })

  it('editing a customer pre-fills the form and calls update with the customer id', async () => {
    const user = userEvent.setup()
    renderWithProviders('/customers')

    await waitFor(() => expect(screen.getByText('Ringing Customer')).toBeInTheDocument())
    const row = screen.getByText('Ringing Customer').closest('tr')!
    await user.click(within(row).getByRole('button', { name: 'Edit' }))

    expect(screen.getByDisplayValue('Ringing Customer')).toBeInTheDocument()
    const nameInput = screen.getByDisplayValue('Ringing Customer')
    await user.clear(nameInput)
    await user.type(nameInput, 'Renamed Customer')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(customersApi.update).toHaveBeenCalledWith(
      'c1', expect.objectContaining({ name: 'Renamed Customer' }),
    ))
  })

  it('deleting a customer opens a confirm dialog, and confirming calls delete', async () => {
    const user = userEvent.setup()
    renderWithProviders('/customers')

    await waitFor(() => expect(screen.getByText('Ringing Customer')).toBeInTheDocument())
    const row = screen.getByText('Ringing Customer').closest('tr')!
    const deleteButton = within(row).getAllByRole('button').find((b) => !b.textContent?.trim())!
    await user.click(deleteButton)

    expect(screen.getByText(/are you sure you want to delete "Ringing Customer"/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(customersApi.delete).toHaveBeenCalledWith('c1'))
  })

  it('assigning an unassigned customer to an agent calls assignAgent', async () => {
    const user = userEvent.setup()
    renderWithProviders('/customers')

    await waitFor(() => expect(screen.getByText('Ringing Customer')).toBeInTheDocument())
    const row = screen.getByText('Ringing Customer').closest('tr')!
    await user.click(within(row).getByRole('button', { name: /assign agent/i }))

    await user.selectOptions(screen.getByRole('combobox'), 'a1')
    await user.click(screen.getByRole('button', { name: 'Assign' }))

    await waitFor(() => expect(customersApi.assignAgent).toHaveBeenCalledWith('c1', 'a1'))
  })

  it('selecting rows and bulk-deleting calls bulkDelete with the selected ids', async () => {
    const user = userEvent.setup()
    renderWithProviders('/customers')

    await waitFor(() => expect(screen.getByText('Ringing Customer')).toBeInTheDocument())
    const row = screen.getByText('Ringing Customer').closest('tr')!
    await user.click(within(row).getByRole('checkbox'))

    expect(screen.getByText(/1 customer selected/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /delete selected/i }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(customersApi.bulkDelete).toHaveBeenCalledWith(['c1']))
  })

  it('selecting rows and clicking Assign to Agent opens the bulk-assign dialog', async () => {
    const user = userEvent.setup()
    renderWithProviders('/customers')

    await waitFor(() => expect(screen.getByText('Ringing Customer')).toBeInTheDocument())
    const row = screen.getByText('Ringing Customer').closest('tr')!
    await user.click(within(row).getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /assign to agent/i }))

    expect(screen.getByText(/select agent/i)).toBeInTheDocument()
  })
})
