import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { queryClient } from '@/lib/queryClient'
import logoFull from '@/assets/logo-full.png'

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const { mustChangePassword, clearMustChangePassword, logout } = useAuthStore()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPwd, setShowPwd]                 = useState(false)
  const [error, setError]                     = useState('')

  const mutation = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      clearMustChangePassword()
      toast.success('Password updated')
      navigate('/dashboard', { replace: true })
    },
    onError: () => setError('Current password is incorrect. Please try again.'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!currentPassword || !newPassword || !confirmPassword) { setError('All fields are required.'); return }
    if (newPassword.length < 8) { setError('New password must be at least 8 characters.'); return }
    if (newPassword !== confirmPassword) { setError('New password and confirmation do not match.'); return }
    mutation.mutate()
  }

  const handleSignOut = () => { logout(); queryClient.clear(); navigate('/login', { replace: true }) }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F8FA] px-8">
      <div className="w-full max-w-[400px]">
        <div className="mb-8">
          <img src={logoFull} alt="InsuredIndex" className="h-9 w-auto" />
        </div>

        <div className="mb-7">
          <h1 className="text-[22px] font-extrabold text-[#33475B] tracking-tight">
            {mustChangePassword ? 'Set a new password' : 'Change password'}
          </h1>
          <p className="text-sm text-[#516F90] mt-1">
            {mustChangePassword
              ? 'This account was created with a temporary password. Set your own before continuing.'
              : 'Enter your current password and choose a new one.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-[#DFE3EB] p-6 shadow-card space-y-4">
          <div>
            <label className="form-label">Current password</label>
            <input className="form-input" type={showPwd ? 'text' : 'password'} placeholder="••••••••"
              value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="form-label">New password</label>
            <div className="relative">
              <input className="form-input pr-10" type={showPwd ? 'text' : 'password'} placeholder="At least 8 characters"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0C1D4] hover:text-[#516F90] transition-colors">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="form-label">Confirm new password</label>
            <input className="form-input" type={showPwd ? 'text' : 'password'} placeholder="••••••••"
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded bg-red-50 border border-red-100 px-3.5 py-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#F2545B] mt-1.5 flex-shrink-0" />
              <p className="text-[13px] text-[#F2545B] font-medium">{error}</p>
            </div>
          )}

          <button type="submit" disabled={mutation.isPending} className="btn-primary w-full py-2.5 mt-1">
            {mutation.isPending
              ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              : <><span className="text-[14px]">Update password</span> <ArrowRight className="h-4 w-4" /></>}
          </button>

          {mustChangePassword && (
            <button type="button" onClick={handleSignOut}
              className="w-full text-center text-[13px] text-[#516F90] hover:text-[#33475B] transition-colors pt-1">
              Sign out instead
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
