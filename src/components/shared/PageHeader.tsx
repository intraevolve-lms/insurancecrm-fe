interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="hs-page-header">
      <div>
        <h2 className="text-lg font-bold text-[#33475B] tracking-tight">{title}</h2>
        {description && <p className="text-sm text-[#516F90] mt-0.5">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
