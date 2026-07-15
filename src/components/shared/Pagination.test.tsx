import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('renders nothing when there are zero elements', () => {
    const { container } = render(
      <Pagination page={0} totalPages={0} totalElements={0} pageSize={20} onPageChange={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the correct "from-to of total" range on the first page', () => {
    render(<Pagination page={0} totalPages={3} totalElements={45} pageSize={20} onPageChange={vi.fn()} />)
    expect(screen.getByText('1-20')).toBeInTheDocument()
    expect(screen.getByText('45')).toBeInTheDocument()
  })

  it('caps the "to" value at totalElements on a partial last page', () => {
    render(<Pagination page={2} totalPages={3} totalElements={45} pageSize={20} onPageChange={vi.fn()} />)
    expect(screen.getByText('41-45')).toBeInTheDocument()
  })

  it('shows the 1-indexed current page out of total pages', () => {
    render(<Pagination page={1} totalPages={3} totalElements={45} pageSize={20} onPageChange={vi.fn()} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('disables Previous on the first page and Next on the last page', () => {
    const { rerender } = render(
      <Pagination page={0} totalPages={3} totalElements={45} pageSize={20} onPageChange={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled()

    rerender(<Pagination page={2} totalPages={3} totalElements={45} pageSize={20} onPageChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /previous/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('calls onPageChange with page - 1 when Previous is clicked', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<Pagination page={1} totalPages={3} totalElements={45} pageSize={20} onPageChange={onPageChange} />)

    await user.click(screen.getByRole('button', { name: /previous/i }))
    expect(onPageChange).toHaveBeenCalledWith(0)
  })

  it('calls onPageChange with page + 1 when Next is clicked', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<Pagination page={0} totalPages={3} totalElements={45} pageSize={20} onPageChange={onPageChange} />)

    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('treats a single full page as both first and last (both buttons disabled)', () => {
    render(<Pagination page={0} totalPages={1} totalElements={10} pageSize={20} onPageChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })
})
