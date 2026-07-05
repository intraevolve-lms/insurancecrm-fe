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
  mustChangePassword: boolean
  login: (data: { token: string; refreshToken: string; userId: string; name: string; email: string; role: Role; mustChangePassword?: boolean }) => void
  setTokens: (data: { token: string; refreshToken: string }) => void
  clearMustChangePassword: () => void
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
      mustChangePassword: false,
      login: (data) =>
        set({
          token: data.token,
          refreshToken: data.refreshToken,
          userId: data.userId,
          name: data.name,
          email: data.email,
          role: data.role,
          isAuthenticated: true,
          mustChangePassword: data.mustChangePassword ?? false,
        }),
      setTokens: (data) =>
        set({
          token: data.token,
          refreshToken: data.refreshToken,
        }),
      clearMustChangePassword: () => set({ mustChangePassword: false }),
      logout: () =>
        set({
          token: null,
          refreshToken: null,
          userId: null,
          name: null,
          email: null,
          role: null,
          isAuthenticated: false,
          mustChangePassword: false,
        }),
    }),
    { name: 'crm-auth' },
  ),
)
