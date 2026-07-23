import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { usersApi } from '@/api/users'
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
    create: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: users[1] })),
    update: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: users[1] })),
    deactivate: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: undefined })),
    delete: vi.fn(() => Promise.resolve({ success: true, message: 'ok', data: undefined })),
    forceLogout: (userIds: string[]) => forceLogout(userIds),
  },
}))

const toastSuccess = vi.fn()
const toastError = vi.fn()

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
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
    toastSuccess.mockClear()
    toastError.mockClear()
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
    expect(toastSuccess).toHaveBeenCalledWith('Logged out 1 agent')
  })

  it('canceling the confirm dialog does not call forceLogout and keeps the selection', async () => {
    const user = userEvent.setup()
    renderUsersPage()

    await waitFor(() => expect(screen.getByText('Bob Agent')).toBeInTheDocument())
    await user.click(screen.getByRole('checkbox', { name: 'Select Bob Agent' }))
    await user.click(screen.getByRole('button', { name: 'Log Out Selected (1)' }))
    expect(screen.getByText('Log Out Selected Agents')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByText('Log Out Selected Agents')).not.toBeInTheDocument())
    expect(forceLogout).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Log Out Selected (1)' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Select Bob Agent' })).toBeChecked()
  })

  it('shows an error toast and keeps the dialog open/selection intact when forceLogout fails', async () => {
    forceLogout.mockImplementationOnce(() => Promise.reject(new Error('network error')))
    const user = userEvent.setup()
    renderUsersPage()

    await waitFor(() => expect(screen.getByText('Bob Agent')).toBeInTheDocument())
    await user.click(screen.getByRole('checkbox', { name: 'Select Bob Agent' }))
    await user.click(screen.getByRole('button', { name: 'Log Out Selected (1)' }))
    await user.click(screen.getByRole('button', { name: 'Log Out' }))

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Failed to log out selected agents'))
    expect(toastSuccess).not.toHaveBeenCalled()
    // Dialog and selection survive a failed attempt — nothing was silently cleared.
    // (hidden: true because Radix marks the page aria-hidden while its dialog overlay is open.)
    expect(screen.getByText('Log Out Selected Agents')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Select Bob Agent', hidden: true })).toBeChecked()
  })
})

