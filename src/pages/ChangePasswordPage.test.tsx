import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import ChangePasswordPage from './ChangePasswordPage'

interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

const changePassword = vi.fn((_payload: ChangePasswordPayload) =>
  Promise.resolve({ success: true, message: 'ok', data: undefined }))

vi.mock('@/api/auth', () => ({
  authApi: { changePassword: (payload: ChangePasswordPayload) => changePassword(payload) },
}))

const toastSuccess = vi.fn()

vi.mock('sonner', () => ({
  toast: { success: (message: string) => toastSuccess(message), error: vi.fn() },
}))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/change-password']}>
        <Routes>
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/login" element={<div>Login Page Marker</div>} />
          <Route path="/dashboard" element={<div>Dashboard Page Marker</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// Current password and confirm-password share the same placeholder ("••••••••") and neither
// input is linked to its <label> via htmlFor, so they're only distinguishable by DOM order.
function getCurrentAndConfirmInputs() {
  const [currentPasswordInput, confirmPasswordInput] = screen.getAllByPlaceholderText('••••••••')
  return { currentPasswordInput, confirmPasswordInput }
}

describe('ChangePasswordPage — agents cannot self-service their password', () => {
  beforeEach(() => {
    changePassword.mockClear()
    toastSuccess.mockClear()
  })

  it('an AGENT sees the "can\'t change password here" message, not the form', () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })

    renderPage()

    expect(screen.getByText("Can't Change Password Here")).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('At least 8 characters')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /update password/i })).not.toBeInTheDocument()
  })

  it('an AGENT can still sign out from the blocked screen', async () => {
    const user = userEvent.setup()
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'a@test.com', role: 'AGENT',
    })

    renderPage()
    await user.click(screen.getByRole('button', { name: /sign out/i }))

    expect(screen.getByText('Login Page Marker')).toBeInTheDocument()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('an ADMIN sees the normal change-password form', () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'admin-1', name: 'Admin One', email: 'admin@test.com', role: 'ADMIN',
    })

    renderPage()

    expect(screen.queryByText("Can't Change Password Here")).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument()
  })

  it('an ADMIN submitting the form successfully calls the API, toasts, clears mustChangePassword, and redirects to dashboard', async () => {
    const user = userEvent.setup()
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'admin-1', name: 'Admin One', email: 'admin@test.com', role: 'ADMIN',
      mustChangePassword: true,
    })

    renderPage()
    const { currentPasswordInput, confirmPasswordInput } = getCurrentAndConfirmInputs()
    await user.type(currentPasswordInput, 'OldPassword@123')
    await user.type(screen.getByPlaceholderText('At least 8 characters'), 'NewPassword@456')
    await user.type(confirmPasswordInput, 'NewPassword@456')
    await user.click(screen.getByRole('button', { name: /update password/i }))

    await waitFor(() => expect(changePassword).toHaveBeenCalledWith({
      currentPassword: 'OldPassword@123', newPassword: 'NewPassword@456',
    }))
    expect(toastSuccess).toHaveBeenCalledWith('Password updated')
    expect(useAuthStore.getState().mustChangePassword).toBe(false)
    await waitFor(() => expect(screen.getByText('Dashboard Page Marker')).toBeInTheDocument())
  })

  it('an ADMIN submitting the wrong current password sees an inline error and is not redirected', async () => {
    changePassword.mockImplementationOnce(() => Promise.reject(new Error('bad credentials')))
    const user = userEvent.setup()
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'admin-1', name: 'Admin One', email: 'admin@test.com', role: 'ADMIN',
    })

    renderPage()
    const { currentPasswordInput, confirmPasswordInput } = getCurrentAndConfirmInputs()
    await user.type(currentPasswordInput, 'WrongPassword@123')
    await user.type(screen.getByPlaceholderText('At least 8 characters'), 'NewPassword@456')
    await user.type(confirmPasswordInput, 'NewPassword@456')
    await user.click(screen.getByRole('button', { name: /update password/i }))

    await waitFor(() => expect(screen.getByText('Current password is incorrect. Please try again.')).toBeInTheDocument())
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(screen.queryByText('Dashboard Page Marker')).not.toBeInTheDocument()
  })

  it('an ADMIN with mismatched new/confirm passwords gets a client-side error without calling the API', async () => {
    const user = userEvent.setup()
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'admin-1', name: 'Admin One', email: 'admin@test.com', role: 'ADMIN',
    })

    renderPage()
    const { currentPasswordInput, confirmPasswordInput } = getCurrentAndConfirmInputs()
    await user.type(currentPasswordInput, 'OldPassword@123')
    await user.type(screen.getByPlaceholderText('At least 8 characters'), 'NewPassword@456')
    await user.type(confirmPasswordInput, 'DoesNotMatch@456')
    await user.click(screen.getByRole('button', { name: /update password/i }))

    expect(screen.getByText('New password and confirmation do not match.')).toBeInTheDocument()
    expect(changePassword).not.toHaveBeenCalled()
  })
})
