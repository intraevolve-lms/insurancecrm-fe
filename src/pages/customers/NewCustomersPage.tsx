import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, MessageSquare, PartyPopper, Search, ArrowUp, ArrowDown, ArrowUpDown, UserCog } from 'lucide-react'
import { format } from 'date-fns'
import { customersApi } from '@/api/customers'
import { usersApi } from '@/api/users'
import { useAuthStore } from '@/store/authStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Pagination } from '@/components/shared/Pagination'
import { CommunicationTimeline } from '@/components/shared/CommunicationTimeline'
import { BulkAssignDialog } from '@/components/customers/BulkAssignDialog'
import type { Customer } from '@/types/customer'

const PAGE_SIZE = 20

export default function NewCustomersPage() {
  const navigate = useNavigate()
  const { role } = useAuthStore()
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [activityCustomerId, setActivityCustomerId] = useState<string | null>(null)
  const [search, setSearch]             = useState('')
  const [debouncedSearch, setDebounced] = useState('')
  const debounceRef                     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [sortField, setSortField]       = useState<'premium' | 'expiryDate' | null>(null)
  const [sortDir, setSortDir]           = useState<'asc' | 'desc'>('asc')
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set())
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false)
  const headerCheckboxRef               = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebounced(search), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  useEffect(() => {
    setSelectedIds(new Set())
    setPage(0)
  }, [debouncedSearch, sortField, sortDir])

  const toggleSort = (field: 'premium' | 'expiryDate') => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['customers-new', page, debouncedSearch, sortField, sortDir],
    queryFn: () => customersApi.getNew({
      page, size: PAGE_SIZE,
      q: debouncedSearch.trim() || undefined,
      sortBy: sortField ?? undefined, sortDir,
    }),
  })

  const { data: agentsData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
    enabled: role === 'ADMIN',
  })
  const agents = (agentsData?.data ?? []).filter((u) => u.active)

  const customers: Customer[] = data?.data.content ?? []
  const totalElements = data?.data.totalElements ?? 0
  const totalPages = data?.data.totalPages ?? 0

  useEffect(() => {
    const visibleIds = new Set(customers.map((c) => c.id))
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => visibleIds.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [customers])

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate =
        selectedIds.size > 0 && selectedIds.size < customers.length
    }
  }, [selectedIds, customers.length])

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

  return (
    <div>
      <PageHeader
        title="New Lead"
        description={`${totalElements} customer${totalElements !== 1 ? 's' : ''} awaiting first contact`}
      />

      {/* Search — same layout as the Customers page */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#B0C1D4]" />
        <input className="form-input pl-9" placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

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
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner className="py-24" />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={<PartyPopper className="h-6 w-6" />}
          title={debouncedSearch ? 'No matching customers' : "You're all caught up"}
          description={debouncedSearch
            ? 'Try a different search term'
            : 'Every customer assigned to you has been contacted at least once. New imports and assignments will show up here.'}
          action={<button onClick={() => navigate('/customers')} className="btn-secondary">Browse all customers</button>}
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
                <React.Fragment key={c.id}>
                  <tr className="hs-tr">
                    {role === 'ADMIN' && (
                      <td className="hs-td">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggleOne(c.id)}
                        />
                      </td>
                    )}
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
                    <td className="hs-td">
                      {c.assignedAgentName ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2.5 py-0.5 w-fit">
                          {c.assignedAgentName}
                        </span>
                      ) : (
                        <span className="text-xs text-[#B0C1D4] italic">Unassigned</span>
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
                    <td className="hs-td">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setActivityCustomerId(activityCustomerId === c.id ? null : c.id)}
                          className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition ${
                            activityCustomerId === c.id
                              ? 'bg-[#E5F5F8] text-[#0091AE]'
                              : 'text-[#516F90] hover:bg-[#F5F8FA]'
                          }`}
                          title="Activity Log"
                        >
                          <MessageSquare className="h-3.5 w-3.5" /> Activity
                        </button>
                        <button
                          onClick={() => navigate(`/customers/${c.id}`)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[#0091AE] hover:bg-[#E5F5F8] transition"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expandable activity panel — logging any outcome here moves the customer out
                      of this list on the next fetch, since it no longer matches lastOutcome=null. */}
                  {activityCustomerId === c.id && (
                    <tr>
                      <td colSpan={role === 'ADMIN' ? 9 : 6} className="bg-[#F5F8FA] px-6 py-4 border-b border-[#DFE3EB]">
                        <CommunicationTimeline
                          entityId={c.id}
                          queryKey={['customer-comms', c.id]}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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

      <BulkAssignDialog
        open={bulkAssignOpen}
        onOpenChange={setBulkAssignOpen}
        customerIds={[...selectedIds]}
        customerNames={customers.filter((c) => selectedIds.has(c.id)).map((c) => c.name)}
        agents={agents}
        onAssigned={() => {
          setSelectedIds(new Set())
          qc.invalidateQueries({ queryKey: ['customers-new'] })
          qc.invalidateQueries({ queryKey: ['customers'] })
        }}
      />
    </div>
  )
}
