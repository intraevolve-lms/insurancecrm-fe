import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlertTriangle, X } from 'lucide-react'
import { customersApi } from '@/api/customers'
import { usersApi } from '@/api/users'
import type { User } from '@/types/auth'

interface Props {
  target: User | null
  action: 'deactivate' | 'delete'
  agents: User[]
  onOpenChange: (v: boolean) => void
  onDone: () => void
}

const COPY = {
  deactivate: {
    title: 'Deactivate User',
    confirmLabel: 'Deactivate',
    actionLabel: 'deactivated',
    failMessage: 'Failed to deactivate user',
    warningTail: 'They will stay assigned to this now-inactive account unless reassigned.',
  },
  delete: {
    title: 'Delete User Permanently',
    confirmLabel: 'Delete Permanently',
    actionLabel: 'permanently deleted',
    failMessage: 'Failed to delete user',
    warningTail: 'They will show as Unassigned unless reassigned.',
  },
}

// Warns an admin how many customers are currently assigned to the user they're about to
// deactivate/delete, and offers an inline bulk-reassign before the action completes — neither
// step is auto-cascaded server-side, so this is the only guard rail against silently stranding
// a departed agent's whole book of customers with a dangling assignedAgentId.
export function OffboardUserDialog({ target, action, agents, onOpenChange, onDone }: Props) {
  const [reassignTo, setReassignTo] = useState('')
  const copy = COPY[action]

  useEffect(() => {
    if (target) setReassignTo('')
  }, [target])

  const { data: countData } = useQuery({
    queryKey: ['customers', 'assigned-count', target?.id],
    queryFn: () => customersApi.getAll({ assignedAgentId: target!.id, page: 0, size: 1 }),
    enabled: !!target,
  })
  const assignedCount = countData?.data.totalElements ?? 0

  const mutation = useMutation({
    mutationFn: async () => {
      if (!target) return null
      let reassigned: { count: number; agentName: string } | null = null
      if (reassignTo) {
        const res = await customersApi.reassignAllAgent(target.id, reassignTo)
        reassigned = { count: res.data.reassignedCount, agentName: res.data.toAgentName }
      }
      if (action === 'deactivate') await usersApi.deactivate(target.id)
      else await usersApi.delete(target.id)
      return reassigned
    },
    onSuccess: (reassigned) => {
      if (reassigned && reassigned.count > 0) {
        toast.success(
          `${reassigned.count} customer${reassigned.count !== 1 ? 's' : ''} reassigned to ${reassigned.agentName}. User ${copy.actionLabel}.`,
        )
      } else {
        toast.success(`User ${copy.actionLabel}`)
      }
      onDone()
    },
    onError: () => toast.error(copy.failMessage),
  })

  const reassignCandidates = agents.filter((a) => a.id !== target?.id && a.active)

  return (
    <Dialog.Root open={!!target} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="hs-dialog-overlay" />
        <Dialog.Content className="hs-dialog-panel sm:max-w-md">
          <div className="hs-dialog-header">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              <Dialog.Title className="hs-dialog-title">{copy.title}</Dialog.Title>
            </div>
            <Dialog.Close className="btn-icon rounded">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-[#516F90] leading-relaxed">
              {action === 'deactivate'
                ? `Deactivate "${target?.name}" (${target?.email})? They will lose access to the system.`
                : `Permanently delete "${target?.name}" (${target?.email})? This cannot be undone — their account and login are gone for good. The email will become available for a new account.`}
            </p>

            {assignedCount > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
                <p className="text-sm font-medium text-amber-800">
                  {assignedCount} customer{assignedCount !== 1 ? 's are' : ' is'} currently assigned to {target?.name}. {copy.warningTail}
                </p>
                <div className="flex flex-col gap-1">
                  <label className="form-label">Reassign their customers to</label>
                  <select className="form-select" value={reassignTo} onChange={(e) => setReassignTo(e.target.value)}>
                    <option value="">— Leave unassigned —</option>
                    {reassignCandidates.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="hs-dialog-footer">
            <Dialog.Close asChild>
              <button className="btn-secondary" disabled={mutation.isPending}>Cancel</button>
            </Dialog.Close>
            <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-danger">
              {mutation.isPending
                ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                : copy.confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
