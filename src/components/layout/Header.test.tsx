import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { remindersApi } from '@/api/reminders'
import type { Reminder } from '@/types/reminder'
import { Header } from './Header'

vi.mock('@/api/reminders', () => ({
  remindersApi: { getAll: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: [] })) },
}))

function reminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 'r1', type: 'COMMUNICATION_FOLLOWUP', entityKind: 'CUSTOMER',
    entityId: 'c1', entityName: 'Rahul Sharma', description: 'Call back about renewal',
    dueDate: '2026-01-01T00:00:00', overdueDays: 0,
    ...overrides,
  }
}

function renderHeader(initialPath: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Header />
        <Routes>
          <Route path="/customers/:id" element={<div>Customer Detail Page Marker</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Header — page title by route', () => {
  it('shows "New Lead" on /new-customers, not "New Customers"', () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
    renderHeader('/new-customers')

    expect(screen.getByRole('heading', { name: 'New Lead' })).toBeInTheDocument()
    expect(screen.queryByText('New Customers')).not.toBeInTheDocument()
  })

  it('shows "Dashboard" on /dashboard', () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
    renderHeader('/dashboard')

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })
})

describe('Header — follow-up reminder bell', () => {
  beforeEach(() => {
    vi.mocked(remindersApi.getAll).mockClear()
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })
  })

  it('shows no badge and an "All caught up!" empty state when there are no reminders', async () => {
    const user = userEvent.setup()
    renderHeader('/dashboard')

    await waitFor(() => expect(remindersApi.getAll).toHaveBeenCalled())
    await user.click(screen.getByRole('button', { name: /follow-up reminders/i }))

    expect(screen.getByText('All caught up!')).toBeInTheDocument()
  })

  it('shows the reminder count as a badge on the bell', async () => {
    vi.mocked(remindersApi.getAll).mockResolvedValueOnce({
      success: true, message: 'ok', timestamp: '2026-01-01T00:00:00',
      data: [reminder({ id: 'r1' }), reminder({ id: 'r2', overdueDays: 2 })],
    })
    renderHeader('/dashboard')

    await waitFor(() => expect(screen.getByRole('button', { name: /follow-up reminders/i })).toHaveTextContent('2'))
  })

  it('caps the bell badge at "99+"', async () => {
    vi.mocked(remindersApi.getAll).mockResolvedValueOnce({
      success: true, message: 'ok', timestamp: '2026-01-01T00:00:00',
      data: Array.from({ length: 150 }, (_, i) => reminder({ id: `r${i}` })),
    })
    renderHeader('/dashboard')

    await waitFor(() => expect(screen.getByRole('button', { name: /follow-up reminders/i })).toHaveTextContent('99+'))
  })

  it('splits reminders into Overdue and Due Today sections', async () => {
    vi.mocked(remindersApi.getAll).mockResolvedValueOnce({
      success: true, message: 'ok', timestamp: '2026-01-01T00:00:00',
      data: [
        reminder({ id: 'r1', entityName: 'Overdue Customer', overdueDays: 3 }),
        reminder({ id: 'r2', entityName: 'Today Customer', overdueDays: 0 }),
      ],
    })
    const user = userEvent.setup()
    renderHeader('/dashboard')

    await waitFor(() => expect(remindersApi.getAll).toHaveBeenCalled())
    await user.click(screen.getByRole('button', { name: /follow-up reminders/i }))

    expect(screen.getByText(/overdue \(1\)/i)).toBeInTheDocument()
    expect(screen.getByText(/due today \(1\)/i)).toBeInTheDocument()
    expect(screen.getByText('Overdue Customer')).toBeInTheDocument()
    expect(screen.getByText('Today Customer')).toBeInTheDocument()
    expect(screen.getByText('3d overdue')).toBeInTheDocument()
  })

  it('clicking a reminder navigates to its customer detail page and closes the dropdown', async () => {
    vi.mocked(remindersApi.getAll).mockResolvedValueOnce({
      success: true, message: 'ok', timestamp: '2026-01-01T00:00:00',
      data: [reminder({ id: 'r1', entityId: 'c1', entityName: 'Rahul Sharma' })],
    })
    const user = userEvent.setup()
    renderHeader('/dashboard')

    await waitFor(() => expect(remindersApi.getAll).toHaveBeenCalled())
    await user.click(screen.getByRole('button', { name: /follow-up reminders/i }))
    await user.click(screen.getByText('Rahul Sharma'))

    await waitFor(() => expect(screen.getByText('Customer Detail Page Marker')).toBeInTheDocument())
    expect(screen.queryByText('All caught up!')).not.toBeInTheDocument()
  })

  it('clicking outside the dropdown closes it', async () => {
    const user = userEvent.setup()
    renderHeader('/dashboard')

    await waitFor(() => expect(remindersApi.getAll).toHaveBeenCalled())
    await user.click(screen.getByRole('button', { name: /follow-up reminders/i }))
    expect(screen.getByText('All caught up!')).toBeInTheDocument()

    fireEvent.mouseDown(document.body)

    expect(screen.queryByText('All caught up!')).not.toBeInTheDocument()
  })
})
