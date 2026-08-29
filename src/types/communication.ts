export type CommunicationChannel = 'CALL'
export type CommunicationOutcome =
  | 'MY_CALLBACK'
  | 'CALLBACK'
  | 'PROSPECT'
  | 'RINGING'
  | 'SWITCH_OFF'
  | 'HANG_UP'
  | 'NEXT_YEAR'
  | 'SALE_CLOSE'
  | 'LANGUAGE_ISSUE'
  | 'NOT_INTERESTED'

export interface CommunicationLog {
  id: string
  customerId?: string
  channel: CommunicationChannel
  outcome: CommunicationOutcome
  notes?: string
  followUpDate?: string
  // Sale Close details — present only when outcome is SALE_CLOSE.
  premium?: number
  companyName?: string
  planName?: string
  scheme?: string
  city?: string
  portabilityOrFresh?: string
  tenure?: string
  loggedBy?: string
  loggedByName?: string
  loggedAt: string
}

export interface CreateCommunicationLogRequest {
  channel: CommunicationChannel
  outcome: CommunicationOutcome
  notes?: string
  followUpDate?: string
  premium?: number
  companyName?: string
  planName?: string
  scheme?: string
  city?: string
  portabilityOrFresh?: string
  tenure?: string
}
