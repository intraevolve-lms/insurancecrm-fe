import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
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
  },
  {
    id: 'l4', name: 'No Outcome Lead', phone: '9444444444', source: 'REFERRAL', status: 'NEW',
    createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00',
  },
]

vi.mock('@/api/leads', () => ({
  leadsApi: { getAll: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: leads })) },
}))

vi.mock('@/api/users', () => ({
  usersApi: { getAll: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: [] })) },
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
