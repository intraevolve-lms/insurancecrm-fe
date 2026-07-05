import api from '@/lib/axios'
import type { ApiResponse } from '@/types/api'
import type { DashboardSummary } from '@/types/dashboard'

export const dashboardApi = {
  getSummary: () => api.get<ApiResponse<DashboardSummary>>('/dashboard/summary').then((r) => r.data),
}
