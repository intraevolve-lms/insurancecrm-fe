import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import { Plus, Search, Eye, Pencil, Trash2, X, UserCircle, UserCog, Upload, Download, UserCheck, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { customersApi } from '@/api/customers'
import { usersApi } from '@/api/users'
import { exportApi } from '@/api/export'
import { useAuthStore } from '@/store/authStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ImportDialog } from '@/components/shared/ImportDialog'
import { BulkAssignDialog } from '@/components/customers/BulkAssignDialog'
import { Pagination } from '@/components/shared/Pagination'
import { OUTCOME_META } from '@/components/shared/CommunicationTimeline'
import type { Customer, CreateCustomerRequest } from '@/types/customer'
import type { CommunicationOutcome } from '@/types/communication'

const PAGE_SIZE = 20

const EMPTY_FORM: CreateCustomerRequest = {
  name: '', phone: '', email: '', address: '', notes: '',
  dateOfBirth: undefined, plan: '', lastYearPremium: undefined, expiryDate: undefined,
}

function CustomerFormDialog({ open, onOpenChange, initial, onSave, loading }: {
  open: boolean; onOpenChange: (v: boolean) => void
  initial?: Customer | null; onSave: (data: CreateCustomerRequest) => void; loading: boolean
}) {
  const [form, setForm] = useState<CreateCustomerRequest>(EMPTY_FORM)

  useEffect(() => {
    if (open) {
      setForm(initial ? {
        name: initial.name, phone: initial.phone,
        email: initial.email ?? '', address: initial.address ?? '', notes: initial.notes ?? '',
        dateOfBirth: initial.dateOfBirth, plan: initial.plan ?? '',
        lastYearPremium: initial.lastYearPremium, expiryDate: initial.expiryDate,
      } : EMPTY_FORM)
    }
  }, [open, initial])

  const set = (k: keyof CreateCustomerRequest, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const setDate = (k: 'dateOfBirth' | 'expiryDate', v: string) => setForm((f) => ({ ...f, [k]: v || undefined }))
  const setPremium = (v: string) => setForm((f) => ({ ...f, lastYearPremium: v ? parseFloat(v) : undefined }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) { toast.error('Name and Phone are required'); return }
    onSave(form)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="hs-dialog-overlay" />
        <Dialog.Content className="hs-dialog-panel sm:max-w-lg">
          <div className="hs-dialog-header">
            <Dialog.Title className="hs-dialog-title">{initial ? 'Edit Customer' : 'Create Customer'}</Dialog.Title>
            <Dialog.Close className="btn-ghost btn-icon"><X className="h-5 w-5" /></Dialog.Close>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 p-5">
            <div className="flex flex-col gap-1">
              <label className="form-label">Name *</label>
              <input className="form-input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Full name" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="form-label">Phone *</label>
              <input className="form-input" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="form-label">Address</label>
              <input className="form-input" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Street, City" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="form-label">Date of Birth</label>
                <input className="form-input" type="date" value={form.dateOfBirth ?? ''} onChange={(e) => setDate('dateOfBirth', e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="form-label">Expiry Date</label>
                <input className="form-input" type="date" value={form.expiryDate ?? ''} onChange={(e) => setDate('expiryDate', e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="form-label">Plan</label>
                <input className="form-input" value={form.plan ?? ''} onChange={(e) => set('plan', e.target.value)} placeholder="e.g. AS F G+ 10L PD4 2A2C" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="form-label">Last Year Premium (₹)</label>
                <input className="form-input" type="number" min={0} value={form.lastYearPremium ?? ''} onChange={(e) => setPremium(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="form-label">Notes</label>
              <textarea className="form-input resize-none" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Additional notes…" />
            </div>
            <div className="hs-dialog-footer">
              <Dialog.Close asChild><button type="button" className="btn-secondary">Cancel</button></Dialog.Close>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : initial ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default function CustomersPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { role, userId } = useAuthStore()
  const qc = useQueryClient()

  const [outcomeFilter, setOutcomeFilter] = useState<CommunicationOutcome | null>(() => (searchParams.get('outcome') as CommunicationOutcome) || null)
  const [search, setSearch]               = useState('')
  const [debouncedSearch, setDebounced]   = useState('')
  const debounceRef                       = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [dialogOpen, setDialogOpen]       = useState(false)
  const [editingCustomer, setEditing]     = useState<Customer | null>(null)
  const [deleteTarget, setDeleteTarget]   = useState<Customer | null>(null)
  const [assignTarget, setAssignTarget]   = useState<Customer | null>(null)
  const [selectedAgentId, setAgentId]     = useState('')
  const [importOpen, setImportOpen]       = useState(false)
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set())
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [exportAgentId, setExportAgentId] = useState('')
  const [page, setPage]                   = useState(0)
  const [sortField, setSortField]         = useState<'premium' | 'expiryDate' | null>(null)
  const [sortDir, setSortDir]             = useState<'asc' | 'desc'>('asc')
  const headerCheckboxRef                 = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebounced(search), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  useEffect(() => {
    setSelectedIds(new Set())
    setPage(0)
  }, [debouncedSearch, outcomeFilter, sortField, sortDir])

  const listParams = {
    page, size: PAGE_SIZE,
    sortBy: sortField ?? undefined, sortDir,
    outcome: outcomeFilter ?? undefined,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['customers', userId, debouncedSearch, page, sortField, sortDir, outcomeFilter],
    queryFn: () => debouncedSearch.trim()
      ? customersApi.search(debouncedSearch.trim(), listParams)
      : customersApi.getAll(listParams),
  })

  const { data: agentsData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
    enabled: role === 'ADMIN',
  })
  const agents = (agentsData?.data ?? []).filter((u) => u.active)

  const toggleSort = (field: 'premium' | 'expiryDate') => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
  }

  const customers: Customer[] = data?.data.content ?? []
  const totalElements = data?.data.totalElements ?? 0
  const totalPages = data?.data.totalPages ?? 0

  const clearOutcomeFilter = () => {
    setOutcomeFilter(null)
    const next = new URLSearchParams(searchParams)
    next.delete('outcome')
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    const visibleIds = new Set(customers.map((c) => c.id))
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => visibleIds.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [customers])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['customers'] })

  const toggleAll = () => {
    setSelectedIds((prev) =>
      prev.size === customers.length ? new Set() : new Set(customers.map((c) => c.id))
    )
  }
  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate =
        selectedIds.size > 0 && selectedIds.size < customers.length
    }
  }, [selectedIds, customers.length])

  const createMutation = useMutation({
    mutationFn: (d: CreateCustomerRequest) => customersApi.create(d),
    onSuccess: () => { toast.success('Customer created'); setDialogOpen(false); invalidate() },
    onError: () => toast.error('Failed to create customer'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateCustomerRequest }) => customersApi.update(id, data),
    onSuccess: () => { toast.success('Customer updated'); setDialogOpen(false); invalidate() },
    onError: () => toast.error('Failed to update customer'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersApi.delete(id),
    onSuccess: () => {
      toast.success('Customer deleted')
      setDeleteTarget(null)
      // Deleting the only row on a non-first page would otherwise strand the view on an empty page.
      if (customers.length === 1 && page > 0) setPage((p) => p - 1)
      invalidate()
    },
    onError: () => toast.error('Failed to delete customer'),
  })
  const assignMutation = useMutation({
    mutationFn: ({ customerId, agentId }: { customerId: string; agentId: string }) =>
      customersApi.assignAgent(customerId, agentId),
    onSuccess: () => { toast.success('Agent assigned'); setAssignTarget(null); setAgentId(''); invalidate() },
    onError: () => toast.error('Failed to assign agent'),
  })
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => customersApi.bulkDelete(ids),
    onSuccess: (res) => {
      toast.success(`${res.data.deletedCount} customer${res.data.deletedCount !== 1 ? 's' : ''} deleted`)
      setBulkDeleteOpen(false)
      // Deleting everything on a non-first page would otherwise strand the view on an empty page.
      if (selectedIds.size >= customers.length && page > 0) setPage((p) => p - 1)
      setSelectedIds(new Set())
      invalidate()
    },
    onError: () => toast.error('Failed to delete customers'),
  })

  const openCreate = () => { setEditing(null); setDialogOpen(true) }
  const openEdit   = (c: Customer) => { setEditing(c); setDialogOpen(true) }
  const openAssign = (c: Customer) => { setAssignTarget(c); setAgentId(c.assignedAgentId ?? '') }
  const handleSave = (form: CreateCustomerRequest) => {
    if (editingCustomer) updateMutation.mutate({ id: editingCustomer.id, data: form })
    else createMutation.mutate(form)
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        description={`${totalElements} customer${totalElements !== 1 ? 's' : ''} total`}
        action={
          <div className="flex items-center gap-2">
            {role === 'ADMIN' && (
              <>
                <select
                  className="form-select"
                  value={exportAgentId}
                  onChange={(e) => setExportAgentId(e.target.value)}
                  title="Filter export by agent"
                >
                  <option value="">All Agents</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <button onClick={() => exportApi.exportCustomers(exportAgentId || undefined).catch(() => toast.error('Export failed'))} className="btn-secondary">
                  <Download className="h-4 w-4" /> Export
                </button>
                <button onClick={() => setImportOpen(true)} className="btn-secondary">
                  <Upload className="h-4 w-4" /> Import
                </button>
              </>
            )}
            <button onClick={openCreate} className="btn-primary">
              <Plus className="h-4 w-4" /> Create Customer
            </button>
          </div>
        }
      />

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#B0C1D4]" />
        <input className="form-input pl-9" placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Outcome filter banner — set via dashboard tile click-through */}
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

      {role === 'ADMIN' && selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-[#E5F5F8] border border-[#0091AE]/20 px-4 py-2.5 mb-4">
          <p className="text-sm font-semibold text-[#0091AE]">
            {selectedIds.size} customer{selectedIds.size !== 1 ? 's' : ''} selected
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedIds(new Set())} className="btn-secondary text-xs px-3 py-1.5">
              Clear
            </button>
            <button onClick={() => setBulkAssignOpen(true)} className="btn-primary text-xs px-3 py-1.5">
              <UserCog className="h-3.5 w-3.5" /> Assign to Agent
            </button>
            <button onClick={() => setBulkDeleteOpen(true)} className="btn-secondary text-xs px-3 py-1.5 text-red-500 hover:bg-red-50">
              <Trash2 className="h-3.5 w-3.5" /> Delete Selected
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner className="py-24" />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={<UserCircle className="h-6 w-6" />}
          title="No customers found"
          description={debouncedSearch ? 'Try a different search term' : 'Import or create your first customer'}
          action={<button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> Create Customer</button>}
        />
      ) : (
        <div className="hs-table-wrap">
          <table className="hs-table">
            <thead>
              <tr>
                {role === 'ADMIN' && (
                  <th className="hs-th w-10">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      checked={customers.length > 0 && selectedIds.size === customers.length}
                      onChange={toggleAll}
                    />
                  </th>
                )}
                <th className="hs-th">Customer</th>
                {role === 'ADMIN' && <th className="hs-th">Phone</th>}
                <th className="hs-th">Email</th>
                <th className="hs-th">Assigned To</th>
                {role === 'ADMIN' && (
                  <th className="hs-th">
                    <button onClick={() => toggleSort('premium')} className="flex items-center gap-1 hover:text-[#0091AE] transition">
                      Premium
                      {sortField === 'premium'
                        ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)
                        : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                    </button>
                  </th>
                )}
                <th className="hs-th">
                  <button onClick={() => toggleSort('expiryDate')} className="flex items-center gap-1 hover:text-[#0091AE] transition">
                    Expiry Date
                    {sortField === 'expiryDate'
                      ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)
                      : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                  </button>
                </th>
                <th className="hs-th">Created</th>
                <th className="hs-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="hs-tr">

                  {role === 'ADMIN' && (
                    <td className="hs-td">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleOne(c.id)}
                      />
                    </td>
                  )}

                  {/* Customer name + notes snippet */}
                  <td className="hs-td">
                    <p className="font-semibold text-[#33475B] leading-tight">{c.name}</p>
                    {c.notes && (
                      <p className="text-xs text-[#516F90] mt-0.5 max-w-[200px] truncate" title={c.notes}>
                        {c.notes}
                      </p>
                    )}
                  </td>

                  {role === 'ADMIN' && <td className="hs-td text-[#516F90] whitespace-nowrap">{c.phone}</td>}
                  <td className="hs-td text-[#516F90]">{c.email ?? '—'}</td>

                  {/* Smart Assigned To column */}
                  <td className="hs-td">
                    {c.assignedAgentName ? (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2.5 py-0.5 w-fit">
                          <UserCheck className="h-3 w-3" />
                          {c.assignedAgentName}
                        </span>
                        {role === 'ADMIN' && (
                          <button
                            onClick={() => openAssign(c)}
                            className="text-[11px] font-medium text-[#0091AE] hover:underline text-left w-fit"
                          >
                            Reassign
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-[#B0C1D4] italic">Unassigned</span>
                        {role === 'ADMIN' && (
                          <button
                            onClick={() => openAssign(c)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#FF7A59] hover:underline w-fit"
                          >
                            <UserCog className="h-3 w-3" /> Assign agent
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  {role === 'ADMIN' && (
                    <td className="hs-td text-[#33475B] font-medium whitespace-nowrap">
                      {c.lastYearPremium != null ? `₹${c.lastYearPremium.toLocaleString('en-IN')}` : '—'}
                    </td>
                  )}
                  <td className="hs-td text-[#516F90] whitespace-nowrap">
                    {c.expiryDate ? format(new Date(c.expiryDate), 'dd MMM yyyy') : '—'}
                  </td>

                  <td className="hs-td text-[#516F90] whitespace-nowrap">
                    {format(new Date(c.createdAt), 'dd MMM yyyy')}
                  </td>

                  {/* Actions — View, Edit, Delete only */}
                  <td className="hs-td">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/customers/${c.id}`)}
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[#0091AE] hover:bg-[#E5F5F8] transition"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </button>
                      {role === 'ADMIN' && (
                        <button
                          onClick={() => openEdit(c)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[#516F90] hover:bg-[#F5F8FA] transition"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                      )}
                      {role === 'ADMIN' && (
                        <button
                          onClick={() => setDeleteTarget(c)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={page}
            totalPages={totalPages}
            totalElements={totalElements}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      )}

      <CustomerFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editingCustomer}
        onSave={handleSave}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}
        title="Delete Customer"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        destructive
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Delete Customers"
        description={`Are you sure you want to delete ${selectedIds.size} customer${selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.`}
        onConfirm={() => bulkDeleteMutation.mutate([...selectedIds])}
        loading={bulkDeleteMutation.isPending}
        destructive
      />

      {/* Assign / Reassign dialog */}
      <Dialog.Root
        open={!!assignTarget}
        onOpenChange={(v) => { if (!v) { setAssignTarget(null); setAgentId('') } }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="hs-dialog-overlay" />
          <Dialog.Content className="hs-dialog-panel sm:max-w-sm">
            <div className="hs-dialog-header">
              <div>
                <Dialog.Title className="hs-dialog-title">
                  {assignTarget?.assignedAgentName ? 'Reassign Agent' : 'Assign Agent'}
                </Dialog.Title>
                <p className="text-xs text-[#516F90] mt-0.5">{assignTarget?.name}</p>
              </div>
              <Dialog.Close className="btn-icon"><X className="h-4 w-4" /></Dialog.Close>
            </div>

            <div className="p-5 space-y-4">
              {/* Current assignment banner */}
              {assignTarget?.assignedAgentName && (
                <div className="flex items-center gap-2.5 rounded-lg bg-purple-50 border border-purple-100 px-4 py-2.5">
                  <UserCheck className="h-4 w-4 text-purple-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-purple-600 font-medium">Currently assigned to</p>
                    <p className="text-sm font-semibold text-purple-700">{assignTarget.assignedAgentName}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="form-label">
                  {assignTarget?.assignedAgentName ? 'Select new agent' : 'Select agent'}
                </label>
                <select className="form-select" value={selectedAgentId} onChange={(e) => setAgentId(e.target.value)}>
                  <option value="">— Unassigned —</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="hs-dialog-footer">
              <Dialog.Close asChild>
                <button className="btn-secondary">Cancel</button>
              </Dialog.Close>
              <button
                className="btn-primary"
                disabled={!selectedAgentId || assignMutation.isPending}
                onClick={() => assignTarget && selectedAgentId && assignMutation.mutate({ customerId: assignTarget.id, agentId: selectedAgentId })}
              >
                {assignMutation.isPending
                  ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  : assignTarget?.assignedAgentName ? 'Reassign' : 'Assign'
                }
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <BulkAssignDialog
        open={bulkAssignOpen}
        onOpenChange={setBulkAssignOpen}
        customerIds={[...selectedIds]}
        customerNames={customers.filter((c) => selectedIds.has(c.id)).map((c) => c.name)}
        agents={agents}
        onAssigned={() => { setSelectedIds(new Set()); invalidate() }}
      />
    </div>
  )
}
