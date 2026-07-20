import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { communicationsApi } from '@/api/communications'
import type { CommunicationLog } from '@/types/communication'
import { CommunicationTimeline } from './CommunicationTimeline'

const logs: CommunicationLog[] = [
  {
    id: 'log-1', leadId: 'l1', channel: 'CALL', outcome: 'RINGING',
    notes: 'Left a voicemail', loggedBy: 'agent-1', loggedByName: 'Agent One',
    loggedAt: '2026-01-05T10:00:00', followUpDate: '2026-01-10T14:30:00',
  },
  {
    id: 'log-2', leadId: 'l1', channel: 'CALL', outcome: 'CALLBACK',
    loggedBy: 'agent-2', loggedByName: 'Agent Two', loggedAt: '2026-01-04T09:00:00',
  },
]

vi.mock('@/api/communications', () => ({
  communicationsApi: {
    getByLead: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: logs })),
    getByCustomer: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: logs })),
    logForLead: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: logs[0] })),
    logForCustomer: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: logs[0] })),
    delete: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: undefined })),
  },
}))

function renderTimeline(entityType: 'customer' | 'lead' = 'lead') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <CommunicationTimeline entityType={entityType} entityId="l1" queryKey={['test-comms', 'l1']} />
    </QueryClientProvider>,
  )
}

describe('CommunicationTimeline — rendering', () => {
  beforeEach(() => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
  })

  it('renders the empty state when there are no logs', async () => {
    vi.mocked(communicationsApi.getByLead).mockResolvedValueOnce({ success: true, message: 'ok', data: [], timestamp: '2026-01-01T00:00:00' })
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

describe('CommunicationTimeline — log activity dialog', () => {
  beforeEach(() => {
    vi.mocked(communicationsApi.logForLead).mockClear()
    vi.mocked(communicationsApi.logForCustomer).mockClear()
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
  })

  it('opens from the header button and from the empty-state button', async () => {
    const user = userEvent.setup()
    vi.mocked(communicationsApi.getByLead).mockResolvedValueOnce({ success: true, message: 'ok', data: [], timestamp: '2026-01-01T00:00:00' })
    renderTimeline()

    await waitFor(() => expect(screen.getByText(/no activity logged yet/i)).toBeInTheDocument())
    await user.click(screen.getAllByRole('button', { name: /log activity/i })[0])

    expect(screen.getByRole('heading', { name: 'Log Activity' })).toBeInTheDocument()
  })

  it('saving for a lead calls logForLead with the selected outcome and notes', async () => {
    const user = userEvent.setup()
    renderTimeline('lead')

    await waitFor(() => expect(screen.getByText('Ringing')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /log activity/i }))
    await user.selectOptions(screen.getByRole('combobox'), 'CALLBACK')
    await user.type(screen.getByPlaceholderText(/what was discussed/i), 'Follow up next week')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(communicationsApi.logForLead).toHaveBeenCalledWith('l1', expect.objectContaining({
      channel: 'CALL', outcome: 'CALLBACK', notes: 'Follow up next week',
    })))
    expect(communicationsApi.logForCustomer).not.toHaveBeenCalled()
  })

  it('saving for a customer calls logForCustomer, not logForLead', async () => {
    const user = userEvent.setup()
    renderTimeline('customer')

    await waitFor(() => expect(screen.getByText('Ringing')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /log activity/i }))
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(communicationsApi.logForCustomer).toHaveBeenCalledWith('l1', expect.anything()))
    expect(communicationsApi.logForLead).not.toHaveBeenCalled()
  })
})
