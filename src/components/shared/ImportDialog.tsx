import { useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Upload, X, Download, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react'
import { importApi, type ImportResult } from '@/api/import'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
}

const TEMPLATE = {
  filename: 'customers_template.csv',
  headers: ['Name', 'Plan', 'Last Year Premium', 'Expiry Date', 'Email', 'DOB', 'Phone', 'Address', 'Notes'],
  sample:  ['Rahul Sharma', 'AS F G+ 10L PD4 2A2C', '25448', '07-12-2026', 'rahul@email.com', '15-06-1985', '9876543210', 'Mumbai', 'Interested in premium plan'],
  requiredIndexes: [0, 6],
}

function downloadTemplate() {
  const csv = [TEMPLATE.headers.join(','), TEMPLATE.sample.join(',')].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = TEMPLATE.filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ImportDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile]         = useState<File | null>(null)
  const [result, setResult]     = useState<ImportResult | null>(null)
  const [dragging, setDragging] = useState(false)

  const reset = () => { setFile(null); setResult(null) }

  const mutation = useMutation({
    mutationFn: (f: File) => importApi.importCustomers(f),
    onSuccess: (res) => {
      setResult(res.data)
      qc.invalidateQueries({ queryKey: ['customers'] })
      if (res.data.failureCount === 0) {
        toast.success(res.message)
      } else if (res.data.successCount > 0) {
        toast.warning(res.message)
      } else {
        toast.error('Import failed — no rows were imported')
      }
    },
    onError: () => toast.error('Upload failed. Please try again.'),
  })

  const handleFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      toast.error('Please upload an .xlsx or .csv file')
      return
    }
    setFile(f)
    setResult(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <Dialog.Portal>
        <Dialog.Overlay className="hs-dialog-overlay" />
        <Dialog.Content className="hs-dialog-panel sm:max-w-2xl">

          {/* Header */}
          <div className="hs-dialog-header">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#E5F5F8] flex items-center justify-center">
                <FileSpreadsheet className="h-4 w-4 text-[#0091AE]" />
              </div>
              <Dialog.Title className="hs-dialog-title">Import Customers</Dialog.Title>
            </div>
            <Dialog.Close onClick={reset} className="btn-icon">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="px-6 py-5 space-y-5">

            {/* Template download */}
            <div className="flex items-start gap-3 rounded-lg bg-[#F5F8FA] border border-[#DFE3EB] p-4">
              <div className="w-8 h-8 rounded-lg bg-white border border-[#DFE3EB] flex items-center justify-center flex-shrink-0">
                <Download className="h-4 w-4 text-[#516F90]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#33475B]">Download Template</p>
                <p className="text-xs text-[#516F90] mt-0.5 mb-2">
                  Fill in this CSV template and upload it below. Required columns are marked *.
                </p>
                <div className="flex flex-wrap gap-1.5 text-[11px] mb-3">
                  {TEMPLATE.headers.map((h, i) => (
                    <span key={h}
                      className={`px-2 py-0.5 rounded-full border font-medium ${
                        TEMPLATE.requiredIndexes.includes(i)
                          ? 'bg-[#FFF3F0] text-[#FF7A59] border-[#FF7A59]/20'
                          : 'bg-[#F5F8FA] text-[#516F90] border-[#DFE3EB]'
                      }`}>
                      {h}{TEMPLATE.requiredIndexes.includes(i) ? ' *' : ''}
                    </span>
                  ))}
                </div>
                <button onClick={downloadTemplate} className="btn-secondary text-xs px-3 py-1.5">
                  <Download className="h-3.5 w-3.5" /> Download {TEMPLATE.filename}
                </button>
              </div>
            </div>

            {/* Drop zone */}
            {!result && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors ${
                  dragging
                    ? 'border-[#0091AE] bg-[#E5F5F8]'
                    : file
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-[#DFE3EB] hover:border-[#0091AE] hover:bg-[#F5F8FA]'
                }`}
              >
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
                  className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                {file ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-[#33475B]">{file.name}</p>
                      <p className="text-xs text-[#516F90]">{(file.size / 1024).toFixed(1)} KB · click to change</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-[#F5F8FA] border border-[#DFE3EB] flex items-center justify-center">
                      <Upload className="h-5 w-5 text-[#B0C1D4]" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-[#33475B]">Drop your file here, or click to browse</p>
                      <p className="text-xs text-[#516F90] mt-0.5">Supports .xlsx and .csv</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="space-y-3">
                {/* Summary bar */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Total Rows', value: result.totalRows,    color: 'text-[#33475B]',    bg: 'bg-[#F5F8FA]' },
                    { label: 'Created',    value: result.createdCount, color: 'text-emerald-700',  bg: 'bg-emerald-50' },
                    { label: 'Updated',    value: result.updatedCount, color: 'text-[#0091AE]',    bg: 'bg-[#E5F5F8]' },
                    { label: 'Failed',     value: result.failureCount, color: 'text-red-600',      bg: 'bg-red-50' },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} className={`rounded-lg ${bg} border border-[#DFE3EB] p-3 text-center`}>
                      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
                      <p className="text-xs text-[#516F90] mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Error table */}
                {result.errors.length > 0 && (
                  <div>
                    <p className="flex items-center gap-2 text-xs font-semibold text-red-600 mb-2">
                      <AlertCircle className="h-3.5 w-3.5" /> {result.errors.length} row{result.errors.length > 1 ? 's' : ''} failed
                    </p>
                    <div className="hs-table-wrap max-h-52 overflow-y-auto">
                      <table className="hs-table">
                        <thead>
                          <tr>
                            <th className="hs-th w-16">Row</th>
                            <th className="hs-th">Data</th>
                            <th className="hs-th">Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.errors.map((e) => (
                            <tr key={e.row} className="hs-tr">
                              <td className="hs-td font-mono text-xs text-[#516F90]">#{e.row}</td>
                              <td className="hs-td text-xs text-[#516F90] max-w-[180px] truncate">{e.data}</td>
                              <td className="hs-td text-xs text-red-600 font-medium">{e.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="hs-dialog-footer">
            {result ? (
              <>
                <button onClick={reset} className="btn-secondary">Import Another File</button>
                <Dialog.Close onClick={reset} className="btn-primary">Done</Dialog.Close>
              </>
            ) : (
              <>
                <Dialog.Close onClick={reset} className="btn-secondary">Cancel</Dialog.Close>
                <button
                  onClick={() => file && mutation.mutate(file)}
                  disabled={!file || mutation.isPending}
                  className="btn-primary"
                >
                  {mutation.isPending
                    ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Importing…</>
                    : <><Upload className="h-4 w-4" /> Import Customers</>}
                </button>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
