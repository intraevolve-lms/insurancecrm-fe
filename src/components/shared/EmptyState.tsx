interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      {icon && (
        <div className="w-14 h-14 rounded-full bg-[#F5F8FA] border border-[#DFE3EB] flex items-center justify-center mb-4 text-[#B0C1D4]">
          {icon}
        </div>
      )}
      <p className="text-[15px] font-semibold text-[#33475B] mb-1">{title}</p>
      {description && <p className="text-sm text-[#516F90] mb-5 max-w-xs leading-relaxed">{description}</p>}
      {action}
    </div>
  )
}
