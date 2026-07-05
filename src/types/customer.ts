import type { CommunicationOutcome } from './communication'

export interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  address?: string
  notes?: string
  dateOfBirth?: string
  plan?: string
  lastYearPremium?: number
  expiryDate?: string
  assignedAgentId?: string
  assignedAgentName?: string
  lastOutcome?: CommunicationOutcome
  createdAt: string
  updatedAt: string
  lastOpenedAt?: string
  lastOpenedByName?: string
}

export interface CreateCustomerRequest {
  name: string
  phone: string
  email?: string
  address?: string
  notes?: string
  dateOfBirth?: string
  plan?: string
  lastYearPremium?: number
  expiryDate?: string
  assignedAgentId?: string
}

export interface BulkAssignResult {
  agentId: string
  agentName: string
  requestedCount: number
  assignedCount: number
  notFoundCustomerIds: string[]
  customers: Customer[]
}
