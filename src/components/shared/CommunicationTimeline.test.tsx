import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { communicationsApi } from '@/api/communications'
import type { CommunicationLog } from '@/types/communication'
import { CommunicationTimeline } from './CommunicationTimeline'

const logs: CommunicationLog[] = [
  {
    id: 'log-1', customerId: 'c1', channel: 'CALL', outcome: 'RINGING',
    notes: 'Left a voicemail', loggedBy: 'agent-1', loggedByName: 'Agent One',
    loggedAt: '2026-01-05T10:00:00', followUpDate: '2026-01-10T14:30:00',
  },
  {
    id: 'log-2', customerId: 'c1', channel: 'CALL', outcome: 'CALLBACK',
    loggedBy: 'agent-2', loggedByName: 'Agent Two', loggedAt: '2026-01-04T09:00:00',
  },
]

vi.mock('@/api/communications', () => ({
  communicationsApi: {
    getByCustomer: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: logs })),
    logForCustomer: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: logs[0] })),
    delete: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: undefined })),
  },
}))

function renderTimeline(onLogged?: () => void) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const result = render(
    <QueryClientProvider client={queryClient}>
      <CommunicationTimeline entityId="c1" queryKey={['test-comms', 'c1']} onLogged={onLogged} />
    </QueryClientProvider>,
  )
  return { ...result, queryClient }
}

describe('CommunicationTimeline — rendering', () => {
  beforeEach(() => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
  })

  it('renders the empty state when there are no logs', async () => {
    vi.mocked(communicationsApi.getByCustomer).mockResolvedValueOnce({ success: true, message: 'ok', data: [], timestamp: '2026-01-01T00:00:00' })
    renderTimeline()

    await waitFor(() => expect(screen.getByText(/no activity logged yet/i)).toBeInTheDocument())
  })

  it('renders each log with its outcome, author, and count in the header', async () => {
    renderTimeline()

    await waitFor(() => expect(screen.getByText('Activity (2)')).toBeInTheDocument())
    expect(screen.getByText('Ringing')).toBeInTheDocument()
    expect(screen.getByText('Callback')).toBeInTheDocument()
    expect(screen.getByText('Agent One')).toBeInTheDocument()
    expect(screen.getByText('Agent Two')).toBeInTheDocument()
  })

  it('shows the follow-up date only on the log that has one', async () => {
    renderTimeline()

    await waitFor(() => expect(screen.getByText(/follow-up 10 jan/i)).toBeInTheDocument())
  })

  it('expanding a log reveals its notes; collapsing hides them again', async () => {
    const user = userEvent.setup()
    renderTimeline()

    await waitFor(() => expect(screen.getByText('Ringing')).toBeInTheDocument())
    expect(screen.queryByText('Left a voicemail')).not.toBeInTheDocument()

    await user.click(screen.getByText('Ringing'))
    expect(screen.getByText('Left a voicemail')).toBeInTheDocument()

    await user.click(screen.getByText('Ringing'))
    expect(screen.queryByText('Left a voicemail')).not.toBeInTheDocument()
  })
})

describe('CommunicationTimeline — delete permissions', () => {
  it('an AGENT can delete their own log but not another agent\'s', async () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
    renderTimeline()

    await waitFor(() => expect(screen.getByText('Ringing')).toBeInTheDocument())
    // log-1 (loggedBy agent-1, the current user) is deletable; log-2 (agent-2) is not.
    // Each log card is a sibling of its channel label — walk up to the row and query within it.
    const ownRow = screen.getByText('Ringing').closest('.relative.pl-10')!
    const otherRow = screen.getByText('Callback').closest('.relative.pl-10')!
    expect(ownRow.querySelector('button')).not.toBeNull()

    // The "other" row's only button should be the chevron toggle wrapper — no delete icon button
    // exists there, so counting buttons distinguishes the two cases without relying on a11y name.
    const ownButtons = ownRow.querySelectorAll('button')
    const otherButtons = otherRow.querySelectorAll('button')
    expect(ownButtons.length).toBeGreaterThan(otherButtons.length)
  })

  it('an ADMIN can delete any log, including ones logged by an agent', async () => {
    const user = userEvent.setup()
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'admin-1', name: 'Admin One', email: 'admin@test.com', role: 'ADMIN',
    })
    renderTimeline()

    await waitFor(() => expect(screen.getByText('Callback')).toBeInTheDocument())
    const row = screen.getByText('Callback').closest('.relative.pl-10')!
    const deleteButton = row.querySelector('button')!
    await user.click(deleteButton)

    await waitFor(() => expect(communicationsApi.delete).toHaveBeenCalledWith('log-2'))
  })
})

