import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Users, AlertTriangle,
  XCircle, RefreshCw, Bell, MessageSquare,
  PhoneForwarded, PhoneIncoming, UserPlus, PhoneCall, PhoneOff, PhoneMissed, CalendarClock, Languages,
} from 'lucide-react'
import { dashboardApi } from '@/api/dashboard'
import { remindersApi } from '@/api/reminders'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { OUTCOME_META } from '@/components/shared/CommunicationTimeline'
import type { DashboardSummary } from '@/types/dashboard'
import type { ReminderType } from '@/types/reminder'
import type { CommunicationOutcome } from '@/types/communication'

const OUTCOME_STAT_ICONS: Record<CommunicationOutcome, React.ElementType> = {
  MY_CALLBACK: PhoneForwarded,
  CALLBACK:    PhoneIncoming,
  PROSPECT:    UserPlus,
  RINGING:     PhoneCall,
  SWITCH_OFF:  PhoneOff,
  HANG_UP:     PhoneMissed,
  NEXT_YEAR:   CalendarClock,
  SALE_CLOSE:  PhoneCall,
  LANGUAGE_ISSUE: Languages,
}

// Dashboard funnel excludes SALE_CLOSE — once closed, the customer's policy is treated as sold
const DASHBOARD_OUTCOMES: CommunicationOutcome[] = [
  'MY_CALLBACK', 'CALLBACK', 'PROSPECT', 'RINGING', 'SWITCH_OFF', 'HANG_UP', 'NEXT_YEAR', 'LANGUAGE_ISSUE',
]

const REMINDER_ICONS: Record<ReminderType, React.ElementType> = {
  COMMUNICATION_FOLLOWUP: MessageSquare,
}

function DashboardReminderRow({ r, navigate }: { r: import('@/types/reminder').Reminder; navigate: (path: string) => void }) {
  const Icon = REMINDER_ICONS[r.type]
  const handleClick = () => {
    if (r.entityId) navigate(`/customers/${r.entityId}`)
  }
  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#F5F8FA] border-b border-[#F5F8FA] transition-colors text-left"
    >
      <Icon className="h-4 w-4 text-[#516F90] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-[#33475B] truncate">{r.entityName}</span>
        <span className="text-xs text-[#516F90] ml-2">{r.description}</span>
      </div>
      <span className={`text-xs font-semibold flex-shrink-0 ${r.overdueDays > 0 ? 'text-red-500' : 'text-yellow-600'}`}>
        {r.overdueDays > 0 ? `${r.overdueDays}d overdue` : 'Today'}
      </span>
    </button>
  )
}

const OUTCOME_STAT_COLORS: Record<CommunicationOutcome, { bg: string; color: string }> = {
  MY_CALLBACK: { bg: 'bg-cyan-50',    color: 'text-cyan-600' },
  CALLBACK:    { bg: 'bg-yellow-50',  color: 'text-yellow-600' },
  PROSPECT:    { bg: 'bg-blue-50',    color: 'text-blue-600' },
  RINGING:     { bg: 'bg-indigo-50',  color: 'text-indigo-600' },
  SWITCH_OFF:  { bg: 'bg-gray-100',   color: 'text-gray-500' },
  HANG_UP:     { bg: 'bg-orange-50',  color: 'text-orange-600' },
  NEXT_YEAR:   { bg: 'bg-purple-50',  color: 'text-purple-600' },
  SALE_CLOSE:  { bg: 'bg-emerald-50', color: 'text-emerald-600' },
  LANGUAGE_ISSUE: { bg: 'bg-pink-50', color: 'text-pink-600' },
}

