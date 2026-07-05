export type ReminderType = 'LEAD_FOLLOWUP' | 'COMMUNICATION_FOLLOWUP'

export interface Reminder {
  id: string
  type: ReminderType
  entityId?: string
  entityName: string
  description: string
  dueDate: string
  overdueDays: number
  assignedToId?: string
  assignedToName?: string
}