describe('CommunicationTimeline — cache invalidation on log/delete', () => {
  beforeEach(() => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
  })

  it('logging an activity invalidates dashboard, customers, customers-new, and agent-performance', async () => {
    const user = userEvent.setup()
    const { queryClient } = renderTimeline()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await waitFor(() => expect(screen.getByText('Ringing')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /log activity/i }))
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dashboard'] }))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['customers'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['customers-new'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['agent-performance'] })
  })

  it('deleting a log also triggers the same cross-page invalidation', async () => {
    const user = userEvent.setup()
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-2', name: 'Agent Two', email: 'b@test.com', role: 'ADMIN',
    })
    const { queryClient } = renderTimeline()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await waitFor(() => expect(screen.getByText('Callback')).toBeInTheDocument())
    const row = screen.getByText('Callback').closest('.relative.pl-10')!
    await user.click(row.querySelector('button')!)

    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dashboard'] }))
  })
})

describe('CommunicationTimeline — log activity dialog', () => {
  beforeEach(() => {
    vi.mocked(communicationsApi.logForCustomer).mockClear()
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
  })

  it('opens from the header button and from the empty-state button', async () => {
    const user = userEvent.setup()
    vi.mocked(communicationsApi.getByCustomer).mockResolvedValueOnce({ success: true, message: 'ok', data: [], timestamp: '2026-01-01T00:00:00' })
    renderTimeline()

    await waitFor(() => expect(screen.getByText(/no activity logged yet/i)).toBeInTheDocument())
    await user.click(screen.getAllByRole('button', { name: /log activity/i })[0])

    expect(screen.getByRole('heading', { name: 'Log Activity' })).toBeInTheDocument()
  })

  it('saving calls logForCustomer with the selected outcome and notes', async () => {
    const user = userEvent.setup()
    renderTimeline()

    await waitFor(() => expect(screen.getByText('Ringing')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /log activity/i }))
    await user.selectOptions(screen.getByRole('combobox'), 'CALLBACK')
    await user.type(screen.getByPlaceholderText(/what was discussed/i), 'Follow up next week')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(communicationsApi.logForCustomer).toHaveBeenCalledWith('c1', expect.objectContaining({
      channel: 'CALL', outcome: 'CALLBACK', notes: 'Follow up next week',
    })))
  })

  it('the outcome dropdown includes Language Issue, and selecting it saves that outcome', async () => {
    const user = userEvent.setup()
    renderTimeline()

    await waitFor(() => expect(screen.getByText('Ringing')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /log activity/i }))

    const select = screen.getByRole('combobox')
    expect(within(select).getByRole('option', { name: 'Language Issue' })).toBeInTheDocument()

    await user.selectOptions(select, 'LANGUAGE_ISSUE')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(communicationsApi.logForCustomer).toHaveBeenCalledWith('c1', expect.objectContaining({
      outcome: 'LANGUAGE_ISSUE',
    })))
  })

  it('the outcome dropdown includes Not Interested, and selecting it saves that outcome', async () => {
    const user = userEvent.setup()
    renderTimeline()

    await waitFor(() => expect(screen.getByText('Ringing')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /log activity/i }))

    const select = screen.getByRole('combobox')
    expect(within(select).getByRole('option', { name: 'Not Interested' })).toBeInTheDocument()

    await user.selectOptions(select, 'NOT_INTERESTED')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(communicationsApi.logForCustomer).toHaveBeenCalledWith('c1', expect.objectContaining({
      outcome: 'NOT_INTERESTED',
    })))
  })

  it('selecting Sale Close reveals the Sale Details fields', async () => {
    const user = userEvent.setup()
    renderTimeline()

    await waitFor(() => expect(screen.getByText('Ringing')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /log activity/i }))
    expect(screen.queryByText('Sale Details *')).not.toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox'), 'SALE_CLOSE')

    expect(screen.getByText('Sale Details *')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. 25000')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. HDFC Ergo')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. Optima Secure')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. Family Floater')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. Mumbai')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. Fresh')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. 1 Year')).toBeInTheDocument()
  })

  it('the Premium field rejects non-numeric characters as they are typed', async () => {
    const user = userEvent.setup()
    renderTimeline()

    await waitFor(() => expect(screen.getByText('Ringing')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /log activity/i }))
    await user.selectOptions(screen.getByRole('combobox'), 'SALE_CLOSE')

    const premiumInput = screen.getByPlaceholderText('e.g. 25000')
    await user.type(premiumInput, 'abc123.5xyz')

    expect(premiumInput).toHaveValue('123.5')
  })

  it('saving a Sale Close with missing fields is blocked client-side', async () => {
    const user = userEvent.setup()
    renderTimeline()

    await waitFor(() => expect(screen.getByText('Ringing')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /log activity/i }))
    await user.selectOptions(screen.getByRole('combobox'), 'SALE_CLOSE')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    expect(communicationsApi.logForCustomer).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Log Activity' })).toBeInTheDocument()
  })

  it('saving a Sale Close with all fields filled sends the sale details, with premium as a number', async () => {
    const user = userEvent.setup()
    renderTimeline()

    await waitFor(() => expect(screen.getByText('Ringing')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /log activity/i }))
    await user.selectOptions(screen.getByRole('combobox'), 'SALE_CLOSE')

    await user.type(screen.getByPlaceholderText('e.g. 25000'), '25000')
    await user.type(screen.getByPlaceholderText('e.g. HDFC Ergo'), 'Acme Insurance')
    await user.type(screen.getByPlaceholderText('e.g. Optima Secure'), 'Gold Plan')
    await user.type(screen.getByPlaceholderText('e.g. Family Floater'), 'Family Floater')
    await user.type(screen.getByPlaceholderText('e.g. Mumbai'), 'Mumbai')
    await user.type(screen.getByPlaceholderText('e.g. Fresh'), 'Fresh')
    await user.type(screen.getByPlaceholderText('e.g. 1 Year'), '1 Year')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(communicationsApi.logForCustomer).toHaveBeenCalledWith('c1', expect.objectContaining({
      outcome: 'SALE_CLOSE',
      premium: 25000,
      companyName: 'Acme Insurance',
      planName: 'Gold Plan',
      scheme: 'Family Floater',
      city: 'Mumbai',
      portabilityOrFresh: 'Fresh',
      tenure: '1 Year',
    })))
  })

  it('switching away from Sale Close before saving does not send stale sale fields', async () => {
    const user = userEvent.setup()
    renderTimeline()

    await waitFor(() => expect(screen.getByText('Ringing')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /log activity/i }))
    await user.selectOptions(screen.getByRole('combobox'), 'SALE_CLOSE')
    await user.type(screen.getByPlaceholderText('e.g. 25000'), '25000')
    await user.type(screen.getByPlaceholderText('e.g. HDFC Ergo'), 'Acme Insurance')

    await user.selectOptions(screen.getByRole('combobox'), 'CALLBACK')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(communicationsApi.logForCustomer).toHaveBeenCalledWith('c1', expect.objectContaining({
      outcome: 'CALLBACK', premium: undefined, companyName: undefined,
    })))
  })

  it('calls onLogged after a successful save', async () => {
    const user = userEvent.setup()
    const onLogged = vi.fn()
    renderTimeline(onLogged)

    await waitFor(() => expect(screen.getByText('Ringing')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /log activity/i }))
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(onLogged).toHaveBeenCalledTimes(1))
  })

  it('does not call onLogged when a log is deleted', async () => {
    const user = userEvent.setup()
    const onLogged = vi.fn()
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'admin-1', name: 'Admin One', email: 'admin@test.com', role: 'ADMIN',
    })
    renderTimeline(onLogged)

    await waitFor(() => expect(screen.getByText('Callback')).toBeInTheDocument())
    const row = screen.getByText('Callback').closest('.relative.pl-10')!
    await user.click(row.querySelector('button')!)

    await waitFor(() => expect(communicationsApi.delete).toHaveBeenCalledWith('log-2'))
    expect(onLogged).not.toHaveBeenCalled()
  })
})

