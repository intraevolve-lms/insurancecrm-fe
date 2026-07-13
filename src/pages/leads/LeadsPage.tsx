import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import {
  Plus, X, Search, Pencil, Trash2, UserCheck,
  Phone, Mail, Calendar, TrendingUp, ArrowRight,
  AlertCircle, MessageSquare,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { leadsApi } from '@/api/leads'
import { usersApi } from '@/api/users'
import { useAuthStore } from '@/store/authStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { CommunicationTimeline, OUTCOME_META } from '@/components/shared/CommunicationTimeline'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import type { Lead, CreateLeadRequest, LeadStatus, LeadSource } from '@/types/lead'
import type { PolicyType } from '@/types/policy'
import type { CommunicationOutcome } from '@/types/communication'

// ── Constants ──────────────────────────────────────────────────────────────

const STATUSES: { value: LeadStatus; label: string; color: string; bg: string; dot: string }[] = [
  { value: 'NEW',         label: 'New',          color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',   dot: 'bg-blue-500' },
  { value: 'CONTACTED',   label: 'Contacted',    color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', dot: 'bg-yellow-500' },
  { value: 'QUOTE_SENT',  label: 'Quote Sent',   color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', dot: 'bg-purple-500' },
  { value: 'NEGOTIATING', label: 'Negotiating',  color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', dot: 'bg-orange-500' },
  { value: 'CONVERTED',   label: 'Converted',    color: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  { value: 'LOST',        label: 'Lost',         color: 'text-red-600',    bg: 'bg-red-50 border-red-200',     dot: 'bg-red-400' },
]

const SOURCES: LeadSource[] = ['REFERRAL','WALK_IN','SOCIAL_MEDIA','WEBSITE','CAMPAIGN','COLD_CALL','OTHER']
const POLICY_TYPES: PolicyType[] = ['MOTOR','HEALTH','LIFE','TRAVEL','OTHER']

// Excludes SALE_CLOSE — once closed, the lead is converted to a customer
const LEAD_OUTCOMES: CommunicationOutcome[] = [
  'MY_CALLBACK', 'CALLBACK', 'PROSPECT', 'RINGING', 'SWITCH_OFF', 'HANG_UP', 'NEXT_YEAR',
]

const EMPTY_FORM: CreateLeadRequest = {
  name: '', phone: '', email: '', address: '',
  source: 'REFERRAL', notes: '', estimatedPremium: undefined,
  assignedAgentId: '', followUpDate: '',
}

function statusMeta(s: LeadStatus) {
  return STATUSES.find((x) => x.value === s) ?? STATUSES[0]
}

// ── Lead form dialog ────────────────────────────────────────────────────────

function LeadFormDialog({ open, onOpenChange, initial, onSave, loading, agents }: {
  open: boolean; onOpenChange: (v: boolean) => void
  initial?: Lead | null; onSave: (d: CreateLeadRequest) => void
  loading: boolean; agents: { id: string; name: string; role: string }[]
}) {
  const { role } = useAuthStore()
  const [form, setForm] = useState<CreateLeadRequest>(EMPTY_FORM)

  const resetForm = (l?: Lead | null) => setForm(l ? {
    name: l.name, phone: l.phone, email: l.email ?? '',
    address: l.address ?? '', source: l.source, interestedIn: l.interestedIn,
    notes: l.notes ?? '', estimatedPremium: l.estimatedPremium,
    assignedAgentId: l.assignedAgentId ?? '', followUpDate: l.followUpDate ?? '',
  } : EMPTY_FORM)

  const set = <K extends keyof CreateLeadRequest>(k: K, v: CreateLeadRequest[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  // Reset form when dialog opens with new initial value
  useState(() => { if (open) resetForm(initial) })

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v) }}>
      <Dialog.Portal>
        <Dialog.Overlay className="hs-dialog-overlay" />
        <Dialog.Content className="hs-dialog-panel sm:max-w-xl">
          <div className="hs-dialog-header">
            <Dialog.Title className="hs-dialog-title">
              {initial ? 'Edit Lead' : 'Add Lead'}
            </Dialog.Title>
            <Dialog.Close className="btn-icon"><X className="h-4 w-4" /></Dialog.Close>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1 flex flex-col gap-1">
                <label className="form-label">Name *</label>
                <input className="form-input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Full name" />
              </div>
              <div className="col-span-2 sm:col-span-1 flex flex-col gap-1">
                <label className="form-label">Phone *</label>
                <input className="form-input" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="9876543210" />
              </div>
              <div className="col-span-2 sm:col-span-1 flex flex-col gap-1">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="email@example.com" />
              </div>
              <div className="col-span-2 sm:col-span-1 flex flex-col gap-1">
                <label className="form-label">Lead Source *</label>
                <select className="form-select" value={form.source} onChange={(e) => set('source', e.target.value as LeadSource)}>
                  {SOURCES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1 flex flex-col gap-1">
                <label className="form-label">Interested In</label>
                <select className="form-select" value={form.interestedIn ?? ''} onChange={(e) => set('interestedIn', (e.target.value as PolicyType) || undefined)}>
                  <option value="">Select policy type…</option>
                  {POLICY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1 flex flex-col gap-1">
                <label className="form-label">Est. Premium (₹)</label>
                <input className="form-input" type="number" min={0}
                  value={form.estimatedPremium ?? ''} placeholder="0"
                  onChange={(e) => set('estimatedPremium', e.target.value ? parseFloat(e.target.value) : undefined)} />
              </div>
              <div className="col-span-2 sm:col-span-1 flex flex-col gap-1">
                <label className="form-label">Follow-up Date &amp; Time</label>
                <input className="form-input" type="datetime-local" value={form.followUpDate ?? ''} onChange={(e) => set('followUpDate', e.target.value || undefined)} />
              </div>
              {role === 'ADMIN' && (
              <div className="col-span-2 sm:col-span-1 flex flex-col gap-1">
                <label className="form-label">Assign To Agent</label>
                <select className="form-select" value={form.assignedAgentId ?? ''} onChange={(e) => set('assignedAgentId', e.target.value || undefined)}>
                  <option value="">Unassigned</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.role})</option>)}
                </select>
              </div>
              )}
              <div className="col-span-2 flex flex-col gap-1">
                <label className="form-label">Notes</label>
                <textarea className="form-input resize-none" rows={2} value={form.notes}
                  onChange={(e) => set('notes', e.target.value)} placeholder="Any additional context…" />
              </div>
            </div>
          </div>
          <div className="hs-dialog-footer">
            <Dialog.Close asChild><button className="btn-secondary">Cancel</button></Dialog.Close>
            <button className="btn-primary" disabled={loading}
              onClick={() => { if (!form.name || !form.phone) { toast.error('Name and Phone required'); return } onSave(form) }}>
              {loading ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : initial ? 'Save Changes' : 'Add Lead'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Lost reason dialog ──────────────────────────────────────────────────────

function LostReasonDialog({ open, onOpenChange, onConfirm, loading }: {
  open: boolean; onOpenChange: (v: boolean) => void
  onConfirm: (reason: string) => void; loading: boolean
}) {
  const [reason, setReason] = useState('')
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="hs-dialog-overlay" />
        <Dialog.Content className="hs-dialog-panel sm:max-w-sm">
          <div className="hs-dialog-header">
            <Dialog.Title className="hs-dialog-title">Mark as Lost</Dialog.Title>
            <Dialog.Close className="btn-icon"><X className="h-4 w-4" /></Dialog.Close>
          </div>
          <div className="p-5">
            <label className="form-label mb-1.5 block">Reason for losing this lead</label>
            <select className="form-select w-full" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Select reason…</option>
              <option value="Too expensive">Too expensive</option>
              <option value="Went with competitor">Went with competitor</option>
              <option value="Not interested">Not interested</option>
              <option value="Not reachable">Not reachable</option>
              <option value="Deferred purchase">Deferred purchase</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="hs-dialog-footer">
            <Dialog.Close asChild><button className="btn-secondary">Cancel</button></Dialog.Close>
            <button className="btn-danger" disabled={!reason || loading}
              onClick={() => { onConfirm(reason); setReason('') }}>
              {loading ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : 'Mark Lost'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { role } = useAuthStore()
  const qc = useQueryClient()

  const [search, setSearch]             = useState('')
  const [activeTab, setActiveTab]       = useState<LeadStatus | 'ALL'>(() => (searchParams.get('status') as LeadStatus) || 'ALL')
  const [outcomeFilter, setOutcomeFilter] = useState<CommunicationOutcome | null>(() => (searchParams.get('outcome') as CommunicationOutcome) || null)
  const [formOpen, setFormOpen]         = useState(false)
  const [editing, setEditing]           = useState<Lead | null>(null)
  const [deleteTarget, setDeleteTarget]   = useState<Lead | null>(null)
  const [lostTarget, setLostTarget]       = useState<Lead | null>(null)
  const [convertTarget, setConvert]       = useState<Lead | null>(null)
  const [activityLeadId, setActivityLead] = useState<string | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ['leads'], queryFn: leadsApi.getAll })
  const { data: usersData } = useQuery({ queryKey: ['users'], queryFn: usersApi.getAll, enabled: role === 'ADMIN' })

  const allLeads: Lead[] = data?.data ?? []
  const agents = (usersData?.data ?? []).filter((u) => u.active)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['leads'] })

  const createMutation = useMutation({
    mutationFn: (d: CreateLeadRequest) => leadsApi.create(d),
    onSuccess: () => { toast.success('Lead added'); setFormOpen(false); invalidate() },
    onError: () => toast.error('Failed to add lead'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateLeadRequest }) => leadsApi.update(id, data),
    onSuccess: () => { toast.success('Lead updated'); setFormOpen(false); setEditing(null); invalidate() },
    onError: () => toast.error('Failed to update lead'),
  })
  const statusMutation = useMutation({
    mutationFn: ({ id, status, lostReason }: { id: string; status: LeadStatus; lostReason?: string }) =>
      leadsApi.updateStatus(id, status, lostReason),
    onSuccess: () => { toast.success('Status updated'); setLostTarget(null); invalidate() },
    onError: () => toast.error('Failed to update status'),
  })
  const convertMutation = useMutation({
    mutationFn: (id: string) => leadsApi.convert(id),
    onSuccess: (res) => {
      toast.success('Lead converted to customer!')
      setConvert(null)
      invalidate()
      qc.invalidateQueries({ queryKey: ['customers'] })
      if (res.data?.convertedCustomerId) navigate(`/customers/${res.data.convertedCustomerId}`)
    },
    onError: () => toast.error('Conversion failed'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => leadsApi.delete(id),
    onSuccess: () => { toast.success('Lead deleted'); setDeleteTarget(null); invalidate() },
    onError: () => toast.error('Failed to delete lead'),
  })

  const clearOutcomeFilter = () => {
    setOutcomeFilter(null)
    const next = new URLSearchParams(searchParams)
    next.delete('outcome')
    setSearchParams(next, { replace: true })
  }

  // Filter
  const filtered = allLeads.filter((l) => {
    const matchTab = activeTab === 'ALL' || l.status === activeTab
    const matchOutcome = !outcomeFilter
      || (l.lastOutcome === outcomeFilter && l.status !== 'CONVERTED' && l.status !== 'LOST')
    const q = search.toLowerCase()
    const matchSearch = !q || l.name.toLowerCase().includes(q) || l.phone.includes(q)
    return matchTab && matchOutcome && matchSearch
  })

  // Pipeline counts
  const counts = STATUSES.reduce((acc, s) => {
    acc[s.value] = allLeads.filter((l) => l.status === s.value).length
    return acc
  }, {} as Record<LeadStatus, number>)

  // Outcome funnel counts — scoped to active leads, same as the outcome filter itself
  const outcomeCounts = LEAD_OUTCOMES.reduce((acc, o) => {
    acc[o] = allLeads.filter((l) => l.lastOutcome === o && l.status !== 'CONVERTED' && l.status !== 'LOST').length
    return acc
  }, {} as Record<CommunicationOutcome, number>)

  const toggleOutcomeFilter = (o: CommunicationOutcome) => {
    const next = outcomeFilter === o ? null : o
    setOutcomeFilter(next)
    const params = new URLSearchParams(searchParams)
    if (next) params.set('outcome', next)
    else params.delete('outcome')
    setSearchParams(params, { replace: true })
  }

  const openEdit = (l: Lead) => { setEditing(l); setFormOpen(true) }

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Track prospects through the sales pipeline"
        action={
          <button onClick={() => { setEditing(null); setFormOpen(true) }} className="btn-primary">
            <Plus className="h-4 w-4" /> Add Lead
          </button>
        }
      />

      {/* Pipeline summary bar */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-5">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => setActiveTab(activeTab === s.value ? 'ALL' : s.value)}
            className={`rounded-lg border p-3 text-left transition-all duration-100 ${
              activeTab === s.value ? s.bg + ' ring-1 ring-offset-1 ring-current' : 'bg-white border-[#DFE3EB] hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className={`text-[11px] font-semibold uppercase tracking-wide ${activeTab === s.value ? s.color : 'text-[#516F90]'}`}>
                {s.label}
              </span>
            </div>
            <p className={`text-xl font-extrabold ${activeTab === s.value ? s.color : 'text-[#33475B]'}`}>
              {counts[s.value] ?? 0}
            </p>
          </button>
        ))}
      </div>

      {/* Outcome funnel summary bar */}
      <div className="grid grid-cols-3 md:grid-cols-7 gap-3 mb-5">
        {LEAD_OUTCOMES.map((o) => (
          <button
            key={o}
            onClick={() => toggleOutcomeFilter(o)}
            className={`rounded-lg border p-3 text-left transition-all duration-100 ${
              outcomeFilter === o ? OUTCOME_META[o].bg + ' ring-1 ring-offset-1 ring-current' : 'bg-white border-[#DFE3EB] hover:border-gray-300'
            }`}
          >
            <p className={`text-[11px] font-semibold uppercase tracking-wide mb-1 ${outcomeFilter === o ? OUTCOME_META[o].color : 'text-[#516F90]'}`}>
              {OUTCOME_META[o].label}
            </p>
            <p className={`text-xl font-extrabold ${outcomeFilter === o ? OUTCOME_META[o].color : 'text-[#33475B]'}`}>
              {outcomeCounts[o] ?? 0}
            </p>
          </button>
        ))}
      </div>

      {/* Outcome filter banner — confirms the active filter, however it was set (tile click or URL) */}
      {outcomeFilter && (
        <div className="flex items-center justify-between rounded-lg bg-[#E5F5F8] border border-[#0091AE]/20 px-4 py-2.5 mb-4">
          <p className="text-sm font-semibold text-[#0091AE]">
            Filtered by outcome: {OUTCOME_META[outcomeFilter].label}
          </p>
          <button onClick={clearOutcomeFilter} className="btn-secondary text-xs px-3 py-1.5">
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#B0C1D4]" />
        <input className="form-input pl-9" placeholder="Search leads…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-24" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<TrendingUp className="h-6 w-6" />}
          title={activeTab === 'ALL' ? 'No leads yet' : `No ${statusMeta(activeTab as LeadStatus).label} leads`}
          description="Add your first lead to start tracking your pipeline"
          action={<button onClick={() => { setEditing(null); setFormOpen(true) }} className="btn-primary"><Plus className="h-4 w-4" /> Add Lead</button>}
        />
      ) : (
        <div className="hs-table-wrap">
          <table className="hs-table">
            <thead>
              <tr>
                <th className="hs-th">Lead</th>
                <th className="hs-th">Contact</th>
                <th className="hs-th">Source</th>
                <th className="hs-th">Interested In</th>
                <th className="hs-th">Est. Premium</th>
                <th className="hs-th">Status</th>
                <th className="hs-th">Follow-up</th>
                <th className="hs-th">Assigned To</th>
                <th className="hs-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => {
                const meta = statusMeta(lead.status)
                const isOverdue = lead.followUpDate && new Date(lead.followUpDate) < new Date() && lead.status !== 'CONVERTED' && lead.status !== 'LOST'
                return (
                  <React.Fragment key={lead.id}>
                  <tr className="hs-tr">
                    {/* Lead name + notes */}
                    <td className="hs-td">
                      <p className="font-semibold text-[#33475B] leading-tight">{lead.name}</p>
                      {lead.notes && (
                        <p className="text-xs text-[#516F90] mt-0.5 max-w-[160px] truncate" title={lead.notes}>
                          {lead.notes}
                        </p>
                      )}
                    </td>

                    {/* Contact */}
                    <td className="hs-td">
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-1 text-xs text-[#516F90]">
                          <Phone className="h-3 w-3" /> {lead.phone}
                        </span>
                        {lead.email && (
                          <span className="flex items-center gap-1 text-xs text-[#516F90]">
                            <Mail className="h-3 w-3" /> {lead.email}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="hs-td">
                      <span className="text-xs font-medium text-[#516F90] bg-[#F5F8FA] border border-[#DFE3EB] rounded-full px-2 py-0.5">
                        {lead.source.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="hs-td text-sm text-[#516F90]">{lead.interestedIn ?? '—'}</td>

                    <td className="hs-td text-sm text-[#33475B] font-medium">
                      {lead.estimatedPremium ? `₹${lead.estimatedPremium.toLocaleString('en-IN')}` : '—'}
                    </td>

                    {/* Status badge + next-step dropdown (not for CONVERTED/LOST) */}
                    <td className="hs-td">
                      <div className="flex flex-col gap-1">
                        <span className={`hs-badge border ${meta.bg} ${meta.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                        {lead.status !== 'CONVERTED' && lead.status !== 'LOST' && (
                          <select
                            className="text-[11px] border border-[#DFE3EB] rounded px-1.5 py-0.5 bg-white text-[#516F90] outline-none cursor-pointer hover:border-[#0091AE] transition"
                            value=""
                            onChange={(e) => {
                              const next = e.target.value as LeadStatus
                              if (next === 'LOST') { setLostTarget(lead); return }
                              statusMutation.mutate({ id: lead.id, status: next })
                            }}
                          >
                            <option value="" disabled>Move to…</option>
                            {STATUSES.filter((s) => s.value !== lead.status && s.value !== 'CONVERTED').map((s) => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        )}
                        {lead.status === 'LOST' && lead.lostReason && (
                          <span className="text-[11px] text-red-500 truncate max-w-[120px]" title={lead.lostReason}>
                            {lead.lostReason}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Follow-up date */}
                    <td className="hs-td whitespace-nowrap">
                      {lead.followUpDate ? (
                        <span className={`flex items-center gap-1 text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-[#516F90]'}`}>
                          {isOverdue && <AlertCircle className="h-3 w-3" />}
                          <Calendar className="h-3 w-3" />
                          {format(new Date(lead.followUpDate), 'dd MMM, h:mm a')}
                        </span>
                      ) : <span className="text-[#B0C1D4] text-xs">—</span>}
                    </td>

                    {/* Assigned agent */}
                    <td className="hs-td">
                      {lead.assignedAgentName ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-[#516F90]">
                          <UserCheck className="h-3 w-3 text-[#0091AE]" />
                          {lead.assignedAgentName}
                        </span>
                      ) : <span className="text-[#B0C1D4] text-xs italic">Unassigned</span>}
                    </td>

                    {/* Actions */}
                    <td className="hs-td">
                      <div className="flex items-center gap-1">
                        {/* Activity log toggle */}
                        <button
                          onClick={() => setActivityLead(activityLeadId === lead.id ? null : lead.id)}
                          className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition ${
                            activityLeadId === lead.id
                              ? 'bg-[#E5F5F8] text-[#0091AE]'
                              : 'text-[#516F90] hover:bg-[#F5F8FA]'
                          }`}
                          title="Activity Log"
                        >
                          <MessageSquare className="h-3.5 w-3.5" /> Activity
                        </button>
                        {/* Convert button — most important CTA */}
                        {lead.status !== 'CONVERTED' && lead.status !== 'LOST' && (
                          <button
                            onClick={() => setConvert(lead)}
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition whitespace-nowrap"
                          >
                            <ArrowRight className="h-3 w-3" /> Convert
                          </button>
                        )}
                        {lead.status === 'CONVERTED' && lead.convertedCustomerId && (
                          <button
                            onClick={() => navigate(`/customers/${lead.convertedCustomerId}`)}
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[#0091AE] hover:bg-[#E5F5F8] transition whitespace-nowrap"
                          >
                            View Customer
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(lead)}
                          className="btn-icon p-1.5"
                          title="Edit"
                          disabled={lead.status === 'CONVERTED'}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {role === 'ADMIN' && (
                          <button onClick={() => setDeleteTarget(lead)} className="btn-icon p-1.5 hover:text-red-500" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expandable activity panel */}
                  {activityLeadId === lead.id && (
                    <tr>
                      <td colSpan={9} className="bg-[#F5F8FA] px-6 py-4 border-b border-[#DFE3EB]">
                        <CommunicationTimeline
                          entityType="lead"
                          entityId={lead.id}
                          queryKey={['lead-comms', lead.id]}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Lead form */}
      <LeadFormDialog
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditing(null) }}
        initial={editing}
        agents={agents}
        loading={createMutation.isPending || updateMutation.isPending}
        onSave={(d) => editing ? updateMutation.mutate({ id: editing.id, data: d }) : createMutation.mutate(d)}
      />

      {/* Convert confirm */}
      <ConfirmDialog
        open={!!convertTarget}
        onOpenChange={(v) => { if (!v) setConvert(null) }}
        title="Convert to Customer"
        description={`This will create a new customer record for "${convertTarget?.name}" and mark this lead as Converted. This cannot be undone.`}
        onConfirm={() => convertTarget && convertMutation.mutate(convertTarget.id)}
        loading={convertMutation.isPending}
      />

      {/* Lost reason dialog */}
      <LostReasonDialog
        open={!!lostTarget}
        onOpenChange={(v) => { if (!v) setLostTarget(null) }}
        loading={statusMutation.isPending}
        onConfirm={(reason) => lostTarget && statusMutation.mutate({ id: lostTarget.id, status: 'LOST', lostReason: reason })}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}
        title="Delete Lead"
        description={`Permanently delete "${deleteTarget?.name}"?`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        destructive
      />
    </div>
  )
}
