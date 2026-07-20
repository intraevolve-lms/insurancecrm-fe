import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { leadsApi } from '@/api/leads'
import type { Lead } from '@/types/lead'
import LeadsPage from './LeadsPage'

const leads: Lead[] = [
  {
    id: 'l1', name: 'Ringing Lead', phone: '9111111111', source: 'REFERRAL', status: 'NEW',
    lastOutcome: 'RINGING', createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00',
  },
  {
    id: 'l2', name: 'Callback Lead', phone: '9222222222', source: 'WEBSITE', status: 'CONTACTED',
    lastOutcome: 'CALLBACK', createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00',
  },
  {
    id: 'l3', name: 'Converted Ringing Lead', phone: '9333333333', source: 'REFERRAL', status: 'CONVERTED',
    lastOutcome: 'RINGING', createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00',
    convertedCustomerId: 'existing-customer-1',
  },
  {
    id: 'l4', name: 'No Outcome Lead', phone: '9444444444', source: 'REFERRAL', status: 'NEW',
    createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00',
  },
]

const CLOSED_STATUSES = ['CONVERTED', 'LOST']

function computeSummary() {
  const statusCounts: Record<string, number> = { NEW: 0, CONTACTED: 0, QUOTE_SENT: 0, NEGOTIATING: 0, CONVERTED: 0, LOST: 0 }
  const outcomeCounts: Record<string, number> = {
    MY_CALLBACK: 0, CALLBACK: 0, PROSPECT: 0, RINGING: 0, SWITCH_OFF: 0, HANG_UP: 0, NEXT_YEAR: 0, SALE_CLOSE: 0,
  }
  for (const l of leads) {
    statusCounts[l.status] = (statusCounts[l.status] ?? 0) + 1
    if (l.lastOutcome && !CLOSED_STATUSES.includes(l.status)) {
      outcomeCounts[l.lastOutcome] = (outcomeCounts[l.lastOutcome] ?? 0) + 1
    }
  }
  return { statusCounts, outcomeCounts }
}

vi.mock('@/api/leads', () => ({
  leadsApi: {
    getAll: vi.fn((params: { status?: string; outcome?: string } = {}) => {
      const filtered = leads.filter((l) => {
        const matchStatus = !params.status || l.status === params.status
        const matchOutcome = !params.outcome || (l.lastOutcome === params.outcome && !CLOSED_STATUSES.includes(l.status))
        return matchStatus && matchOutcome
      })
      return Promise.resolve({
        success: true, message: 'ok',
        data: { content: filtered, page: 0, size: 20, totalElements: filtered.length, totalPages: 1 },
      })
    }),
    getSummary: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: computeSummary() })),
    create: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: leads[0] })),
    update: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: leads[0] })),
    updateStatus: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: leads[0] })),
    convert: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: { ...leads[0], convertedCustomerId: 'converted-c1' } })),
    delete: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: undefined })),
    bulkDelete: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: { deletedCount: 1, notFoundIds: [] } })),
  },
}))

vi.mock('@/api/users', () => ({
  usersApi: { getAll: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: [] })) },
}))

vi.mock('@/api/communications', () => ({
  communicationsApi: {
    getByLead: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: [] })),
    getByCustomer: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: [] })),
  },
}))

