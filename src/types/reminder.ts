export type ReminderType = 'COMMUNICATION_FOLLOWUP'
export type ReminderEntityKind = 'CUSTOMER'

export interface Reminder {
  id: string
  type: ReminderType
  entityId?: string
  entityKind: ReminderEntityKind
  entityName: string
  description: string
  dueDate: string
  overdueDays: number
  assignedToId?: string
  assignedToName?: string
}
