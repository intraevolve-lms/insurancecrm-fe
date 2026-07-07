import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types/auth'
import UsersPage from './UsersPage'

const users: User[] = [
  { id: 'admin-1', name: 'Alice Admin', email: 'alice@test.com', role: 'ADMIN', active: true, createdAt: '2026-01-01T00:00:00' },
  { id: 'agent-1', name: 'Bob Agent', email: 'bob@test.com', role: 'AGENT', active: true, createdAt: '2026-01-01T00:00:00' },
  { id: 'agent-2', name: 'Carol Agent', email: 'carol@test.com', role: 'AGENT', active: true, createdAt: '2026-01-01T00:00:00' },
]

const forceLogout = vi.fn((_userIds: string[]) => Promise.resolve({ success: true, message: 'ok', data: undefined }))

vi.mock('@/api/users', () => ({
  usersApi: {
    getAll: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: users })),
    create: vi.fn(),
    update: vi.fn(),
    deactivate: vi.fn(),
    forceLogout: (userIds: string[]) => forceLogout(userIds),
  },
}))

function renderUsersPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <UsersPage />
    </QueryClientProvider>,
  )
}

describe('UsersPage — force logout selected agents', () => {
  beforeEach(() => {
    forceLogout.mockClear()
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'admin-1', name: 'Alice Admin', email: 'alice@test.com', role: 'ADMIN',
    })
  })

  it('only renders a select checkbox for AGENT rows, not ADMIN rows', async () => {
    renderUsersPage()

    await waitFor(() => expect(screen.getByText('Bob Agent')).toBeInTheDocument())
    expect(screen.getByRole('checkbox', { name: 'Select Bob Agent' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Select Carol Agent' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Select Alice Admin' })).not.toBeInTheDocument()
  })

  it('does not show the "Log Out Selected" button until an agent is selected', async () => {
    renderUsersPage()

    await waitFor(() => expect(screen.getByText('Bob Agent')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /Log Out Selected/i })).not.toBeInTheDocument()
  })

  it('selecting one agent shows a count of 1, selecting a second bumps it to 2', async () => {
    const user = userEvent.setup()
    renderUsersPage()

    await waitFor(() => expect(screen.getByText('Bob Agent')).toBeInTheDocument())
    await user.click(screen.getByRole('checkbox', { name: 'Select Bob Agent' }))
    expect(screen.getByRole('button', { name: 'Log Out Selected (1)' })).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Select Carol Agent' }))
    expect(screen.getByRole('button', { name: 'Log Out Selected (2)' })).toBeInTheDocument()
  })

  it('the header checkbox selects every agent (but not admins), and toggles them all off again', async () => {
    const user = userEvent.setup()
    renderUsersPage()

    await waitFor(() => expect(screen.getByText('Bob Agent')).toBeInTheDocument())
    await user.click(screen.getByRole('checkbox', { name: 'Select all agents' }))

    expect(screen.getByRole('button', { name: 'Log Out Selected (2)' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Select Bob Agent' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Select Carol Agent' })).toBeChecked()

    await user.click(screen.getByRole('checkbox', { name: 'Select all agents' }))
    expect(screen.queryByRole('button', { name: /Log Out Selected/i })).not.toBeInTheDocument()
  })

  it('confirming the dialog calls forceLogout with the selected agent ids, labeled "Log Out" not "Delete"', async () => {
    const user = userEvent.setup()
    renderUsersPage()

    await waitFor(() => expect(screen.getByText('Bob Agent')).toBeInTheDocument())
    await user.click(screen.getByRole('checkbox', { name: 'Select Bob Agent' }))
    await user.click(screen.getByRole('button', { name: 'Log Out Selected (1)' }))

    expect(screen.getByText('Log Out Selected Agents')).toBeInTheDocument()
    const confirmButton = screen.getByRole('button', { name: 'Log Out' })
    await user.click(confirmButton)

    await waitFor(() => expect(forceLogout).toHaveBeenCalledWith(['agent-1']))
  })

  it('clears the selection and hides the button after a successful logout', async () => {
    const user = userEvent.setup()
    renderUsersPage()

    await waitFor(() => expect(screen.getByText('Bob Agent')).toBeInTheDocument())
    await user.click(screen.getByRole('checkbox', { name: 'Select Bob Agent' }))
    await user.click(screen.getByRole('button', { name: 'Log Out Selected (1)' }))
    await user.click(screen.getByRole('button', { name: 'Log Out' }))

    await waitFor(() => expect(screen.queryByRole('button', { name: /Log Out Selected/i })).not.toBeInTheDocument())
    expect(screen.getByRole('checkbox', { name: 'Select Bob Agent' })).not.toBeChecked()
  })
})
