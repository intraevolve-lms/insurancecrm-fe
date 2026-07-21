import { NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, Users, Award,
  UserCog, LogOut, X, KeyRound, UserPlus,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { queryClient } from '@/lib/queryClient'
import { customersApi } from '@/api/customers'
import logoIcon from '@/assets/logo-icon.png'

const navItems = [
  { to: '/dashboard',        label: 'Dashboard',        Icon: LayoutDashboard },
  { to: '/customers',        label: 'Customers',        Icon: Users },
  { to: '/new-customers',    label: 'New Customers',    Icon: UserPlus },
  { to: '/agent-performance', label: 'Agent Performance', Icon: Award },
]

interface Props {
  onClose?: () => void
}

export function Sidebar({ onClose }: Props) {
  const { name, email, role, logout } = useAuthStore()
  const navigate = useNavigate()

  const { data: newCustomersData } = useQuery({
    queryKey: ['customers-new', 'count'],
    queryFn: () => customersApi.getNew({ page: 0, size: 1 }),
    refetchInterval: 5 * 60 * 1000, // poll every 5 minutes, same cadence as the reminder bell
  })
  const newCustomersCount = newCustomersData?.data.totalElements ?? 0

  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const handleLogout = () => { logout(); queryClient.clear(); navigate('/login', { replace: true }) }

  const handleNavClick = () => {
    // Close sidebar on mobile after navigation
    onClose?.()
  }

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col h-full bg-[#33475B] text-white">

      {/* Logo + close button (mobile) */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <img src={logoIcon} alt="InsuredIndex" className="w-8 h-8 object-contain flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-white leading-tight">InsuredIndex</p>
            <p className="text-[10px] text-white/50 leading-tight">Renewal Manager</p>
          </div>
        </div>
        {/* Close button only on mobile */}
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        <p className="px-3 mb-2 text-[10px] font-semibold text-white/30 uppercase tracking-widest">
          Navigation
        </p>

        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded px-3 py-2.5 text-[13px] font-medium transition-all duration-100 ${
                isActive
                  ? 'bg-[#FF7A59] text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1">{label}</span>
            {to === '/new-customers' && newCustomersCount > 0 && (
              <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-white/20 text-white text-[10px] font-bold px-1 flex-shrink-0">
                {newCustomersCount > 99 ? '99+' : newCustomersCount}
              </span>
            )}
          </NavLink>
        ))}

        {role === 'ADMIN' && (
          <>
            <p className="px-3 mt-5 mb-2 text-[10px] font-semibold text-white/30 uppercase tracking-widest">
              Admin
            </p>
            <NavLink
              to="/users"
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded px-3 py-2.5 text-[13px] font-medium transition-all duration-100 ${
                  isActive
                    ? 'bg-[#FF7A59] text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <UserCog className="h-4 w-4 flex-shrink-0" />
              Users
            </NavLink>
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="flex-shrink-0 border-t border-white/10 p-3 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded bg-white/5">
          <div className="w-8 h-8 rounded-full bg-[#FF7A59] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white truncate leading-tight">{name}</p>
            <p className="text-[11px] text-white/50 truncate leading-tight">{email}</p>
          </div>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${role === 'ADMIN' ? 'bg-purple-500/30 text-purple-200' : 'bg-[#0091AE]/30 text-cyan-200'}`}>
            {role}
          </span>
        </div>
        {role === 'ADMIN' && (
          <NavLink
            to="/change-password"
            onClick={handleNavClick}
            className="w-full flex items-center gap-2.5 rounded px-3 py-2 text-[13px] font-medium text-white/50 hover:bg-white/10 hover:text-white transition-colors duration-100"
          >
            <KeyRound className="h-4 w-4" />
            Change password
          </NavLink>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 rounded px-3 py-2 text-[13px] font-medium text-white/50 hover:bg-white/10 hover:text-white transition-colors duration-100"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
