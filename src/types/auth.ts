export type Role = 'ADMIN' | 'AGENT'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
  createdAt: string
}

export interface AuthResponse {
  token: string
  refreshToken: string
  userId: string
  name: string
  email: string
  role: Role
}

export interface LoginRequest {
  email: string
  password: string
}
