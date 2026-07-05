import api from '@/lib/axios'
import type { ApiResponse } from '@/types/api'
import type { Reminder } from '@/types/reminder'

export const remindersApi = {
  getAll: () => api.get<ApiResponse<Reminder[]>>('/reminders').then((r) => r.data),
}
