import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'

// Client-side deterrent only — none of this is enforceable against a determined user (view-source,
// disabling JS, or a browser extension all bypass it trivially). It exists as one layer alongside
// server-side controls (field masking, export restrictions, audit logging), not a substitute for
// them. Admins are unaffected.
const DEVTOOLS_KEYS = ['I', 'J', 'C']

function isBlockedShortcut(e: KeyboardEvent): boolean {
  const key = e.key.toUpperCase()
  const mod = e.ctrlKey || e.metaKey

  if (key === 'F12') return true
  if (mod && e.shiftKey && DEVTOOLS_KEYS.includes(key)) return true // devtools panels
  if (mod && key === 'U') return true // view-source
  if (mod && key === 'S') return true // save page
  if (mod && key === 'C') return true // copy

  return false
}

export function DataProtectionGuard() {
  const role = useAuthStore((s) => s.role)

  useEffect(() => {
    if (role !== 'AGENT') return

    const blockContextMenu = (e: MouseEvent) => e.preventDefault()
    const blockSelection = (e: Event) => e.preventDefault()
    const blockCopy = (e: ClipboardEvent) => e.preventDefault()
    const blockShortcuts = (e: KeyboardEvent) => {
      if (isBlockedShortcut(e)) e.preventDefault()
    }

    document.addEventListener('contextmenu', blockContextMenu)
    document.addEventListener('selectstart', blockSelection)
    document.addEventListener('copy', blockCopy)
    document.addEventListener('keydown', blockShortcuts)
    document.body.classList.add('select-none')

    return () => {
      document.removeEventListener('contextmenu', blockContextMenu)
      document.removeEventListener('selectstart', blockSelection)
      document.removeEventListener('copy', blockCopy)
      document.removeEventListener('keydown', blockShortcuts)
      document.body.classList.remove('select-none')
    }
  }, [role])

  return null
}
