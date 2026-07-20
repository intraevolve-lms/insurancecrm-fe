import { act } from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { useAuthStore } from '@/store/authStore'
import { DataProtectionGuard } from './DataProtectionGuard'

function login(role: 'ADMIN' | 'AGENT') {
  useAuthStore.getState().login({
    token: 't', refreshToken: 'rt', userId: 'u-1', name: 'User One', email: 'user@test.com', role,
  })
}

function fireContextMenu() {
  const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
  act(() => { document.dispatchEvent(event) })
  return event
}

function fireKeydown(init: KeyboardEventInit) {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  act(() => { document.dispatchEvent(event) })
  return event
}

describe('DataProtectionGuard — agent-only right-click / copy / devtools deterrent', () => {
  afterEach(() => {
    useAuthStore.getState().logout()
    document.body.classList.remove('select-none')
  })

  it('does nothing for an ADMIN — context menu and shortcuts stay enabled', () => {
    login('ADMIN')
    render(<DataProtectionGuard />)

    expect(fireContextMenu().defaultPrevented).toBe(false)
    expect(fireKeydown({ key: 'F12' }).defaultPrevented).toBe(false)
    expect(document.body.classList.contains('select-none')).toBe(false)
  })

  it('blocks the context menu and applies select-none for an AGENT', () => {
    login('AGENT')
    render(<DataProtectionGuard />)

    expect(fireContextMenu().defaultPrevented).toBe(true)
    expect(document.body.classList.contains('select-none')).toBe(true)
  })

  it('blocks F12 and Ctrl/Cmd+Shift+I/J/C devtools shortcuts for an AGENT', () => {
    login('AGENT')
    render(<DataProtectionGuard />)

    expect(fireKeydown({ key: 'F12' }).defaultPrevented).toBe(true)
    expect(fireKeydown({ key: 'I', ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(true)
    expect(fireKeydown({ key: 'J', metaKey: true, shiftKey: true }).defaultPrevented).toBe(true)
    expect(fireKeydown({ key: 'C', ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(true)
  })

  it('blocks Ctrl/Cmd+U, +S, and +C for an AGENT', () => {
    login('AGENT')
    render(<DataProtectionGuard />)

    expect(fireKeydown({ key: 'u', ctrlKey: true }).defaultPrevented).toBe(true)
    expect(fireKeydown({ key: 's', metaKey: true }).defaultPrevented).toBe(true)
    expect(fireKeydown({ key: 'c', ctrlKey: true }).defaultPrevented).toBe(true)
  })

  it('leaves unrelated keys alone for an AGENT', () => {
    login('AGENT')
    render(<DataProtectionGuard />)

    expect(fireKeydown({ key: 'Enter' }).defaultPrevented).toBe(false)
    expect(fireKeydown({ key: 'a', ctrlKey: true }).defaultPrevented).toBe(false)
  })

  it('removes listeners and select-none on unmount', () => {
    login('AGENT')
    const { unmount } = render(<DataProtectionGuard />)
    expect(document.body.classList.contains('select-none')).toBe(true)

    unmount()

    expect(document.body.classList.contains('select-none')).toBe(false)
    expect(fireContextMenu().defaultPrevented).toBe(false)
  })
})
