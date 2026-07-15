import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Sidebar } from './Sidebar'

function renderSidebar() {
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>,
  )
}

describe('Sidebar — change password link is admin-only', () => {
  it('shows "Change password" for an ADMIN', () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'admin-1', name: 'Admin One', email: 'admin@test.com', role: 'ADMIN',
    })

    renderSidebar()

    expect(screen.getByText('Change password')).toBeInTheDocument()
  })

  it('hides "Change password" for an AGENT — they must ask an admin instead', () => {
    useAuthStore.getState().login({
      token: 't', refreshToken: 'rt', userId: 'agent-1', name: 'Agent One', email: 'agent@test.com', role: 'AGENT',
    })

    renderSidebar()

    expect(screen.queryByText('Change password')).not.toBeInTheDocument()
  })
})