describe('CommunicationTimeline — viewing Sale Close details', () => {
  const saleCloseLog: CommunicationLog = {
    id: 'log-3', customerId: 'c1', channel: 'CALL', outcome: 'SALE_CLOSE',
    loggedBy: 'agent-1', loggedByName: 'Agent One', loggedAt: '2026-01-06T11:00:00',
    premium: 25000, companyName: 'Acme Insurance', planName: 'Gold Plan',
    scheme: 'Family Floater', city: 'Mumbai', portabilityOrFresh: 'Fresh', tenure: '1 Year',
  }

  beforeEach(() => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
    vi.mocked(communicationsApi.getByCustomer).mockResolvedValueOnce({
      success: true, message: 'ok', data: [saleCloseLog], timestamp: '2026-01-01T00:00:00',
    })
  })

  it('shows the premium inline on the collapsed row', async () => {
    renderTimeline()

    await waitFor(() => expect(screen.getByText('Sale Close')).toBeInTheDocument())
    expect(screen.getByText('₹25,000')).toBeInTheDocument()
  })

  it('expanding the log reveals the full Sale Details', async () => {
    const user = userEvent.setup()
    renderTimeline()

    await waitFor(() => expect(screen.getByText('Sale Close')).toBeInTheDocument())
    expect(screen.queryByText('Acme Insurance')).not.toBeInTheDocument()

    await user.click(screen.getByText('Sale Close'))

    expect(screen.getByText('Sale Details')).toBeInTheDocument()
    expect(screen.getByText('Acme Insurance')).toBeInTheDocument()
    expect(screen.getByText('Gold Plan')).toBeInTheDocument()
    expect(screen.getByText('Family Floater')).toBeInTheDocument()
    expect(screen.getByText('Mumbai')).toBeInTheDocument()
    expect(screen.getByText('Fresh')).toBeInTheDocument()
    expect(screen.getByText('1 Year')).toBeInTheDocument()
  })

  it('collapsing the log hides the Sale Details again', async () => {
    const user = userEvent.setup()
    renderTimeline()

    await waitFor(() => expect(screen.getByText('Sale Close')).toBeInTheDocument())
    await user.click(screen.getByText('Sale Close'))
    expect(screen.getByText('Acme Insurance')).toBeInTheDocument()

    await user.click(screen.getByText('Sale Close'))
    expect(screen.queryByText('Acme Insurance')).not.toBeInTheDocument()
  })
})
