import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  page: number // 0-indexed
  totalPages: number
  totalElements: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, totalElements, pageSize, onPageChange }: Props) {
  if (totalElements === 0) return null

  const from = page * pageSize + 1
  const to = Math.min(totalElements, (page + 1) * pageSize)

  return (
    <div className="flex items-center justify-between px-1 py-3">
      <p className="text-xs text-[#516F90]">
        Showing <span className="font-semibold text-[#33475B]">{from}-{to}</span> of{' '}
        <span className="font-semibold text-[#33475B]">{totalElements}</span>
      </p>
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
