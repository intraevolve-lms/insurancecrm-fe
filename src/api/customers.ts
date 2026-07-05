import api from '@/lib/axios'
import type { ApiResponse } from '@/types/api'
import type { Customer, CreateCustomerRequest, BulkAssignResult } from '@/types/customer'

export const customersApi = {
  getAll: () => api.get<ApiResponse<Customer[]>>('/customers').then((r) => r.data),
  search: (q: string) => api.get<ApiResponse<Customer[]>>(`/customers/search?q=${q}`).then((r) => r.data),
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
}
