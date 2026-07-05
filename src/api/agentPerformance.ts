import api from '@/lib/axios'
import type { ApiResponse } from '@/types/api'
import type { AgentPerformance } from '@/types/agentPerformance'

export const agentPerformanceApi = {
  getAll: () => api.get<ApiResponse<AgentPerformance[]>>('/agent-performance').then((r) => r.data),
}
