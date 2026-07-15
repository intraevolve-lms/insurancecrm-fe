import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import CustomerDetailPage from './CustomerDetailPage'
import type { Customer } from '@/types/customer'

const getById = vi.fn((_id: string) => Promise.resolve({ success: true, message: 'ok', data: null as Customer | null }))

vi.mock('@/api/customers', () => ({
  customersApi: { getById: (id: string) => getById(id) },
}))

vi.mock('@/components/shared/CommunicationTimeline', () => ({
  CommunicationTimeline: () => <div>Communication Timeline Marker</div>,
}))

const baseCustomer: Customer = {
  id: 'c1', name: 'Alice Sharma', phone: '9000000000',
  createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00',
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/customers/c1']}>
        <Routes>
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/customers" element={<div>Customers Page Marker</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CustomerDetailPage', () => {
  it('shows a loading spinner before the customer loads', () => {
    getById.mockReturnValueOnce(new Promise(() => {})) // never resolves
    renderPage()
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
  })

  it('shows "Customer not found" when the customer does not exist', async () => {
    getById.mockResolvedValueOnce({ success: true, message: 'ok', data: null as unknown as Customer })
    renderPage()
    await waitFor(() => expect(screen.getByText('Customer not found.')).toBeInTheDocument())
  })

  it('renders the customer\'s core details', async () => {
    getById.mockResolvedValueOnce({
      success: true, message: 'ok',
      data: { ...baseCustomer, email: 'alice@test.com', address: 'Mumbai', assignedAgentName: 'Agent One' },
    })
    renderPage()

    await waitFor(() => expect(screen.getByText('Alice Sharma')).toBeInTheDocument())
    expect(screen.getByText('9000000000')).toBeInTheDocument()
    expect(screen.getByText('alice@test.com')).toBeInTheDocument()
    expect(screen.getByText('Mumbai')).toBeInTheDocument()
    expect(screen.getByText('Agent: Agent One')).toBeInTheDocument()
    expect(screen.getByText('Communication Timeline Marker')).toBeInTheDocument()
  })

  it('renders plan/premium/expiry only when present, and formats premium as INR', async () => {
    getById.mockResolvedValueOnce({
      success: true, message: 'ok',
      data: { ...baseCustomer, plan: 'Gold Plan', lastYearPremium: 25448, expiryDate: '2026-12-07' },
    })
    renderPage()

    await waitFor(() => expect(screen.getByText('Gold Plan')).toBeInTheDocument())
    expect(screen.getByText('₹25,448')).toBeInTheDocument()
    expect(screen.queryByText('Date of Birth')).not.toBeInTheDocument()
  })

  it('shows a customer note when present', async () => {
    getById.mockResolvedValueOnce({
      success: true, message: 'ok',
      data: { ...baseCustomer, notes: 'Prefers WhatsApp over calls' },
    })
    renderPage()

    await waitFor(() => expect(screen.getByText('Prefers WhatsApp over calls')).toBeInTheDocument())
  })

  it('"Back to Customers" navigates to the customers list', async () => {
    getById.mockResolvedValueOnce({ success: true, message: 'ok', data: baseCustomer })
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => expect(screen.getByText('Alice Sharma')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /back to customers/i }))

    await waitFor(() => expect(screen.getByText('Customers Page Marker')).toBeInTheDocument())
  })
})
