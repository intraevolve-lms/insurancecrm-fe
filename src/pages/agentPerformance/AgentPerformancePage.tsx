import { useQuery } from '@tanstack/react-query'
import { Award } from 'lucide-react'
import { format } from 'date-fns'
import { agentPerformanceApi } from '@/api/agentPerformance'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { OUTCOME_META } from '@/components/shared/CommunicationTimeline'
import type { AgentPerformance } from '@/types/agentPerformance'
import type { CommunicationOutcome } from '@/types/communication'

const OUTCOME_COLUMNS: CommunicationOutcome[] = [
  'MY_CALLBACK', 'CALLBACK', 'PROSPECT', 'RINGING', 'SWITCH_OFF', 'HANG_UP', 'NEXT_YEAR', 'LANGUAGE_ISSUE',
]

const OUTCOME_FIELD: Partial<Record<CommunicationOutcome, keyof AgentPerformance>> = {
  MY_CALLBACK: 'myCallback',
  CALLBACK: 'callback',
  PROSPECT: 'prospect',
  RINGING: 'ringing',
  SWITCH_OFF: 'switchOff',
  HANG_UP: 'hangUp',
  NEXT_YEAR: 'nextYear',
  LANGUAGE_ISSUE: 'languageIssue',
}

export default function AgentPerformancePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['agent-performance'],
    queryFn: () => agentPerformanceApi.getAll(),
  })

  const agents = data?.data ?? []

  if (isLoading) return <LoadingSpinner className="py-32" />

  if (isError) {
    return (
      <div className="p-6">
        <PageHeader title="Agent Performance" description="Call-outcome funnel by agent" />
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load agent performance. Please try again.
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Agent Performance" description="Call-outcome funnel by agent, sourced from Log Activity" />

      {agents.length === 0 ? (
        <EmptyState
          icon={<Award className="h-6 w-6" />}
          title="No agent activity yet"
          description="Stats appear once agents start logging activity on customers"
        />
      ) : (
        <div className="hs-table-wrap">
          <table className="hs-table">
            <thead>
              <tr>
                <th className="hs-th">Agent</th>
                <th className="hs-th text-right">Total Customers</th>
                {OUTCOME_COLUMNS.map((o) => (
                  <th key={o} className="hs-th text-right whitespace-nowrap">{OUTCOME_META[o].label}</th>
                ))}
                <th className="hs-th whitespace-nowrap">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.agentId} className="hs-tr">
                  <td className="hs-td font-semibold text-[#33475B] whitespace-nowrap">{a.agentName}</td>
                  <td className="hs-td text-right text-[#33475B] font-medium">{a.totalCustomers}</td>
                  {OUTCOME_COLUMNS.map((o) => (
                    <td key={o} className="hs-td text-right">
                      <span className={`hs-badge border ${OUTCOME_META[o].bg} ${OUTCOME_META[o].color}`}>
                        {a[OUTCOME_FIELD[o]!]}
                      </span>
                    </td>
                  ))}
                  <td className="hs-td text-[#516F90] text-xs whitespace-nowrap">
                    {a.lastActivityAt ? format(new Date(a.lastActivityAt), 'dd MMM yyyy, h:mm a') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
