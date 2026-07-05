import api from '@/lib/axios'
import type { ApiResponse } from '@/types/api'
import type { Lead, CreateLeadRequest, LeadStatus } from '@/types/lead'

export const leadsApi = {
  getAll: () => api.get<ApiResponse<Lead[]>>('/leads').then((r) => r.data),
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
}