function buildStats(summary: DashboardSummary) {
  const outcomeStats = DASHBOARD_OUTCOMES.map((outcome) => ({
    value: summary.outcomeCounts[outcome] ?? 0,
    label: OUTCOME_META[outcome].label,
    icon: OUTCOME_STAT_ICONS[outcome],
    bg: OUTCOME_STAT_COLORS[outcome].bg,
    color: OUTCOME_STAT_COLORS[outcome].color,
    link: `/customers?outcome=${outcome}`,
  }))

  return [
    { value: summary.totalCustomers, label: 'Total Customers', icon: Users, bg: 'bg-[#E5F5F8]', color: 'text-[#0091AE]', link: '/customers' },
    ...outcomeStats,
  ]
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.getSummary(),
  })

  const { data: remindersData } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => remindersApi.getAll(),
  })

  const reminders = remindersData?.data ?? []
  const overdueReminders = reminders.filter((r) => r.overdueDays > 0)
  const todayReminders   = reminders.filter((r) => r.overdueDays === 0)

  if (isLoading) return <LoadingSpinner className="py-32" />

  if (isError || !data?.data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mb-4">
          <XCircle className="h-6 w-6 text-red-400" />
        </div>
        <p className="text-[15px] font-semibold text-[#33475B] mb-1">Could not load dashboard</p>
        <p className="text-sm text-[#516F90] mb-5">
          Make sure the backend is running on <span className="font-mono text-[#33475B]">http://localhost:8081</span>
        </p>
        <button onClick={() => refetch()} className="btn-primary">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    )
  }

  const summary = data.data

  const stats = buildStats(summary) as Array<{
    value: number; label: string; icon: React.ElementType
    bg: string; color: string; link: string; warn?: boolean
  }>

  return (
    <div>
      {/* Page title */}
      <div className="mb-5">
        <h2 className="text-lg font-bold text-[#33475B]">Overview</h2>
        <p className="text-sm text-[#516F90]">Your agency at a glance</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map(({ value, label, icon: Icon, bg, color, link, warn }) => (
          <div
            key={label}
            onClick={() => link && navigate(link)}
            className={`stat-card ${link ? 'cursor-pointer' : ''} ${warn ? 'border-red-200 ring-1 ring-red-100' : ''}`}
          >
            <div className={`stat-icon-wrap ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className={`text-[22px] font-extrabold leading-none ${warn ? 'text-red-600' : 'text-[#33475B]'}`}>
                {value.toLocaleString()}
              </p>
              <p className="text-[11px] font-medium text-[#516F90] mt-1 leading-tight">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Follow-up reminders panel */}
      {reminders.length > 0 && (
        <div className="mb-6 hs-card overflow-hidden">
          <div className="hs-card-header">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#FF7A59]" />
              <p className="text-sm font-bold text-[#33475B]">Follow-up Reminders</p>
              <span className="bg-[#FF7A59] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {reminders.length}
              </span>
            </div>
          </div>

          {overdueReminders.length > 0 && (
            <div>
              <div className="px-5 py-2 bg-red-50 border-b border-red-100 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 text-red-500" />
                <p className="text-[11px] font-bold text-red-600 uppercase tracking-wide">Overdue</p>
              </div>
              {overdueReminders.slice(0, 5).map((r) => (
                <DashboardReminderRow key={`${r.type}-${r.id}`} r={r} navigate={navigate} />
              ))}
            </div>
          )}

          {todayReminders.length > 0 && (
            <div>
              <div className="px-5 py-2 bg-yellow-50 border-b border-yellow-100">
                <p className="text-[11px] font-bold text-yellow-700 uppercase tracking-wide">Due Today</p>
              </div>
              {todayReminders.slice(0, 5).map((r) => (
                <DashboardReminderRow key={`${r.type}-${r.id}`} r={r} navigate={navigate} />
              ))}
            </div>
          )}

          {reminders.length > 10 && (
            <div className="px-5 py-2.5 border-t border-[#DFE3EB] bg-[#F5F8FA]">
              <p className="text-xs text-[#516F90]">
                + {reminders.length - 10} more — click the bell icon in the header to see all
              </p>
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="hs-card-header rounded-t-lg border border-[#DFE3EB] bg-white px-5 py-3">
        <p className="section-title">Quick Actions</p>
      </div>
      <div className="grid grid-cols-1 border-l border-r border-b border-[#DFE3EB] rounded-b-lg bg-white divide-x divide-[#DFE3EB]">
        {[
          { icon: Users, label: 'Add Customer', desc: 'Register a new policyholder', link: '/customers', color: 'text-[#0091AE]', bg: 'bg-[#E5F5F8]' },
        ].map(({ icon: Icon, label, desc, link, color, bg }) => (
          <div
            key={label}
            onClick={() => navigate(link)}
            className="flex items-center gap-4 px-5 py-5 cursor-pointer hover:bg-[#F5F8FA] transition-colors duration-100"
          >
            <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[#33475B]">{label}</p>
              <p className="text-xs text-[#516F90] mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
