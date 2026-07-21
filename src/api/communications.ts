import api from '@/lib/axios'
import type { ApiResponse } from '@/types/api'
import type { CommunicationLog, CreateCommunicationLogRequest } from '@/types/communication'

export const communicationsApi = {
  getByCustomer: (customerId: string) =>
    api.get<ApiResponse<CommunicationLog[]>>(`/customers/${customerId}/communications`).then((r) => r.data),

  logForCustomer: (customerId: string, data: CreateCommunicationLogRequest) =>
    api.post<ApiResponse<CommunicationLog>>(`/customers/${customerId}/communications`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete<ApiResponse<void>>(`/communications/${id}`).then((r) => r.data),
}
