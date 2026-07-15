import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import LoginPage from './LoginPage'

interface LoginPayload {
  email: string
  password: string
}

const login = vi.fn((_payload: LoginPayload) =>
  Promise.resolve({
    success: true,
    message: 'ok',
    data: {
      token: 't', refreshToken: 'rt', userId: 'u1', name: 'Test User',
      email: 'user@test.com', role: 'AGENT' as const, mustChangePassword: false,
    },
  }))

vi.mock('@/api/auth', () => ({
  authApi: { login: (payload: LoginPayload) => login(payload) },
}))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<div>Dashboard Page Marker</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    login.mockClear()
    useAuthStore.getState().logout()
  })

  it('requires both fields before calling the API', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(screen.getByText('Both fields are required.')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('submits email and password, logs in, and redirects to the dashboard on success', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByPlaceholderText('you@company.com'), 'user@test.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'CorrectPassword@1')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(login).toHaveBeenCalledWith({
      email: 'user@test.com', password: 'CorrectPassword@1',
    }))
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    await waitFor(() => expect(screen.getByText('Dashboard Page Marker')).toBeInTheDocument())
  })

  it('shows an inline error and does not redirect on invalid credentials', async () => {
    login.mockImplementationOnce(() => Promise.reject(new Error('bad credentials')))
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByPlaceholderText('you@company.com'), 'user@test.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'WrongPassword@1')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(screen.getByText('Invalid email or password. Please try again.')).toBeInTheDocument())
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(screen.queryByText('Dashboard Page Marker')).not.toBeInTheDocument()
  })

  it('toggles the password field between masked and visible text', async () => {
    const user = userEvent.setup()
    renderPage()

    const passwordInput = screen.getByPlaceholderText('••••••••')
    expect(passwordInput).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: '' }))
    expect(passwordInput).toHaveAttribute('type', 'text')
  })

  it('clears a previous error once the form is resubmitted', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(screen.getByText('Both fields are required.')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('you@company.com'), 'user@test.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'CorrectPassword@1')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(screen.queryByText('Both fields are required.')).not.toBeInTheDocument())
  })
})
