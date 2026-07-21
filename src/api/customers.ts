import api from '@/lib/axios'
import type { ApiResponse, BulkDeleteResult, PagedResponse } from '@/types/api'
import type { Customer, CreateCustomerRequest, BulkAssignResult } from '@/types/customer'
import type { CommunicationOutcome } from '@/types/communication'

export interface CustomerListParams {
  page?: number
  size?: number
  sortBy?: 'premium' | 'expiryDate'
  sortDir?: 'asc' | 'desc'
  outcome?: CommunicationOutcome
}

export interface NewCustomersParams {
  page?: number
  size?: number
}

export const customersApi = {
  getAll: (params: CustomerListParams = {}) =>
    api.get<ApiResponse<PagedResponse<Customer>>>('/customers', { params }).then((r) => r.data),
  getNew: (params: NewCustomersParams = {}) =>
    api.get<ApiResponse<PagedResponse<Customer>>>('/customers/new', { params }).then((r) => r.data),
  search: (q: string, params: CustomerListParams = {}) =>
    api.get<ApiResponse<PagedResponse<Customer>>>('/customers/search', { params: { q, ...params } }).then((r) => r.data),
  getById: (id: string) => api.get<ApiResponse<Customer>>(`/customers/${id}`).then((r) => r.data),
  create: (data: CreateCustomerRequest) =>
    api.post<ApiResponse<Customer>>('/customers', data).then((r) => r.data),
  update: (id: string, data: CreateCustomerRequest) =>
    api.put<ApiResponse<Customer>>(`/customers/${id}`, data).then((r) => r.data),
  assignAgent: (customerId: string, agentId: string) =>
    api.patch<ApiResponse<Customer>>(`/customers/${customerId}/assign/${agentId}`).then((r) => r.data),
  bulkAssignAgent: (customerIds: string[], agentId: string) =>
    api.patch<ApiResponse<BulkAssignResult>>('/customers/bulk-assign', { customerIds, agentId }).then((r) => r.data),
  delete: (id: string) => api.delete<ApiResponse<void>>(`/customers/${id}`).then((r) => r.data),
  bulkDelete: (ids: string[]) =>
    api.delete<ApiResponse<BulkDeleteResult>>('/customers/bulk-delete', { data: { ids } }).then((r) => r.data),
}
