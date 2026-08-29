import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  page: number // 0-indexed
  totalPages: number
  totalElements: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export function Pagination({ page, totalPages, totalElements, pageSize, onPageChange, onPageSizeChange }: Props) {
  const [sizeInput, setSizeInput] = useState(String(pageSize))

  // Keep the input in sync when the page size changes elsewhere (e.g. reset on filter change).
  useEffect(() => setSizeInput(String(pageSize)), [pageSize])

  if (totalElements === 0) return null

  const from = page * pageSize + 1
  const to = Math.min(totalElements, (page + 1) * pageSize)

  const commitSizeInput = () => {
    const parsed = parseInt(sizeInput, 10)
    if (Number.isFinite(parsed) && parsed > 0 && parsed !== pageSize) {
      onPageSizeChange(parsed)
    } else {
      setSizeInput(String(pageSize))
    }
  }

  return (
    <div className="flex items-center justify-between px-1 py-3">
      <div className="flex items-center gap-4">
        <p className="text-xs text-[#516F90]">
          Showing <span className="font-semibold text-[#33475B]">{from}-{to}</span> of{' '}
          <span className="font-semibold text-[#33475B]">{totalElements}</span>
        </p>
        <label className="flex items-center gap-1.5 text-xs text-[#516F90]">
          Per page
          <input
            type="number"
            min={1}
            className="form-input w-16 py-1 px-2 text-xs"
            value={sizeInput}
            onChange={(e) => setSizeInput(e.target.value)}
            onBlur={commitSizeInput}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          />
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="btn-secondary text-xs px-2.5 py-1.5"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Previous
        </button>
        <span className="text-xs text-[#516F90] px-1">
          Page <span className="font-semibold text-[#33475B]">{page + 1}</span> of{' '}
          <span className="font-semibold text-[#33475B]">{totalPages}</span>
        </span>
        <button
          className="btn-secondary text-xs px-2.5 py-1.5"
          disabled={page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
