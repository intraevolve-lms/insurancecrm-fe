import type { PolicyType } from './policy'
import type { CommunicationOutcome } from './communication'

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUOTE_SENT' | 'NEGOTIATING' | 'CONVERTED' | 'LOST'
export type LeadSource = 'REFERRAL' | 'WALK_IN' | 'SOCIAL_MEDIA' | 'WEBSITE' | 'CAMPAIGN' | 'COLD_CALL' | 'OTHER'

export interface Lead {
  id: string
  name: string
  phone: string
  email?: string
  address?: string
  source: LeadSource
  status: LeadStatus
  interestedIn?: PolicyType
  notes?: string
  estimatedPremium?: number
  assignedAgentId?: string
  assignedAgentName?: string
  followUpDate?: string
  lastContactedAt?: string
  lastOutcome?: CommunicationOutcome
  convertedCustomerId?: string
  convertedAt?: string
  lostReason?: string
  createdBy?: string
  createdByName?: string
  createdAt: string
  updatedAt: string
}

export interface LeadSummary {
  statusCounts: Record<LeadStatus, number>
  outcomeCounts: Record<CommunicationOutcome, number>
}

export interface CreateLeadRequest {
  name: string
  phone: string
  email?: string
  address?: string
  source: LeadSource
  interestedIn?: PolicyType
  notes?: string
  estimatedPremium?: number
  assignedAgentId?: string
  followUpDate?: string
}
