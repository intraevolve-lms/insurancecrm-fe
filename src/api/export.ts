import api from '@/lib/axios'

async function downloadBlob(url: string, params: Record<string, string>, filename: string) {
  const res = await api.get(url, { params, responseType: 'blob' })
  const blob = new Blob([res.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(href)
}

export const exportApi = {
  exportCustomers: (agentId?: string) =>
    downloadBlob('/export/customers', agentId ? { agentId } : {}, `customers_${today()}.xlsx`),
}

function today() {
  return new Date().toISOString().slice(0, 10)
}
