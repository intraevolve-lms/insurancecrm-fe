import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import { Plus, X, Pencil, UserX, Trash2, Users, ShieldAlert, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { usersApi } from '@/api/users'
import type { CreateUserRequest } from '@/api/users'
import { useAuthStore } from '@/store/authStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import type { User, Role } from '@/types/auth'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="form-label">{label}</label>
      {children}
    </div>
  )
}

const EMPTY_FORM: CreateUserRequest = {
  name: '',
  email: '',
  password: '',
  role: 'AGENT',
}

function UserFormDialog({
  open,
  onOpenChange,
  initial,
  onSave,
  loading,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: User | null
  onSave: (data: CreateUserRequest) => void
  loading: boolean
}) {
  const [form, setForm] = useState<CreateUserRequest>(EMPTY_FORM)
  const isEdit = !!initial

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? { name: initial.name, email: initial.email, password: '', role: initial.role }
          : EMPTY_FORM,
      )
    }
  }, [open, initial])

  const set = <K extends keyof CreateUserRequest>(k: K, v: string) =>
    setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Name is required'); return }
    if (!form.email.trim()) { toast.error('Email is required'); return }
    if (!isEdit && !form.password) { toast.error('Password is required'); return }
    onSave(form)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="hs-dialog-overlay" />
        <Dialog.Content className="hs-dialog-panel max-w-lg">
          <div className="hs-dialog-header">
            <Dialog.Title className="hs-dialog-title">
              {isEdit ? 'Edit User' : 'Create User'}
            </Dialog.Title>
            <Dialog.Close className="btn-ghost btn-icon">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <Field label="Name *">
              <input className="form-input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Full name" />
            </Field>
            <Field label="Email *">
              <input className="form-input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="user@example.com" />
            </Field>
            <Field label={isEdit ? 'Password (leave blank to keep current)' : 'Password *'}>
              <input className="form-input" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="••••••••" />
            </Field>
            <Field label="Role *">
              <select className="form-select" value={form.role} onChange={(e) => set('role', e.target.value)}>
                <option value="AGENT">AGENT</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </Field>
            <div className="hs-dialog-footer">
              <Dialog.Close asChild>
                <button type="button" className="btn-secondary">Cancel</button>
              </Dialog.Close>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : isEdit ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

const roleBadge: Record<Role, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  AGENT: 'bg-[#F5F8FA] text-[#0091AE]',
}