function renderWithProviders(initialEntry: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/leads" element={<LeadsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LeadsPage outcome funnel', () => {
  beforeEach(() => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
  })

  it('excludes converted/lost leads from the outcome funnel counts', async () => {
    renderWithProviders('/leads')

    await waitFor(() => expect(screen.getByText('Ringing Lead')).toBeInTheDocument())

    // "Ringing" tile should count only l1 — l3 also has RINGING but is CONVERTED, so excluded
    const ringingTile = screen.getByText('Ringing').closest('button')!
    expect(ringingTile).toHaveTextContent('1')
  })

  it('clicking an outcome tile filters the table to matching active leads only', async () => {
    const user = userEvent.setup()
    renderWithProviders('/leads')

    await waitFor(() => expect(screen.getByText('Ringing Lead')).toBeInTheDocument())

    await user.click(screen.getByText('Ringing'))

    await waitFor(() => expect(screen.getByText(/Filtered by outcome: Ringing/i)).toBeInTheDocument())
    expect(screen.getByText('Ringing Lead')).toBeInTheDocument()
    // Converted lead is excluded from the filtered view even though its lastOutcome matches
    expect(screen.queryByText('Converted Ringing Lead')).not.toBeInTheDocument()
    expect(screen.queryByText('Callback Lead')).not.toBeInTheDocument()
  })

  it('clicking the same outcome tile again toggles the filter off', async () => {
    const user = userEvent.setup()
    renderWithProviders('/leads?outcome=CALLBACK')

    await waitFor(() => expect(screen.getByText('Callback Lead')).toBeInTheDocument());
    expect(screen.queryByText('Ringing Lead')).not.toBeInTheDocument()

    await user.click(screen.getByText('Callback'))

    await waitFor(() => expect(screen.queryByText(/Filtered by outcome/i)).not.toBeInTheDocument())
    expect(screen.getByText('Ringing Lead')).toBeInTheDocument()
    expect(screen.getByText('Callback Lead')).toBeInTheDocument()
  })

  it('the Clear button on the filter banner removes the filter', async () => {
    const user = userEvent.setup()
    renderWithProviders('/leads?outcome=RINGING')

    await waitFor(() => expect(screen.getByText(/Filtered by outcome/i)).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /clear/i }))

    await waitFor(() => expect(screen.queryByText(/Filtered by outcome/i)).not.toBeInTheDocument())
    expect(screen.getByText('Callback Lead')).toBeInTheDocument()
    expect(screen.getByText('Converted Ringing Lead')).toBeInTheDocument()
  })
})

describe('LeadsPage — add / edit lead', () => {
  beforeEach(() => {
    vi.mocked(leadsApi.create).mockClear()
    vi.mocked(leadsApi.update).mockClear()
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
  })

  it('submitting the Add Lead form with name and phone calls create', async () => {
    const user = userEvent.setup()
    renderWithProviders('/leads')

    await waitFor(() => expect(screen.getByText('Ringing Lead')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /add lead/i }))
    await user.type(screen.getByPlaceholderText('Full name'), 'Brand New Lead')
    await user.type(screen.getByPlaceholderText('9876543210'), '9666666666')
    await user.click(screen.getByRole('button', { name: 'Add Lead' }))

    await waitFor(() => expect(leadsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Brand New Lead', phone: '9666666666' }),
    ))
  })

  it('submitting without name or phone does not call create', async () => {
    const user = userEvent.setup()
    renderWithProviders('/leads')

    await waitFor(() => expect(screen.getByText('Ringing Lead')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /add lead/i }))
    await user.click(screen.getByRole('button', { name: 'Add Lead' }))

    expect(leadsApi.create).not.toHaveBeenCalled()
  })

  it('editing a lead pre-fills the form and calls update with the lead id', async () => {
    const user = userEvent.setup()
    renderWithProviders('/leads')

    await waitFor(() => expect(screen.getByText('Ringing Lead')).toBeInTheDocument())
    const row = screen.getByText('Ringing Lead').closest('tr')!
    await user.click(within(row).getByRole('button', { name: 'Edit' }))

    const nameInput = screen.getByDisplayValue('Ringing Lead')
    await user.clear(nameInput)
    await user.type(nameInput, 'Renamed Lead')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(leadsApi.update).toHaveBeenCalledWith(
      'l1', expect.objectContaining({ name: 'Renamed Lead' }),
    ))
  })

  it('a CONVERTED lead has its Edit button disabled', async () => {
    renderWithProviders('/leads')

    await waitFor(() => expect(screen.getByText('Converted Ringing Lead')).toBeInTheDocument())
    const row = screen.getByText('Converted Ringing Lead').closest('tr')!
    expect(within(row).getByRole('button', { name: 'Edit' })).toBeDisabled()
  })
})

