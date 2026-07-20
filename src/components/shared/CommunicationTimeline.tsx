import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import {
  Phone,
  Plus, X, Trash2, Calendar, ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { communicationsApi } from '@/api/communications'
import { useAuthStore } from '@/store/authStore'
import type { CommunicationChannel, CommunicationOutcome, CreateCommunicationLogRequest } from '@/types/communication'

// ── Meta maps ──────────────────────────────────────────────────────────────

export const CHANNEL_META: Record<CommunicationChannel, { label: string; Icon: React.ElementType; color: string; bg: string }> = {
  CALL: { label: 'Call', Icon: Phone, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
}

export const OUTCOME_META: Record<CommunicationOutcome, { label: string; color: string; bg: string }> = {
  MY_CALLBACK: { label: 'My Callback', color: 'text-cyan-700',   bg: 'bg-cyan-50 border-cyan-200' },
  CALLBACK:    { label: 'Callback',    color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  PROSPECT:    { label: 'Prospect',    color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  RINGING:     { label: 'Ringing',     color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  SWITCH_OFF:  { label: 'Switch Off',  color: 'text-gray-500',   bg: 'bg-gray-100 border-gray-200' },
  HANG_UP:     { label: 'Hang Up',     color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  NEXT_YEAR:   { label: 'Next Year',   color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  SALE_CLOSE:  { label: 'Sale Close',  color: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-200' },
  LANGUAGE_ISSUE: { label: 'Language Issue', color: 'text-pink-700', bg: 'bg-pink-50 border-pink-200' },
}

const OUTCOMES = Object.keys(OUTCOME_META) as CommunicationOutcome[]

const EMPTY_FORM: CreateCommunicationLogRequest = {
  channel: 'CALL',
  outcome: 'RINGING',
  notes: '',
  followUpDate: undefined,
}

// ── Log Activity Dialog ────────────────────────────────────────────────────

function LogActivityDialog({ open, onOpenChange, onSave, loading }: {
  open: boolean; onOpenChange: (v: boolean) => void
  onSave: (d: CreateCommunicationLogRequest) => void; loading: boolean
}) {
  const [form, setForm] = useState<CreateCommunicationLogRequest>(EMPTY_FORM)
  const set = <K extends keyof CreateCommunicationLogRequest>(k: K, v: CreateCommunicationLogRequest[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) setForm(EMPTY_FORM); onOpenChange(v) }}>
      <Dialog.Portal>
        <Dialog.Overlay className="hs-dialog-overlay" />
        <Dialog.Content className="hs-dialog-panel sm:max-w-lg">
          <div className="hs-dialog-header">
            <Dialog.Title className="hs-dialog-title">Log Activity</Dialog.Title>
            <Dialog.Close className="btn-icon"><X className="h-4 w-4" /></Dialog.Close>
          </div>

          <div className="p-5 space-y-4">
            {/* Outcome */}
            <div className="flex flex-col gap-1">
              <label className="form-label">Outcome *</label>
              <select className="form-select" value={form.outcome}
                onChange={(e) => set('outcome', e.target.value as CommunicationOutcome)}>
                {OUTCOMES.map((o) => (
                  <option key={o} value={o}>{OUTCOME_META[o].label}</option>
                ))}
              </select>
            </div>

            {/* Follow-up date & time */}
            <div className="flex flex-col gap-1">
              <label className="form-label">Next Follow-up Date &amp; Time</label>
              <input className="form-input" type="datetime-local" value={form.followUpDate ?? ''}
                onChange={(e) => set('followUpDate', e.target.value || undefined)} />
            </div>

            {/* Remark */}
            <div className="flex flex-col gap-1">
              <label className="form-label">Remark</label>
              <textarea className="form-input resize-none" rows={3} value={form.notes ?? ''}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="What was discussed during this call?" />
            </div>
          </div>

          <div className="hs-dialog-footer">
            <Dialog.Close asChild><button className="btn-secondary">Cancel</button></Dialog.Close>
            <button className="btn-primary" disabled={loading} onClick={() => onSave(form)}>
              {loading
                ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                : <><Plus className="h-4 w-4" /> Save</>}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Timeline ───────────────────────────────────────────────────────────────

interface Props {
  entityType: 'customer' | 'lead'
  entityId: string
  queryKey: string[]
}

export function CommunicationTimeline({ entityType, entityId, queryKey }: Props) {
  const { role, userId } = useAuthStore()
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      entityType === 'customer'
        ? communicationsApi.getByCustomer(entityId)
        : communicationsApi.getByLead(entityId),
  })

  const logs = data?.data ?? []
  const invalidate = () => qc.invalidateQueries({ queryKey })

  const logMutation = useMutation({
    mutationFn: (d: CreateCommunicationLogRequest) =>
      entityType === 'customer'
        ? communicationsApi.logForCustomer(entityId, d)
        : communicationsApi.logForLead(entityId, d),
    onSuccess: () => { toast.success('Activity logged'); setDialogOpen(false); invalidate() },
    onError: () => toast.error('Failed to log activity'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => communicationsApi.delete(id),
    onSuccess: () => { toast.success('Log deleted'); invalidate() },
    onError: () => toast.error('Failed to delete'),
  })

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <p className="section-title">Activity ({logs.length})</p>
        <button onClick={() => setDialogOpen(true)} className="btn-primary py-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Log Activity
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <span className="w-6 h-6 rounded-full border-2 border-[#DFE3EB] border-t-[#0091AE] animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-[#F5F8FA] border border-[#DFE3EB] flex items-center justify-center mb-3">
            <Phone className="h-5 w-5 text-[#B0C1D4]" />
          </div>
          <p className="text-sm font-semibold text-[#33475B] mb-1">No activity logged yet</p>
          <p className="text-xs text-[#516F90] mb-4">Log your first call, message, or meeting</p>
          <button onClick={() => setDialogOpen(true)} className="btn-primary text-xs py-1.5">
            <Plus className="h-3.5 w-3.5" /> Log Activity
          </button>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-[#DFE3EB]" />

          <div className="space-y-3">
            {logs.map((log) => {
              const ch = CHANNEL_META[log.channel]
              const out = OUTCOME_META[log.outcome]
              const isOpen = expanded === log.id
              const canDelete = role === 'ADMIN' || log.loggedBy === userId

              return (
                <div key={log.id} className="relative pl-10">
                  {/* Channel icon on timeline */}
                  <div className={`absolute left-0 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${ch.bg}`}>
                    <ch.Icon className={`h-3.5 w-3.5 ${ch.color}`} />
                  </div>

                  {/* Card */}
                  <div className="hs-card overflow-hidden">
                    {/* Summary row */}
                    <div
                      className="flex items-start justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-[#F5F8FA] transition-colors"
                      onClick={() => setExpanded(isOpen ? null : log.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold ${ch.color}`}>{ch.label}</span>
                          <span className={`hs-badge border ${out.bg} ${out.color}`}>{out.label}</span>
                          {log.followUpDate && (
                            <span className="flex items-center gap-1 text-[11px] text-[#516F90]">
                              <Calendar className="h-3 w-3" /> Follow-up {format(new Date(log.followUpDate), 'dd MMM, h:mm a')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-[#B0C1D4]">
                          <span>{log.loggedByName}</span>
                          <span>·</span>
                          <span>{format(new Date(log.loggedAt), 'dd MMM yyyy, h:mm a')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {canDelete && (
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(log.id) }}
                            className="btn-icon p-1 hover:text-red-500"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <ChevronDown className={`h-4 w-4 text-[#B0C1D4] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    {/* Expanded notes */}
                    {isOpen && log.notes && (
                      <div className="px-4 pb-3 border-t border-[#F5F8FA]">
                        <p className="text-sm text-[#516F90] leading-relaxed pt-2">{log.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <LogActivityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={(d) => logMutation.mutate(d)}
        loading={logMutation.isPending}
      />
    </div>
  )
}
