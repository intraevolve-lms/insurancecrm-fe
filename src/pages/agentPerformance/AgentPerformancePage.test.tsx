import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { AgentPerformance } from '@/types/agentPerformance'
import AgentPerformancePage from './AgentPerformancePage'

const performance: AgentPerformance[] = [
  {
    agentId: 'a1', agentName: 'Agent One', totalCustomers: 10,
    myCallback: 0, callback: 2, prospect: 1, ringing: 3, switchOff: 0, hangUp: 0, nextYear: 0,
    lastActivityAt: '2026-01-05T10:00:00',
  },
  {
    agentId: 'a2', agentName: 'Agent Two', totalCustomers: 4,
    myCallback: 1, callback: 0, prospect: 0, ringing: 0, switchOff: 0, hangUp: 0, nextYear: 0,
  },
]

const getAllMock = vi.fn()
vi.mock('@/api/agentPerformance', () => ({
  agentPerformanceApi: { getAll: () => getAllMock() },
}))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AgentPerformancePage />
    </QueryClientProvider>,
  )
}

describe('AgentPerformancePage', () => {
  it('renders a row per agent with the right totals and outcome counts', async () => {
    getAllMock.mockResolvedValueOnce({ success: true, message: 'ok', data: performance })
    renderPage()

    await waitFor(() => expect(screen.getByText('Agent One')).toBeInTheDocument())
    expect(screen.getByText('Agent Two')).toBeInTheDocument()

    const row1 = screen.getByText('Agent One').closest('tr')!
    expect(row1).toHaveTextContent('10') // totalCustomers
    expect(row1).toHaveTextContent('3')  // ringing
    expect(row1).toHaveTextContent('2')  // callback

    const row2 = screen.getByText('Agent Two').closest('tr')!
    expect(row2).toHaveTextContent('4') // totalCustomers
  })

  it('shows an empty state when no agent has logged any activity', async () => {
    getAllMock.mockResolvedValueOnce({ success: true, message: 'ok', data: [] })
    renderPage()

    await waitFor(() => expect(screen.getByText(/no agent activity yet/i)).toBeInTheDocument())
  })

  it('shows an error state when the request fails', async () => {
    getAllMock.mockRejectedValueOnce(new Error('network error'))
    renderPage()

    await waitFor(() => expect(screen.getByText(/failed to load agent performance/i)).toBeInTheDocument())
  })
})