describe('LeadsPage — status changes, convert, and lost reason', () => {
  beforeEach(() => {
    vi.mocked(leadsApi.updateStatus).mockClear()
    vi.mocked(leadsApi.convert).mockClear()
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
  })

  it('moving a lead to a non-LOST status calls updateStatus directly, no confirm dialog', async () => {
    const user = userEvent.setup()
    renderWithProviders('/leads')

    await waitFor(() => expect(screen.getByText('Ringing Lead')).toBeInTheDocument())
    const row = screen.getByText('Ringing Lead').closest('tr')!
    await user.selectOptions(within(row).getByRole('combobox'), 'CONTACTED')

    await waitFor(() => expect(leadsApi.updateStatus).toHaveBeenCalledWith('l1', 'CONTACTED', undefined))
  })

  it('moving a lead to LOST opens the lost-reason dialog instead of updating immediately', async () => {
    const user = userEvent.setup()
    renderWithProviders('/leads')

    await waitFor(() => expect(screen.getByText('Ringing Lead')).toBeInTheDocument())
    const row = screen.getByText('Ringing Lead').closest('tr')!
    await user.selectOptions(within(row).getByRole('combobox'), 'LOST')

    expect(leadsApi.updateStatus).not.toHaveBeenCalled()
    expect(screen.getByText('Mark as Lost')).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: '' }), 'Too expensive')
    await user.click(screen.getByRole('button', { name: /mark lost/i }))

    await waitFor(() => expect(leadsApi.updateStatus).toHaveBeenCalledWith('l1', 'LOST', 'Too expensive'))
  })

  it('converting a lead opens a confirm dialog, and confirming calls convert', async () => {
    const user = userEvent.setup()
    renderWithProviders('/leads')

    await waitFor(() => expect(screen.getByText('Ringing Lead')).toBeInTheDocument())
    const row = screen.getByText('Ringing Lead').closest('tr')!
    await user.click(within(row).getByRole('button', { name: /convert/i }))

    expect(screen.getByText(/this will create a new customer record/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    await waitFor(() => expect(leadsApi.convert).toHaveBeenCalledWith('l1'))
  })

  it('a CONVERTED lead with a linked customer shows "View Customer" instead of Convert', async () => {
    renderWithProviders('/leads')

    await waitFor(() => expect(screen.getByText('Converted Ringing Lead')).toBeInTheDocument())
    const row = screen.getByText('Converted Ringing Lead').closest('tr')!
    expect(within(row).queryByRole('button', { name: /^convert$/i })).not.toBeInTheDocument()
    expect(within(row).getByRole('button', { name: /view customer/i })).toBeInTheDocument()
  })
})

describe('LeadsPage — activity log toggle', () => {
  beforeEach(() => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
  })

  it('clicking Activity expands the timeline panel, clicking again collapses it', async () => {
    const user = userEvent.setup()
    renderWithProviders('/leads')

    await waitFor(() => expect(screen.getByText('Ringing Lead')).toBeInTheDocument())
    const row = screen.getByText('Ringing Lead').closest('tr')!
    await user.click(within(row).getByRole('button', { name: /activity/i }))

    await waitFor(() => expect(screen.getByText(/no activity logged yet/i)).toBeInTheDocument())

    await user.click(within(row).getByRole('button', { name: /activity/i }))
    expect(screen.queryByText(/no activity logged yet/i)).not.toBeInTheDocument()
  })
})

describe('LeadsPage — ADMIN-only bulk delete', () => {
  beforeEach(() => {
    vi.mocked(leadsApi.bulkDelete).mockClear()
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'admin-1', name: 'Admin One', email: 'admin@test.com', role: 'ADMIN',
    })
  })

  it('selecting rows and bulk-deleting calls bulkDelete with the selected ids', async () => {
    const user = userEvent.setup()
    renderWithProviders('/leads')

    await waitFor(() => expect(screen.getByText('Ringing Lead')).toBeInTheDocument())
    const row = screen.getByText('Ringing Lead').closest('tr')!
    await user.click(within(row).getByRole('checkbox'))

    expect(screen.getByText(/1 lead selected/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /delete selected/i }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(leadsApi.bulkDelete).toHaveBeenCalledWith(['l1']))
  })

  it('an AGENT does not see selection checkboxes or the delete button', async () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
    renderWithProviders('/leads')

    await waitFor(() => expect(screen.getByText('Ringing Lead')).toBeInTheDocument())
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })
})
