import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bell, HelpCircle, Menu, CheckSquare, MessageSquare, AlertCircle, X } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { remindersApi } from '@/api/reminders'
import type { Reminder, ReminderType } from '@/types/reminder'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/customers': 'Customers',
  '/new-customers': 'New Customers',
  '/agent-performance': 'Agent Performance',
  '/users':     'User Management',
}

const TYPE_META: Record<ReminderType, { icon: React.ElementType; color: string; label: string }> = {
  COMMUNICATION_FOLLOWUP: { icon: MessageSquare, color: 'text-purple-500', label: 'Follow-up' },
}

function ReminderItem({ r, onClick }: { r: Reminder; onClick: () => void }) {
  const meta = TYPE_META[r.type]
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[#F5F8FA] transition-colors border-b border-[#F5F8FA] text-left"
    >
      <div className="w-7 h-7 rounded-full bg-[#F5F8FA] border border-[#DFE3EB] flex items-center justify-center flex-shrink-0 mt-0.5">
        <meta.icon className={`h-3.5 w-3.5 ${meta.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#33475B] leading-tight truncate">{r.entityName}</p>
        <p className="text-xs text-[#516F90] mt-0.5 truncate">{r.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[11px] font-semibold ${r.overdueDays > 0 ? 'text-red-500' : 'text-yellow-600'}`}>
            {r.overdueDays > 0 ? `${r.overdueDays}d overdue` : 'Due today'}
          </span>
          <span className="text-[#DFE3EB]">·</span>
          <span className="text-[11px] text-[#B0C1D4]">{meta.label}</span>
        </div>
      </div>
    </button>
  )
}

function ReminderDropdown({ reminders, onClose }: { reminders: Reminder[]; onClose: () => void }) {
  const navigate = useNavigate()

  const handleClick = (r: Reminder) => {
    onClose()
    if (r.entityId) navigate(`/customers/${r.entityId}`)
  }

  const overdue = reminders.filter((r) => r.overdueDays > 0)
  const today   = reminders.filter((r) => r.overdueDays === 0)

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-[#DFE3EB] shadow-xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#DFE3EB] bg-[#F5F8FA]">
        <p className="text-sm font-bold text-[#33475B]">
          Follow-up Reminders
          {reminders.length > 0 && (
            <span className="ml-2 bg-[#FF7A59] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {reminders.length}
            </span>
          )}
        </p>
        <button onClick={onClose} className="btn-icon p-1"><X className="h-3.5 w-3.5" /></button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {reminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-3">
              <CheckSquare className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-[#33475B]">All caught up!</p>
            <p className="text-xs text-[#516F90] mt-0.5">No follow-ups due today</p>
          </div>
        ) : (
          <>
            {overdue.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-red-50 border-b border-red-100">
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide flex items-center gap-1.5">
                    <AlertCircle className="h-3 w-3" /> Overdue ({overdue.length})
                  </p>
                </div>
                {overdue.map((r) => <ReminderItem key={`${r.type}-${r.id}`} r={r} onClick={() => handleClick(r)} />)}
              </div>
            )}
            {today.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-100">
                  <p className="text-[10px] font-bold text-yellow-700 uppercase tracking-wide">
                    Due Today ({today.length})
                  </p>
                </div>
                {today.map((r) => <ReminderItem key={`${r.type}-${r.id}`} r={r} onClick={() => handleClick(r)} />)}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  )
}

interface Props {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: Props) {
  const { pathname } = useLocation()
  const { name, role } = useAuthStore()
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  const segment = '/' + pathname.split('/')[1]
  const title = PAGE_TITLES[segment] ?? 'InsuredIndex'
  const isDetail = pathname.split('/').length > 2

  const { data } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => remindersApi.getAll(),
    refetchInterval: 5 * 60 * 1000, // poll every 5 minutes
  })
  const reminders: Reminder[] = data?.data ?? []
  const count = reminders.length

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <header className="h-16 flex-shrink-0 flex items-center gap-3 px-4 md:px-6 bg-white border-b border-[#DFE3EB] z-10">
      <button onClick={onMenuClick}
        className="lg:hidden p-2 rounded text-[#516F90] hover:bg-[#F5F8FA] hover:text-[#33475B] transition-colors -ml-1"
        aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1 min-w-0">
        {isDetail ? (
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-[#516F90] font-medium hidden sm:inline">{PAGE_TITLES[segment]}</span>
            <span className="text-[#DFE3EB] font-light text-base hidden sm:inline">/</span>
            <span className="font-semibold text-[#33475B]">Detail</span>
          </div>
        ) : (
          <h1 className="text-[16px] md:text-[17px] font-bold text-[#33475B] tracking-tight truncate">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button className="btn-icon relative hidden sm:flex">
          <HelpCircle className="h-4 w-4" />
        </button>

        {/* Reminder bell */}
        <div ref={bellRef} className="relative">
          <button onClick={() => setBellOpen(!bellOpen)}
            className={`btn-icon relative ${bellOpen ? 'bg-[#F5F8FA] text-[#33475B]' : ''}`}
            aria-label="Follow-up reminders">
            <Bell className="h-4 w-4" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-[#FF7A59] text-white text-[9px] font-bold px-0.5 ring-2 ring-white">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>
          {bellOpen && <ReminderDropdown reminders={reminders} onClose={() => setBellOpen(false)} />}
        </div>

        <div className="w-px h-5 bg-[#DFE3EB] mx-1 hidden sm:block" />

        <div className="flex items-center gap-2 cursor-pointer">
          <div className="text-right hidden md:block">
            <p className="text-[13px] font-semibold text-[#33475B] leading-tight">{name}</p>
            <p className={`text-[11px] font-medium leading-tight ${role === 'ADMIN' ? 'text-purple-600' : 'text-[#0091AE]'}`}>{role}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#FF7A59] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {initials}
          </div>
        </div>
      </div>
    </header>
  )
}
