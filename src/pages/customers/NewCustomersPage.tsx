import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Eye, MessageSquare, PartyPopper } from 'lucide-react'
import { format } from 'date-fns'
import { customersApi } from '@/api/customers'
import { useAuthStore } from '@/store/authStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Pagination } from '@/components/shared/Pagination'
import { CommunicationTimeline } from '@/components/shared/CommunicationTimeline'
import type { Customer } from '@/types/customer'

const PAGE_SIZE = 20

export default function NewCustomersPage() {
  const navigate = useNavigate()
  const { role } = useAuthStore()
  const [page, setPage] = useState(0)
  const [activityCustomerId, setActivityCustomerId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['customers-new', page],
    queryFn: () => customersApi.getNew({ page, size: PAGE_SIZE }),
  })

  const customers: Customer[] = data?.data.content ?? []
  const totalElements = data?.data.totalElements ?? 0
  const totalPages = data?.data.totalPages ?? 0

  return (
    <div>
      <PageHeader
        title="New Customers"
        description={`${totalElements} customer${totalElements !== 1 ? 's' : ''} awaiting first contact`}
      />

      {isLoading ? (
        <LoadingSpinner className="py-24" />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={<PartyPopper className="h-6 w-6" />}
          title="You're all caught up"
          description="Every customer assigned to you has been contacted at least once. New imports and assignments will show up here."
          action={<button onClick={() => navigate('/customers')} className="btn-secondary">Browse all customers</button>}
        />
      ) : (
        <div className="hs-table-wrap">
          <table className="hs-table">
            <thead>
              <tr>
                <th className="hs-th">Customer</th>
                <th className="hs-th">Phone</th>
                <th className="hs-th">Email</th>
                {role === 'ADMIN' && <th className="hs-th">Assigned To</th>}
                <th className="hs-th">Created</th>
                <th className="hs-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <React.Fragment key={c.id}>
                  <tr className="hs-tr">
                    <td className="hs-td">
                      <p className="font-semibold text-[#33475B] leading-tight">{c.name}</p>
                      {c.notes && (
                        <p className="text-xs text-[#516F90] mt-0.5 max-w-[200px] truncate" title={c.notes}>
                          {c.notes}
                        </p>
                      )}
                    </td>
                    <td className="hs-td text-[#516F90] whitespace-nowrap">{c.phone}</td>
                    <td className="hs-td text-[#516F90]">{c.email ?? '—'}</td>
                    {role === 'ADMIN' && (
                      <td className="hs-td">
                        {c.assignedAgentName ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2.5 py-0.5 w-fit">
                            {c.assignedAgentName}
                          </span>
                        ) : (
                          <span className="text-xs text-[#B0C1D4] italic">Unassigned</span>
                        )}
                      </td>
                    )}
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
                      <td colSpan={role === 'ADMIN' ? 6 : 5} className="bg-[#F5F8FA] px-6 py-4 border-b border-[#DFE3EB]">
                        <CommunicationTimeline
                          entityType="customer"
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
    </div>
  )
}
