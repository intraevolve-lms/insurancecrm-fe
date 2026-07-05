import api from '@/lib/axios'
import type { ApiResponse } from '@/types/api'

export interface ImportResult {
  totalRows: number
  successCount: number
  createdCount: number
  updatedCount: number
  failureCount: number
  errors: { row: number; data: string; message: string }[]
}

export const importApi = {
  importCustomers: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<ApiResponse<ImportResult>>('/import/customers', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },
}