export default function UsersPage() {
  const { role } = useAuthStore()
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  const isAdmin = role === 'ADMIN'

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
    enabled: isAdmin,
  })

  const users: User[] = data?.data ?? []
  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] })

  const createMutation = useMutation({
    mutationFn: (d: CreateUserRequest) => usersApi.create(d),
    onSuccess: () => { toast.success('User created'); setDialogOpen(false); invalidate() },
    onError: () => toast.error('Failed to create user'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateUserRequest }) =>
      usersApi.update(id, data),
    onSuccess: () => { toast.success('User updated'); setDialogOpen(false); invalidate() },
    onError: () => toast.error('Failed to update user'),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => { toast.success('User deactivated'); setDeactivateTarget(null); invalidate() },
    onError: () => toast.error('Failed to deactivate user'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => { toast.success('User permanently deleted'); setDeleteTarget(null); invalidate() },
    onError: () => toast.error('Failed to delete user'),
  })

  const forceLogoutMutation = useMutation({
    mutationFn: (userIds: string[]) => usersApi.forceLogout(userIds),
    onSuccess: (_, userIds) => {
      toast.success(`Logged out ${userIds.length} agent${userIds.length === 1 ? '' : 's'}`)
      setLogoutConfirmOpen(false)
      setSelectedAgentIds([])
    },
    onError: () => toast.error('Failed to log out selected agents'),
  })

  const agents = users.filter((u) => u.role === 'AGENT')
  const allAgentsSelected = agents.length > 0 && selectedAgentIds.length === agents.length

  const toggleAgent = (id: string) =>
    setSelectedAgentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const toggleAllAgents = () =>
    setSelectedAgentIds(allAgentsSelected ? [] : agents.map((u) => u.id))

  if (!isAdmin) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-32 gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
          <ShieldAlert className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-[#33475B]">Access Denied</h2>
        <p className="text-sm text-[#516F90]">You don't have permission to view this page.</p>
      </div>
    )
  }

  const openCreate = () => { setEditingUser(null); setDialogOpen(true) }
  const openEdit = (u: User) => { setEditingUser(u); setDialogOpen(true) }

  const handleSave = (form: CreateUserRequest) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="p-6">
      <PageHeader
        title="User Management"
        action={
          <div className="flex items-center gap-2">
            {selectedAgentIds.length > 0 && (
              <button onClick={() => setLogoutConfirmOpen(true)} className="btn-secondary text-red-600">
                <LogOut className="h-4 w-4" /> Log Out Selected ({selectedAgentIds.length})
              </button>
            )}
            <button onClick={openCreate} className="btn-primary">
              <Plus className="h-4 w-4" /> Create User
            </button>
          </div>
        }
      />

      {isLoading ? (
        <LoadingSpinner className="py-24" />
      ) : users.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No users found"
          action={
            <button onClick={openCreate} className="btn-primary">
              <Plus className="h-4 w-4" /> Create User
            </button>
          }
        />
      ) : (
        <div className="hs-table-wrap">
          <table className="hs-table">
            <thead>
              <tr className="border-b border-[#DFE3EB] bg-[#F5F8FA]">
                <th className="hs-th w-10">
                  <input
                    type="checkbox"
                    checked={allAgentsSelected}
                    onChange={toggleAllAgents}
                    disabled={agents.length === 0}
                    aria-label="Select all agents"
                  />
                </th>
                {['Name', 'Email', 'Role', 'Status', 'Created', 'Actions'].map((h) => (
                  <th key={h} className="hs-th whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DFE3EB]">
              {users.map((u) => (
                <tr key={u.id} className="hs-tr">
                  <td className="hs-td">
                    {u.role === 'AGENT' && (
                      <input
                        type="checkbox"
                        checked={selectedAgentIds.includes(u.id)}
                        onChange={() => toggleAgent(u.id)}
                        aria-label={`Select ${u.name}`}
                      />
                    )}
                  </td>
                  <td className="hs-td font-medium text-[#33475B]">{u.name}</td>
                  <td className="hs-td text-[#516F90]">{u.email}</td>
                  <td className="hs-td">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadge[u.role]}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="hs-td">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        u.active
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-[#F5F8FA] text-[#B0C1D4]'
                      }`}
                    >
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="hs-td text-[#516F90]">
                    {format(new Date(u.createdAt), 'dd MMM yyyy')}
                  </td>
                  <td className="hs-td">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-[#516F90] hover:bg-[#F5F8FA] transition"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      {u.active ? (
                        <button
                          onClick={() => setDeactivateTarget(u)}
                          className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                        >
                          <UserX className="h-3.5 w-3.5" /> Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UserFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editingUser}
        onSave={handleSave}
        loading={isSaving}
      />

      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(v) => { if (!v) setDeactivateTarget(null) }}
        title="Deactivate User"
        description={`Deactivate "${deactivateTarget?.name}" (${deactivateTarget?.email})? They will lose access to the system.`}
        onConfirm={() => deactivateTarget && deactivateMutation.mutate(deactivateTarget.id)}
        loading={deactivateMutation.isPending}
        destructive
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}
        title="Delete User Permanently"
        description={`Permanently delete "${deleteTarget?.name}" (${deleteTarget?.email})? This cannot be undone — their account and login are gone for good. The email will become available for a new account.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        destructive
        confirmLabel="Delete Permanently"
      />

      <ConfirmDialog
        open={logoutConfirmOpen}
        onOpenChange={setLogoutConfirmOpen}
        title="Log Out Selected Agents"
        description={`End the active session${selectedAgentIds.length === 1 ? '' : 's'} for ${selectedAgentIds.length} selected agent${selectedAgentIds.length === 1 ? '' : 's'} right now? They'll be signed out immediately and need to log in again.`}
        onConfirm={() => forceLogoutMutation.mutate(selectedAgentIds)}
        loading={forceLogoutMutation.isPending}
        destructive
        confirmLabel="Log Out"
      />
    </div>
  )
}
