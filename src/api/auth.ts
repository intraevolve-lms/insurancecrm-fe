import api from '@/lib/axios'
import type { ApiResponse } from '@/types/api'
import type { AuthResponse, LoginRequest } from '@/types/auth'

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<ApiResponse<AuthResponse>>('/auth/login', data).then((r) => r.data),
  refresh: (refreshToken: string) =>
    api.post<ApiResponse<AuthResponse>>('/auth/refresh', { refreshToken }).then((r) => r.data),
}
