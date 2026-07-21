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
  loggedBy?: string
  loggedByName?: string
  loggedAt: string
}

export interface CreateCommunicationLogRequest {
  channel: CommunicationChannel
  outcome: CommunicationOutcome
  notes?: string
  followUpDate?: string
}
