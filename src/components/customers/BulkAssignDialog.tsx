import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { X, UserCog, AlertCircle } from 'lucide-react'
import { customersApi } from '@/api/customers'
import type { BulkAssignResult } from '@/types/customer'
import type { User } from '@/types/auth'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  customerIds: string[]
  customerNames: string[]
  agents: User[]
  onAssigned: () => void
}

export function BulkAssignDialog({ open, onOpenChange, customerIds, customerNames, agents, onAssigned }: Props) {
  const [agentId, setAgentId] = useState('')
  const [result, setResult] = useState<BulkAssignResult | null>(null)

  useEffect(() => {
    if (open) { setAgentId(''); setResult(null) }
  }, [open])

  const mutation = useMutation({
    mutationFn: () => customersApi.bulkAssignAgent(customerIds, agentId),
    onSuccess: (res) => {
      setResult(res.data)
      if (res.data.notFoundCustomerIds.length === 0) {
        toast.success(`${res.data.assignedCount} customer${res.data.assignedCount !== 1 ? 's' : ''} assigned to ${res.data.agentName}`)
      } else if (res.data.assignedCount > 0) {
        toast.warning(`Assigned ${res.data.assignedCount} of ${res.data.requestedCount} — some customers were not found`)
      } else {
        toast.error('No customers were assigned — none of the selected customers could be found')
      }
    },
    onError: () => toast.error('Failed to assign agent'),
  })

  const preview = customerNames.length <= 3
    ? customerNames.join(', ')
    : `${customerNames.slice(0, 3).join(', ')} and ${customerNames.length - 3} more`

  const handleClose = (v: boolean) => {
    if (!v && result) onAssigned()
    onOpenChange(v)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="hs-dialog-overlay" />
        <Dialog.Content className="hs-dialog-panel sm:max-w-sm">
          <div className="hs-dialog-header">
            <Dialog.Title className="hs-dialog-title">Assign to Agent</Dialog.Title>
            <Dialog.Close className="btn-icon"><X className="h-4 w-4" /></Dialog.Close>
          </div>

          {!result ? (
            <>
              <div className="p-5 space-y-4">
                <p className="text-xs text-[#516F90]">
                  Assigning <span className="font-semibold text-[#33475B]">{customerIds.length}</span> customer{customerIds.length !== 1 ? 's' : ''}: {preview}
                </p>
                <div className="flex flex-col gap-1">
                  <label className="form-label">Select agent</label>
                  <select className="form-select" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                    <option value="">— Select an agent —</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="hs-dialog-footer">
                <Dialog.Close asChild><button className="btn-secondary">Cancel</button></Dialog.Close>
                <button
                  className="btn-primary"
                  disabled={!agentId || mutation.isPending}
                  onClick={() => mutation.mutate()}
                >
                  {mutation.isPending
                    ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    : <><UserCog className="h-4 w-4" /> Assign</>
                  }
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Requested', value: result.requestedCount, color: 'text-[#33475B]', bg: 'bg-[#F5F8FA]' },
                    { label: 'Assigned', value: result.assignedCount, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                    { label: 'Skipped', value: result.notFoundCustomerIds.length, color: 'text-red-600', bg: 'bg-red-50' },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} className={`rounded-lg ${bg} border border-[#DFE3EB] p-3 text-center`}>
                      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
                      <p className="text-xs text-[#516F90] mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
                {result.notFoundCustomerIds.length > 0 && (
                  <p className="flex items-start gap-2 text-xs text-red-600">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    {result.notFoundCustomerIds.length} selected customer{result.notFoundCustomerIds.length !== 1 ? 's' : ''} could not be found and were skipped.
                  </p>
                )}
              </div>
              <div className="hs-dialog-footer">
                <Dialog.Close asChild><button className="btn-primary">Done</button></Dialog.Close>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
