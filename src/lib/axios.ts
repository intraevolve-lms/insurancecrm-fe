import axios from 'axios'
import { useAuthStore } from '@/store/authStore'
import { queryClient } from '@/lib/queryClient'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

function logoutAndRedirect() {
  useAuthStore.getState().logout()
  queryClient.clear()
  window.location.href = '/login'
}

// Dedupes concurrent 401s (e.g. several queries firing at once) into a single
// in-flight refresh call — every caller awaits the same promise.
let refreshPromise: Promise<string> | null = null

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    const refreshToken = useAuthStore.getState().refreshToken
    refreshPromise = !refreshToken
      ? Promise.reject(new Error('No refresh token available'))
      : api
          .post('/auth/refresh', { refreshToken })
          .then((res) => {
            const { token, refreshToken: newRefreshToken } = res.data.data
            useAuthStore.getState().setTokens({ token, refreshToken: newRefreshToken })
            return token as string
          })
          .finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status
    const isAuthEndpoint = originalRequest?.url?.startsWith('/auth/')

    // Login/refresh failures are handled by their own callers — never auto-logout for these.
    if (isAuthEndpoint) {
      return Promise.reject(error)
    }

    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const newToken = await refreshAccessToken()
        originalRequest.headers = originalRequest.headers ?? {}
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch {
        logoutAndRedirect()
        return Promise.reject(error)
      }
    }

    if (status === 401) {
      logoutAndRedirect()
    }

    return Promise.reject(error)
  },
)

export default api
