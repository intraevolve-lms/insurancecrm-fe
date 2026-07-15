import api from '@/lib/axios'
import type { ApiResponse, BulkDeleteResult, PagedResponse } from '@/types/api'
import type { Lead, CreateLeadRequest, LeadStatus, LeadSummary } from '@/types/lead'
import type { CommunicationOutcome } from '@/types/communication'

export interface LeadListParams {
  page?: number
  size?: number
  status?: LeadStatus
  outcome?: CommunicationOutcome
  q?: string
}

export const leadsApi = {
  getAll: (params: LeadListParams = {}) =>
    api.get<ApiResponse<PagedResponse<Lead>>>('/leads', { params }).then((r) => r.data),
  getSummary: () => api.get<ApiResponse<LeadSummary>>('/leads/summary').then((r) => r.data),
  getById: (id: string) => api.get<ApiResponse<Lead>>(`/leads/${id}`).then((r) => r.data),
  create: (data: CreateLeadRequest) =>
    api.post<ApiResponse<Lead>>('/leads', data).then((r) => r.data),
  update: (id: string, data: CreateLeadRequest) =>
    api.put<ApiResponse<Lead>>(`/leads/${id}`, data).then((r) => r.data),
  updateStatus: (id: string, status: LeadStatus, lostReason?: string) =>
    api.patch<ApiResponse<Lead>>(`/leads/${id}/status`, { status, lostReason }).then((r) => r.data),
  convert: (id: string) =>
    api.post<ApiResponse<Lead>>(`/leads/${id}/convert`).then((r) => r.data),
  delete: (id: string) =>
    api.delete<ApiResponse<void>>(`/leads/${id}`).then((r) => r.data),
  bulkDelete: (ids: string[]) =>
    api.delete<ApiResponse<BulkDeleteResult>>('/leads/bulk-delete', { data: { ids } }).then((r) => r.data),
}
