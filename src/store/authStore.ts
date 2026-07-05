import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Role } from '@/types/auth'

interface AuthState {
  token: string | null
  refreshToken: string | null
  userId: string | null
  name: string | null
  email: string | null
  role: Role | null
  isAuthenticated: boolean
  login: (data: { token: string; refreshToken: string; userId: string; name: string; email: string; role: Role }) => void
  setTokens: (data: { token: string; refreshToken: string }) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      userId: null,
      name: null,
      email: null,
      role: null,
      isAuthenticated: false,
      login: (data) =>
        set({
          token: data.token,
          refreshToken: data.refreshToken,
          userId: data.userId,
          name: data.name,
          email: data.email,
          role: data.role,
          isAuthenticated: true,
        }),
      setTokens: (data) =>
        set({
          token: data.token,
          refreshToken: data.refreshToken,
        }),
      logout: () =>
        set({
          token: null,
          refreshToken: null,
          userId: null,
          name: null,
          email: null,
          role: null,
          isAuthenticated: false,
        }),
    }),
    { name: 'crm-auth' },
  ),
)