describe('UsersPage — create / edit / deactivate', () => {
  beforeEach(() => {
    vi.mocked(usersApi.create).mockClear()
    vi.mocked(usersApi.update).mockClear()
    vi.mocked(usersApi.deactivate).mockClear()
    vi.mocked(usersApi.delete).mockClear()
    toastSuccess.mockClear()
    toastError.mockClear()
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'admin-1', name: 'Alice Admin', email: 'alice@test.com', role: 'ADMIN',
    })
  })

  it('submitting the create form with all required fields calls create with AGENT as the default role', async () => {
    const user = userEvent.setup()
    renderUsersPage()

    await waitFor(() => expect(screen.getByText('Bob Agent')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /create user/i }))
    await user.type(screen.getByPlaceholderText('Full name'), 'New User')
    await user.type(screen.getByPlaceholderText('user@example.com'), 'new@test.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create User' }))

    await waitFor(() => expect(usersApi.create).toHaveBeenCalledWith({
      name: 'New User', email: 'new@test.com', password: 'password123', role: 'AGENT',
    }))
    expect(toastSuccess).toHaveBeenCalledWith('User created')
  })

  it('submitting the create form without a password shows an error and does not call create', async () => {
    const user = userEvent.setup()
    renderUsersPage()

    await waitFor(() => expect(screen.getByText('Bob Agent')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /create user/i }))
    await user.type(screen.getByPlaceholderText('Full name'), 'New User')
    await user.type(screen.getByPlaceholderText('user@example.com'), 'new@test.com')
    await user.click(screen.getByRole('button', { name: 'Create User' }))

    expect(toastError).toHaveBeenCalledWith('Password is required')
    expect(usersApi.create).not.toHaveBeenCalled()
  })

  it('editing a user pre-fills name/email/role, leaves password blank, and update does not require one', async () => {
    const user = userEvent.setup()
    renderUsersPage()

    await waitFor(() => expect(screen.getByText('Bob Agent')).toBeInTheDocument())
    const row = screen.getByText('Bob Agent').closest('tr')!
    await user.click(within(row).getByRole('button', { name: /edit/i }))

    expect(screen.getByDisplayValue('Bob Agent')).toBeInTheDocument()
    expect(screen.getByDisplayValue('bob@test.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toHaveValue('')

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(usersApi.update).toHaveBeenCalledWith('agent-1', {
      name: 'Bob Agent', email: 'bob@test.com', password: '', role: 'AGENT',
    }))
  })

  it('editing shows "Save Changes" and a role selector pre-set to the user\'s current role', async () => {
    const user = userEvent.setup()
    renderUsersPage()

    await waitFor(() => expect(screen.getByText('Alice Admin')).toBeInTheDocument())
    const row = screen.getByText('Alice Admin').closest('tr')!
    await user.click(within(row).getByRole('button', { name: /edit/i }))

    expect(screen.getByRole('combobox')).toHaveValue('ADMIN')
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument()
  })

  it('deactivating a user opens a confirm dialog, and confirming calls deactivate', async () => {
    const user = userEvent.setup()
    renderUsersPage()

    await waitFor(() => expect(screen.getByText('Bob Agent')).toBeInTheDocument())
    const row = screen.getByText('Bob Agent').closest('tr')!
    await user.click(within(row).getByRole('button', { name: /deactivate/i }))

    expect(screen.getByText(/deactivate "bob agent" \(bob@test\.com\)/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(usersApi.deactivate).toHaveBeenCalledWith('agent-1'))
    expect(toastSuccess).toHaveBeenCalledWith('User deactivated')
  })

  it('an already-inactive user has no Deactivate button, but does have a Delete button', async () => {
    vi.mocked(usersApi.getAll).mockResolvedValueOnce({
      success: true, message: 'ok', timestamp: '2026-01-01T00:00:00',
      data: [...users, { id: 'agent-3', name: 'Dave Inactive', email: 'dave@test.com', role: 'AGENT', active: false, createdAt: '2026-01-01T00:00:00' }],
    })
    renderUsersPage()

    await waitFor(() => expect(screen.getByText('Dave Inactive')).toBeInTheDocument())
    const row = screen.getByText('Dave Inactive').closest('tr')!
    expect(within(row).queryByRole('button', { name: /deactivate/i })).not.toBeInTheDocument()
    expect(within(row).getByRole('button', { name: /delete/i })).toBeInTheDocument()
    expect(within(row).getByText('Inactive')).toBeInTheDocument()
  })

  it('an already-inactive user has no Edit button either — Delete is the only action', async () => {
    vi.mocked(usersApi.getAll).mockResolvedValueOnce({
      success: true, message: 'ok', timestamp: '2026-01-01T00:00:00',
      data: [...users, { id: 'agent-3', name: 'Dave Inactive', email: 'dave@test.com', role: 'AGENT', active: false, createdAt: '2026-01-01T00:00:00' }],
    })
    renderUsersPage()

    await waitFor(() => expect(screen.getByText('Dave Inactive')).toBeInTheDocument())
    const row = screen.getByText('Dave Inactive').closest('tr')!
    expect(within(row).queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
    expect(within(row).getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('an active user has no Delete button', async () => {
    renderUsersPage()

    await waitFor(() => expect(screen.getByText('Bob Agent')).toBeInTheDocument())
    const row = screen.getByText('Bob Agent').closest('tr')!
    expect(within(row).queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('deleting an inactive user opens a confirm dialog labeled "Delete Permanently", and confirming calls delete', async () => {
    vi.mocked(usersApi.getAll).mockResolvedValueOnce({
      success: true, message: 'ok', timestamp: '2026-01-01T00:00:00',
      data: [...users, { id: 'agent-3', name: 'Dave Inactive', email: 'dave@test.com', role: 'AGENT', active: false, createdAt: '2026-01-01T00:00:00' }],
    })
    const user = userEvent.setup()
    renderUsersPage()

    await waitFor(() => expect(screen.getByText('Dave Inactive')).toBeInTheDocument())
    const row = screen.getByText('Dave Inactive').closest('tr')!
    await user.click(within(row).getByRole('button', { name: /delete/i }))

    expect(screen.getByText(/permanently delete "dave inactive" \(dave@test\.com\)/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete Permanently' }))

    await waitFor(() => expect(usersApi.delete).toHaveBeenCalledWith('agent-3'))
    expect(toastSuccess).toHaveBeenCalledWith('User permanently deleted')
  })
})

describe('UsersPage — non-admin access', () => {
  it('an AGENT sees an Access Denied message instead of the user table', async () => {
    vi.mocked(usersApi.getAll).mockClear()
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Bob Agent', email: 'bob@test.com', role: 'AGENT',
    })
    renderUsersPage()

    expect(screen.getByText('Access Denied')).toBeInTheDocument()
    expect(screen.queryByText('User Management')).not.toBeInTheDocument()
    expect(usersApi.getAll).not.toHaveBeenCalled()
  })
})
