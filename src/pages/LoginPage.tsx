import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { queryClient } from '@/lib/queryClient'
import logoIcon from '@/assets/logo-icon.png'
import logoFull from '@/assets/logo-full.png'

export default function LoginPage() {
  const navigate  = useNavigate()
  const { login } = useAuthStore()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [error, setError]       = useState('')

  const mutation = useMutation({
    mutationFn: () => authApi.login({ email, password }),
    onSuccess: (res) => { queryClient.clear(); login(res.data); navigate('/dashboard', { replace: true }) },
    onError:   () => setError('Invalid email or password. Please try again.'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Both fields are required.'); return }
    mutation.mutate()
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left brand panel ── */}
      <div className="hidden lg:flex w-[44%] flex-col justify-between bg-[#33475B] p-12">
        <div className="flex items-center gap-3">
          <img src={logoIcon} alt="InsuredIndex" className="w-9 h-9 object-contain" />
          <span className="text-[17px] font-bold text-white tracking-tight">InsuredIndex</span>
        </div>

        <div className="space-y-5">
          <h2 className="text-[36px] font-extrabold text-white leading-[1.2] tracking-tight">
            Manage renewals.<br />Never miss a policy.
          </h2>
          <p className="text-white/55 text-[15px] leading-relaxed max-w-xs">
            Track customers, policies, and renewal deadlines — built for agencies that want to grow.
          </p>
          <div className="space-y-3 pt-1">
            {['Automated 30/15/7-day renewal alerts', 'Agent-level assignment & tracking', 'Renewal performance reports'].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-[#FF7A59] flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 fill-white"><path d="M1 4l2.5 2.5L9 1"/></svg>
                </div>
                <span className="text-[13px] text-white/65">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/25 text-xs">© 2026 InsuredIndex · All rights reserved</p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center bg-[#F5F8FA] px-8">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="mb-10 lg:hidden">
            <img src={logoFull} alt="InsuredIndex" className="h-10 w-auto" />
          </div>

          <div className="mb-7">
            <h1 className="text-[22px] font-extrabold text-[#33475B] tracking-tight">Sign in</h1>
            <p className="text-sm text-[#516F90] mt-1">Enter your credentials to access your account</p>
          </div>

          <div className="bg-white rounded-lg border border-[#DFE3EB] p-6 shadow-card space-y-4">
            <div>
              <label className="form-label">Email address</label>
              <input className="form-input" type="email" placeholder="you@company.com"
                value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <input className="form-input pr-10" type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0C1D4] hover:text-[#516F90] transition-colors">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded bg-red-50 border border-red-100 px-3.5 py-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#F2545B] mt-1.5 flex-shrink-0" />
                <p className="text-[13px] text-[#F2545B] font-medium">{error}</p>
              </div>
            )}

            <button type="submit" onClick={handleSubmit}
              disabled={mutation.isPending} className="btn-primary w-full py-2.5 mt-1">
              {mutation.isPending
                ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                : <><span className="text-[14px]">Sign in</span> <ArrowRight className="h-4 w-4" /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
