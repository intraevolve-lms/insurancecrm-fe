import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BulkAssignDialog } from './BulkAssignDialog'
import type { BulkAssignResult } from '@/types/customer'
import type { User } from '@/types/auth'

const bulkAssignAgent = vi.fn((_customerIds: string[], _agentId: string) =>
  Promise.resolve({
    success: true, message: 'ok',
    data: {
      agentId: 'agent-1', agentName: 'Agent One', requestedCount: 2, assignedCount: 2,
      notFoundCustomerIds: [], customers: [],
    } as BulkAssignResult,
  }))

vi.mock('@/api/customers', () => ({
  customersApi: { bulkAssignAgent: (ids: string[], agentId: string) => bulkAssignAgent(ids, agentId) },
}))

const toastSuccess = vi.fn()
const toastWarning = vi.fn()
const toastError = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    success: (m: string) => toastSuccess(m),
    warning: (m: string) => toastWarning(m),
    error: (m: string) => toastError(m),
  },
}))

const agents: User[] = [
  { id: 'agent-1', name: 'Agent One', email: 'a1@test.com', role: 'AGENT', active: true, createdAt: '2026-01-01' },
  { id: 'agent-2', name: 'Agent Two', email: 'a2@test.com', role: 'AGENT', active: true, createdAt: '2026-01-01' },
]

function renderDialog(overrides: Partial<React.ComponentProps<typeof BulkAssignDialog>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onOpenChange = vi.fn()
  const onAssigned = vi.fn()
  render(
    <QueryClientProvider client={queryClient}>
      <BulkAssignDialog
        open
        onOpenChange={onOpenChange}
        customerIds={['c1', 'c2']}
        customerNames={['Alice', 'Bob']}
        agents={agents}
        onAssigned={onAssigned}
        {...overrides}
      />
    </QueryClientProvider>,
  )
  return { onOpenChange, onAssigned }
}

describe('BulkAssignDialog', () => {
  beforeEach(() => {
    bulkAssignAgent.mockClear()
    toastSuccess.mockClear()
    toastWarning.mockClear()
    toastError.mockClear()
  })

  it('shows how many customers are being assigned and previews their names', () => {
    renderDialog()
    expect(screen.getByText(/Alice, Bob/)).toBeInTheDocument()
  })

  it('truncates the preview to 3 names plus a count when there are more', () => {
    renderDialog({ customerIds: ['c1', 'c2', 'c3', 'c4'], customerNames: ['Alice', 'Bob', 'Carol', 'Dave'] })
    expect(screen.getByText(/Alice, Bob, Carol and 1 more/)).toBeInTheDocument()
  })

  it('disables Assign until an agent is selected', async () => {
    const user = userEvent.setup()
    renderDialog()
    expect(screen.getByRole('button', { name: /assign/i })).toBeDisabled()

    await user.selectOptions(screen.getByRole('combobox'), 'agent-1')
    expect(screen.getByRole('button', { name: /assign/i })).toBeEnabled()
  })

  it('submits the selected agent and selected customer ids', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.selectOptions(screen.getByRole('combobox'), 'agent-1')
    await user.click(screen.getByRole('button', { name: /assign/i }))

    await waitFor(() => expect(bulkAssignAgent).toHaveBeenCalledWith(['c1', 'c2'], 'agent-1'))
  })

  it('shows requested/assigned/skipped counts after a successful assign', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.selectOptions(screen.getByRole('combobox'), 'agent-1')
    await user.click(screen.getByRole('button', { name: /assign/i }))

    await waitFor(() => expect(screen.getByText('Requested')).toBeInTheDocument())
    expect(screen.getByText('Assigned')).toBeInTheDocument()
    expect(screen.getByText('Skipped')).toBeInTheDocument()
    expect(toastSuccess).toHaveBeenCalledWith('2 customers assigned to Agent One')
  })

  it('warns instead of a success toast when some customers were not found', async () => {
    bulkAssignAgent.mockResolvedValueOnce({
      success: true, message: 'ok',
      data: {
        agentId: 'agent-1', agentName: 'Agent One', requestedCount: 2, assignedCount: 1,
        notFoundCustomerIds: ['c2'], customers: [],
      },
    })
    const user = userEvent.setup()
    renderDialog()

    await user.selectOptions(screen.getByRole('combobox'), 'agent-1')
    await user.click(screen.getByRole('button', { name: /assign/i }))

    await waitFor(() => expect(toastWarning).toHaveBeenCalledWith(
      'Assigned 1 of 2 — some customers were not found'))
    expect(screen.getByText(/could not be found and were skipped/)).toBeInTheDocument()
  })

  it('calls onAssigned when the dialog is closed after a result was shown', async () => {
    const user = userEvent.setup()
    const { onAssigned } = renderDialog()

    await user.selectOptions(screen.getByRole('combobox'), 'agent-1')
    await user.click(screen.getByRole('button', { name: /assign/i }))
    await waitFor(() => expect(screen.getByText('Requested')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /done/i }))
    expect(onAssigned).toHaveBeenCalledOnce()
  })
})
