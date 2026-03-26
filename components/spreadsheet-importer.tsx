'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, Check, AlertCircle, Loader2, X, ArrowRight } from 'lucide-react'
import { importRows, ImportRow } from '@/lib/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Step = 'upload' | 'map' | 'preview' | 'done'

const IMPORT_FIELDS: { key: keyof ImportRow; label: string; required: boolean }[] = [
  { key: 'family_name', label: 'Family Name', required: true },
  { key: 'first_name', label: 'First Name', required: true },
  { key: 'last_name', label: 'Last Name', required: true },
  { key: 'role', label: 'Role (head/spouse/child/other)', required: false },
  { key: 'mailing_address', label: 'Street Address', required: false },
  { key: 'city', label: 'City', required: false },
  { key: 'state', label: 'State', required: false },
  { key: 'zip', label: 'ZIP Code', required: false },
  { key: 'phone', label: 'Phone', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'member_since', label: 'Member Since (YYYY-MM-DD)', required: false },
  { key: 'bio', label: 'Bio', required: false },
]

export function SpreadsheetImporter() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('upload')
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Partial<Record<keyof ImportRow, string>>>({})
  const [mappedRows, setMappedRows] = useState<ImportRow[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null)

  function parseFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array', dateNF: 'yyyy-mm-dd' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, {
          raw: false,
          dateNF: 'yyyy-mm-dd',
        })

        if (json.length === 0) {
          toast.error('The spreadsheet appears to be empty')
          return
        }

        const cols = Object.keys(json[0])
        setHeaders(cols)
        setRawRows(json)
        setFileName(file.name)

        // Auto-map columns by fuzzy name match
        const autoMap: Partial<Record<keyof ImportRow, string>> = {}
        for (const field of IMPORT_FIELDS) {
          const match = cols.find(
            (col) =>
              col.toLowerCase().replace(/[\s_-]/g, '') ===
              field.key.toLowerCase().replace(/[\s_-]/g, '')
          )
          if (match) autoMap[field.key] = match
        }
        setMapping(autoMap)
        setStep('map')
      } catch {
        toast.error('Could not read the file. Make sure it is a valid .xlsx or .csv.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) parseFile(file)
  }, [])

  function buildMappedRows(): ImportRow[] {
    return rawRows.map((row) => {
      const mapped: Partial<ImportRow> = {}
      for (const field of IMPORT_FIELDS) {
        const col = mapping[field.key]
        if (col) mapped[field.key] = row[col] ?? ''
      }
      return mapped as ImportRow
    }).filter((r) => r.family_name && r.first_name && r.last_name)
  }

  function handlePreview() {
    const required = IMPORT_FIELDS.filter((f) => f.required)
    const missing = required.filter((f) => !mapping[f.key])
    if (missing.length > 0) {
      toast.error(`Please map the required fields: ${missing.map((f) => f.label).join(', ')}`)
      return
    }
    const rows = buildMappedRows()
    if (rows.length === 0) {
      toast.error('No valid rows found after mapping. Check required field columns.')
      return
    }
    setMappedRows(rows)
    setStep('preview')
  }

  async function handleImport() {
    setImporting(true)
    try {
      const res = await importRows(mappedRows)
      setResult(res)
      setStep('done')
      if (res.errors.length === 0) {
        toast.success(`Imported ${res.imported} members successfully`)
      } else {
        toast.warning(`Imported ${res.imported} members with ${res.errors.length} errors`)
      }
      router.refresh()
    } catch {
      toast.error('Import failed')
    } finally {
      setImporting(false)
    }
  }

  function reset() {
    setStep('upload')
    setFileName('')
    setHeaders([])
    setRawRows([])
    setMapping({})
    setMappedRows([])
    setResult(null)
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(['upload', 'map', 'preview', 'done'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                step === s
                  ? 'bg-blue-700 text-white'
                  : ['map', 'preview', 'done'].indexOf(s) <= ['map', 'preview', 'done'].indexOf(step)
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-400'
              )}
            >
              {i + 1}
            </div>
            <span
              className={cn(
                'capitalize',
                step === s ? 'font-medium text-slate-800' : 'text-slate-400'
              )}
            >
              {s}
            </span>
            {i < 3 && <ArrowRight className="h-3 w-3 text-slate-300" />}
          </div>
        ))}
      </div>

      {/* Step: Upload */}
      {step === 'upload' && (
        <Card>
          <CardContent className="pt-6">
            <label
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 transition-colors',
                dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              )}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                <FileSpreadsheet className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-center">
                <p className="font-medium text-slate-700">
                  Drop your spreadsheet here, or <span className="text-blue-600">browse</span>
                </p>
                <p className="mt-1 text-sm text-slate-400">Supports .xlsx and .csv files</p>
              </div>
              <input
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={handleFileInput}
              />
            </label>

            <div className="mt-6 rounded-lg bg-slate-50 p-4">
              <p className="mb-2 text-sm font-medium text-slate-700">Expected columns (any order, any names):</p>
              <div className="flex flex-wrap gap-1.5">
                {IMPORT_FIELDS.map((f) => (
                  <Badge key={f.key} variant={f.required ? 'default' : 'secondary'} className="text-xs">
                    {f.label}
                    {f.required && ' *'}
                  </Badge>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-400">* Required fields</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Map columns */}
      {step === 'map' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Map Columns</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  <span className="font-medium">{fileName}</span> · {rawRows.length} rows detected
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="mr-1.5 h-3.5 w-3.5" />
                Start over
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {IMPORT_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center gap-4">
                <div className="w-52 shrink-0">
                  <p className="text-sm font-medium text-slate-700">
                    {field.label}
                    {field.required && <span className="ml-0.5 text-red-500">*</span>}
                  </p>
                </div>
                <Select
                  value={mapping[field.key] ?? '__none__'}
                  onValueChange={(v) =>
                    setMapping((prev) => ({
                      ...prev,
                      [field.key]: v === '__none__' ? undefined : v,
                    }))
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="— skip this field —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— skip this field —</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <Button className="bg-blue-700 hover:bg-blue-800" onClick={handlePreview}>
                Preview import
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Preview</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  {mappedRows.length} members across{' '}
                  {new Set(mappedRows.map((r) => r.family_name)).size} families
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep('map')}>
                <X className="mr-1.5 h-3.5 w-3.5" />
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {['Family', 'First Name', 'Last Name', 'Role', 'Phone', 'Email'].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {mappedRows.slice(0, 50).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-700">{row.family_name}</td>
                      <td className="px-3 py-2 text-slate-600">{row.first_name}</td>
                      <td className="px-3 py-2 text-slate-600">{row.last_name}</td>
                      <td className="px-3 py-2 text-slate-500">{row.role || '—'}</td>
                      <td className="px-3 py-2 text-slate-500">{row.phone || '—'}</td>
                      <td className="px-3 py-2 text-slate-500">{row.email || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {mappedRows.length > 50 && (
              <p className="mt-2 text-xs text-slate-400">
                Showing first 50 of {mappedRows.length} rows. All rows will be imported.
              </p>
            )}
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setStep('map')}>
                Back
              </Button>
              <Button
                className="bg-blue-700 hover:bg-blue-800"
                onClick={handleImport}
                disabled={importing}
              >
                {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Upload className="mr-2 h-4 w-4" />
                Import {mappedRows.length} members
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Done */}
      {step === 'done' && result && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div
                className={cn(
                  'flex h-16 w-16 items-center justify-center rounded-full',
                  result.errors.length === 0 ? 'bg-green-100' : 'bg-yellow-100'
                )}
              >
                {result.errors.length === 0 ? (
                  <Check className="h-8 w-8 text-green-600" />
                ) : (
                  <AlertCircle className="h-8 w-8 text-yellow-600" />
                )}
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-800">
                  {result.imported} member{result.imported === 1 ? '' : 's'} imported
                </p>
                {result.errors.length > 0 && (
                  <p className="mt-1 text-sm text-slate-500">
                    {result.errors.length} row{result.errors.length === 1 ? '' : 's'} had errors
                  </p>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="w-full rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-left">
                  <p className="mb-2 text-sm font-medium text-yellow-800">Errors:</p>
                  <ul className="space-y-1">
                    {result.errors.map((e, i) => (
                      <li key={i} className="text-xs text-yellow-700">
                        • {e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex gap-3">
                <Button variant="outline" onClick={reset}>
                  Import another file
                </Button>
                <Button
                  className="bg-blue-700 hover:bg-blue-800"
                  onClick={() => router.push('/')}
                >
                  View directory
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
