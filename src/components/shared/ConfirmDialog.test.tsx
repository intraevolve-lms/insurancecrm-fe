import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  it('renders the title and description', () => {
    render(
      <ConfirmDialog open title="Delete customer" description="This cannot be undone."
        onOpenChange={vi.fn()} onConfirm={vi.fn()} />,
    )
    expect(screen.getByText('Delete customer')).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    render(
      <ConfirmDialog open={false} title="Delete customer" description="This cannot be undone."
        onOpenChange={vi.fn()} onConfirm={vi.fn()} />,
    )
    expect(screen.queryByText('Delete customer')).not.toBeInTheDocument()
  })

  it('calls onConfirm when the confirm button is clicked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog open title="Delete customer" description="This cannot be undone."
        onOpenChange={vi.fn()} onConfirm={onConfirm} />,
    )
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('defaults to "Confirm" label; destructive defaults to "Delete"', () => {
    const { rerender } = render(
      <ConfirmDialog open title="t" description="d" onOpenChange={vi.fn()} onConfirm={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()

    rerender(
      <ConfirmDialog open destructive title="t" description="d" onOpenChange={vi.fn()} onConfirm={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('uses a custom confirmLabel when provided', () => {
    render(
      <ConfirmDialog open title="t" description="d" confirmLabel="Deactivate"
        onOpenChange={vi.fn()} onConfirm={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeInTheDocument()
  })

  it('disables both Cancel and confirm buttons while loading', () => {
    render(
      <ConfirmDialog open loading title="t" description="d" onOpenChange={vi.fn()} onConfirm={vi.fn()} />,
    )
    const buttons = screen.getAllByRole('button')
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(buttons[buttons.length - 1]).toBeDisabled() // confirm button, its label replaced by a spinner
  })

  it('calls onOpenChange(false) when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <ConfirmDialog open title="t" description="d" onOpenChange={onOpenChange} onConfirm={vi.fn()} />,
    )
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
