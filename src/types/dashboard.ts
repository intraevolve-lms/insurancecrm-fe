import type { CommunicationOutcome } from './communication'

export interface DashboardSummary {
  totalCustomers: number
  outcomeCounts: Partial<Record<CommunicationOutcome, number>>
}
