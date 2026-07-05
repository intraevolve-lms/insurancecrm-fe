import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void
  loading?: boolean
  destructive?: boolean
}

export function ConfirmDialog({
  open, onOpenChange, title, description, onConfirm, loading, destructive,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="hs-dialog-overlay" />
        <Dialog.Content className="hs-dialog-panel sm:max-w-md">
          <div className="hs-dialog-header">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${destructive ? 'bg-red-50' : 'bg-[#FFF3F0]'}`}>
                <AlertTriangle className={`h-4 w-4 ${destructive ? 'text-red-500' : 'text-[#FF7A59]'}`} />
              </div>
              <Dialog.Title className="hs-dialog-title">{title}</Dialog.Title>
            </div>
            <Dialog.Close className="btn-icon rounded">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="px-6 py-5">
            <p className="text-sm text-[#516F90] leading-relaxed">{description}</p>
          </div>

          <div className="hs-dialog-footer">
            <Dialog.Close asChild>
              <button className="btn-secondary" disabled={loading}>Cancel</button>
            </Dialog.Close>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={destructive ? 'btn-danger' : 'btn-primary'}
            >
              {loading
                ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                : destructive ? 'Delete' : 'Confirm'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
