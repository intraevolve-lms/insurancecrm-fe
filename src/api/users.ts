import api from '@/lib/axios'
import type { ApiResponse } from '@/types/api'
import type { User } from '@/types/auth'

export interface CreateUserRequest {
  name: string
  email: string
  password: string
  role: 'ADMIN' | 'AGENT'
}

export const usersApi = {
  getAll: () => api.get<ApiResponse<User[]>>('/users').then((r) => r.data),
  getById: (id: string) => api.get<ApiResponse<User>>(`/users/${id}`).then((r) => r.data),
  create: (data: CreateUserRequest) =>
    api.post<ApiResponse<User>>('/users', data).then((r) => r.data),
  update: (id: string, data: CreateUserRequest) =>
    api.put<ApiResponse<User>>(`/users/${id}`, data).then((r) => r.data),
  deactivate: (id: string) => api.delete<ApiResponse<void>>(`/users/${id}`).then((r) => r.data),
  delete: (id: string) => api.delete<ApiResponse<void>>(`/users/${id}/permanent`).then((r) => r.data),
  forceLogout: (userIds: string[]) =>
    api.post<ApiResponse<void>>('/users/force-logout', { userIds }).then((r) => r.data),
}
