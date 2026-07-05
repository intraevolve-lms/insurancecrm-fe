import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, Phone, Mail, MapPin, UserCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { customersApi } from '@/api/customers'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { CommunicationTimeline } from '@/components/shared/CommunicationTimeline'

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const customerQ = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.getById(id!),
    enabled: !!id,
  })

  if (customerQ.isLoading) return <LoadingSpinner className="py-32" />

  if (!customerQ.data?.data) {
    return (
      <div className="p-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-[#516F90] hover:text-[#33475B] mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <p className="text-[#516F90]">Customer not found.</p>
      </div>
    )
  }

  const customer = customerQ.data.data

  return (
    <div className="p-6 space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate('/customers')}
        className="flex items-center gap-2 text-sm text-[#516F90] hover:text-[#33475B] transition"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Customers
      </button>

      {/* Header card */}
      <div className="hs-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5F8FA] flex-shrink-0">
              <UserCircle className="h-8 w-8 text-[#0091AE]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#33475B]">{customer.name}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-4 text-sm text-[#516F90]">
                <span className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4" /> {customer.phone}
                </span>
                {customer.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4" /> {customer.email}
                  </span>
                )}
                {customer.address && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" /> {customer.address}
                  </span>
                )}
              </div>
              {(customer.assignedAgentName || customer.lastOpenedAt) && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {customer.assignedAgentName && (
                    <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                      Agent: {customer.assignedAgentName}
                    </span>
                  )}
                  {customer.lastOpenedAt && (
                    <span className="text-xs text-[#B0C1D4]">
                      Last opened {format(new Date(customer.lastOpenedAt), 'dd MMM yyyy, h:mm a')}
                      {customer.lastOpenedByName && ` by ${customer.lastOpenedByName}`}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Plan details — DOB, plan, premium, expiry */}
        {(customer.dateOfBirth || customer.plan || customer.lastYearPremium != null || customer.expiryDate) && (
          <div className="mt-4 pt-4 border-t border-[#DFE3EB] grid grid-cols-2 sm:grid-cols-4 gap-4">
            {customer.dateOfBirth && (
              <div>
                <p className="text-[10px] font-semibold text-[#516F90] uppercase tracking-widest mb-1">Date of Birth</p>
                <p className="text-sm text-[#33475B]">{format(new Date(customer.dateOfBirth), 'dd MMM yyyy')}</p>
              </div>
            )}
            {customer.plan && (
              <div>
                <p className="text-[10px] font-semibold text-[#516F90] uppercase tracking-widest mb-1">Plan</p>
                <p className="text-sm text-[#33475B]">{customer.plan}</p>
              </div>
            )}
            {customer.lastYearPremium != null && (
              <div>
                <p className="text-[10px] font-semibold text-[#516F90] uppercase tracking-widest mb-1">Last Year Premium</p>
                <p className="text-sm text-[#33475B]">₹{customer.lastYearPremium.toLocaleString('en-IN')}</p>
              </div>
            )}
            {customer.expiryDate && (
              <div>
                <p className="text-[10px] font-semibold text-[#516F90] uppercase tracking-widest mb-1">Expiry Date</p>
                <p className="text-sm text-[#33475B]">{format(new Date(customer.expiryDate), 'dd MMM yyyy')}</p>
              </div>
            )}
          </div>
        )}

        {/* Customer-level notes from import / form */}
        {customer.notes && customer.notes.trim() && (
          <div className="mt-4 pt-4 border-t border-[#DFE3EB]">
            <p className="text-[10px] font-semibold text-[#516F90] uppercase tracking-widest mb-1.5">
              Customer Note
            </p>
            <p className="text-sm text-[#33475B] leading-relaxed bg-yellow-50 border border-yellow-100 rounded-lg px-4 py-3">
              {customer.notes}
            </p>
          </div>
        )}
      </div>

      {/* Activity */}
      <div className="hs-card p-6">
        <CommunicationTimeline
          entityType="customer"
          entityId={id!}
          queryKey={['customer-comms', id!]}
        />
      </div>
    </div>
  )
}
