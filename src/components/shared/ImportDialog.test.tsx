import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ImportDialog } from './ImportDialog'
import type { ImportResult } from '@/api/import'

const importCustomers = vi.fn((_f: File) =>
  Promise.resolve({
    success: true, message: '3 created, 0 updated',
    data: {
      totalRows: 3, successCount: 3, createdCount: 3, updatedCount: 0, failureCount: 0, errors: [],
    } as ImportResult,
  }))

vi.mock('@/api/import', () => ({
  importApi: { importCustomers: (f: File) => importCustomers(f) },
}))

const toastSuccess = vi.fn()
const toastWarning = vi.fn()
const toastError = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    success: (m: string) => toastSuccess(m),
    warning: (m: string) => toastWarning(m),
    error: (m: string) => toastError(m),
  },
}))

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ImportDialog open onOpenChange={vi.fn()} />
    </QueryClientProvider>,
  )
}

function csvFile(name = 'customers.csv') {
  return new File(['Name,Phone\nAlice,9000000000'], name, { type: 'text/csv' })
}

describe('ImportDialog', () => {
  beforeEach(() => {
    importCustomers.mockClear()
    toastSuccess.mockClear()
    toastWarning.mockClear()
    toastError.mockClear()
  })

  it('rejects a file with an unsupported extension without uploading it', () => {
    // Real file inputs already filter by `accept`, so userEvent.upload won't offer a mismatched
    // file — but drag-and-drop bypasses that entirely, which is exactly why handleFile re-checks
    // the extension itself. fireEvent.change exercises that same handleFile path directly.
    renderDialog()

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['x'], 'customers.pdf', { type: 'application/pdf' })] } })

    expect(toastError).toHaveBeenCalledWith('Please upload an .xlsx or .csv file')
    expect(screen.getByRole('button', { name: /import customers/i })).toBeDisabled()
  })

  it('accepts a .csv file and enables the Import button', async () => {
    const user = userEvent.setup()
    renderDialog()

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, csvFile())

    expect(screen.getByText('customers.csv')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /import customers/i })).toBeEnabled()
  })

  it('uploads the selected file when Import Customers is clicked', async () => {
    const user = userEvent.setup()
    renderDialog()

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = csvFile()
    await user.upload(input, file)
    await user.click(screen.getByRole('button', { name: /import customers/i }))

    await waitFor(() => expect(importCustomers).toHaveBeenCalledWith(file))
  })

  it('shows the created/updated/failed summary after a successful import', async () => {
    const user = userEvent.setup()
    renderDialog()

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, csvFile())
    await user.click(screen.getByRole('button', { name: /import customers/i }))

    await waitFor(() => expect(screen.getByText('Total Rows')).toBeInTheDocument())
    expect(screen.getByText('Created')).toBeInTheDocument()
    expect(toastSuccess).toHaveBeenCalledWith('3 created, 0 updated')
  })

  it('lists row-level errors when some rows fail', async () => {
    importCustomers.mockResolvedValueOnce({
      success: true, message: '1 created, 1 failed',
      data: {
        totalRows: 2, successCount: 1, createdCount: 1, updatedCount: 0, failureCount: 1,
        errors: [{ row: 2, data: 'Bob,', message: 'Phone is required' }],
      },
    })
    const user = userEvent.setup()
    renderDialog()

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, csvFile())
    await user.click(screen.getByRole('button', { name: /import customers/i }))

    await waitFor(() => expect(screen.getByText('Phone is required')).toBeInTheDocument())
    expect(screen.getByText('#2')).toBeInTheDocument()
  })

  it('lets the user start over with "Import Another File" after a result is shown', async () => {
    const user = userEvent.setup()
    renderDialog()

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, csvFile())
    await user.click(screen.getByRole('button', { name: /import customers/i }))
    await waitFor(() => expect(screen.getByText('Total Rows')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /import another file/i }))
    expect(screen.getByText(/drop your file here/i)).toBeInTheDocument()
  })
})
