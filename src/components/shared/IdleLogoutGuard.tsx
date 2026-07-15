import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Clock } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { queryClient } from '@/lib/queryClient'

// Client-side only — no server-side token revocation. After this many ms of no mouse/keyboard/
// scroll/touch activity, an agent is signed out and must log in again. Admins are unaffected.
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000
export const IDLE_WARNING_LEAD_MS = 60 * 1000

// Any activity within this window of the last reset is ignored, so a held-down key or a stream
// of mousemove events doesn't reschedule the timers dozens of times a second.
const ACTIVITY_RESET_THROTTLE_MS = 5000

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const

export function IdleLogoutGuard() {
  const role = useAuthStore((s) => s.role)
  const navigate = useNavigate()
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastResetRef = useRef(0)

  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
  }, [])

  const doLogout = useCallback(() => {
    clearAllTimers()
    useAuthStore.getState().logout()
    queryClient.clear()
    toast.warning('You were logged out due to inactivity. Please log in again.')
    navigate('/login', { replace: true })
  }, [clearAllTimers, navigate])

  const scheduleTimers = useCallback(() => {
    lastResetRef.current = Date.now()
    clearAllTimers()
    setSecondsLeft(null)

    warningTimerRef.current = setTimeout(() => {
      setSecondsLeft(Math.round(IDLE_WARNING_LEAD_MS / 1000))
      countdownIntervalRef.current = setInterval(() => {
        setSecondsLeft((s) => (s !== null && s > 1 ? s - 1 : s))
      }, 1000)
    }, IDLE_TIMEOUT_MS - IDLE_WARNING_LEAD_MS)

    logoutTimerRef.current = setTimeout(doLogout, IDLE_TIMEOUT_MS)
  }, [clearAllTimers, doLogout])

  useEffect(() => {
    if (role !== 'AGENT') return

    scheduleTimers()

    const handleActivity = () => {
      if (Date.now() - lastResetRef.current < ACTIVITY_RESET_THROTTLE_MS) return
      scheduleTimers()
    }

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, handleActivity))
    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, handleActivity))
      clearAllTimers()
    }
  }, [role, scheduleTimers, clearAllTimers])

  if (role !== 'AGENT' || secondsLeft === null) return null

  return (
    <div className="hs-dialog-overlay">
      <div className="hs-dialog-panel sm:max-w-sm" role="alertdialog" aria-modal="true" aria-labelledby="idle-logout-title">
        <div className="hs-dialog-header">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#FFF3F0] flex items-center justify-center flex-shrink-0">
              <Clock className="h-4 w-4 text-[#FF7A59]" />
            </div>
            <h2 id="idle-logout-title" className="hs-dialog-title">Still there?</h2>
          </div>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-[#516F90] leading-relaxed">
            You'll be logged out in {secondsLeft}s due to inactivity.
          </p>
        </div>
        <div className="hs-dialog-footer">
          <button onClick={scheduleTimers} className="btn-primary">Stay Logged In</button>
        </div>
      </div>
    </div>
  )
}
