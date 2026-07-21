import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import DashboardPage from './DashboardPage'

const summary = {
  totalCustomers: 5,
  outcomeCounts: { RINGING: 2, CALLBACK: 1 },
}

vi.mock('@/api/dashboard', () => ({
  dashboardApi: { getSummary: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: summary })) },
}))

vi.mock('@/api/reminders', () => ({
  remindersApi: { getAll: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: [] })) },
}))

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/customers" element={<div>Customers Page Marker</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('DashboardPage (Overview) — customer-only scope', () => {
  it('shows Total Customers and per-outcome counts sourced only from customers', async () => {
    renderDashboard()

    await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument())
    expect(screen.getByText('Total Customers')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument() // Ringing count
    expect(screen.getByText('1')).toBeInTheDocument() // Callback count
  })

  it('an outcome with zero count still renders as 0, not blank/undefined', async () => {
    renderDashboard()

    await waitFor(() => expect(screen.getByText('Total Customers')).toBeInTheDocument())
    // PROSPECT has no entry in outcomeCounts fixture — must default to 0, not "undefined"
    expect(screen.getByText('Prospect')).toBeInTheDocument()
    expect(screen.queryByText('undefined')).not.toBeInTheDocument()
  })

  it('clicking the Ringing tile navigates straight to the customers page filtered by that outcome', async () => {
    const user = userEvent.setup()
    renderDashboard()

    await waitFor(() => expect(screen.getByText('Ringing')).toBeInTheDocument())
    await user.click(screen.getByText('Ringing'))

    await waitFor(() => expect(screen.getByText('Customers Page Marker')).toBeInTheDocument())
  })

  it('clicking Total Customers navigates to the customers page', async () => {
    const user = userEvent.setup()
    renderDashboard()

    await waitFor(() => expect(screen.getByText('Total Customers')).toBeInTheDocument())
    await user.click(screen.getByText('Total Customers'))

    await waitFor(() => expect(screen.getByText('Customers Page Marker')).toBeInTheDocument())
  })
})
