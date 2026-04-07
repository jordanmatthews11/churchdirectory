'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, Check, AlertCircle, Loader2, X, ArrowRight } from 'lucide-react'
import { importRows, ImportRow } from '@/lib/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Step = 'upload' | 'map' | 'review' | 'preview' | 'done'
type ImportMode = 'standard' | 'directory'

interface DirectoryMemberDraft {
  first_name: string
  last_name: string
  needs_review: boolean
  override_approved: boolean
  review_reason?: string
}

interface DirectoryFamilyDraft {
  import_id: string
  family_name: string
  source_value: string
  members: DirectoryMemberDraft[]
}

type PreviewRow = ImportRow & { import_id?: string }

const DIRECTORY_SPLIT = /\s*[—–-]\s*/
const DIRECTORY_FORMAT_MATCH = /^.+\s*[—–-]\s*.+$/

const IMPORT_FIELDS: { key: keyof ImportRow; label: string; required: boolean }[] = [
  { key: 'family_id', label: 'Family ID (optional UUID)', required: false },
  { key: 'family_name', label: 'Family Name', required: true },
  { key: 'first_name', label: 'First Name', required: true },
  { key: 'last_name', label: 'Last Name', required: true },
  { key: 'role', label: 'Role (adult/child/other)', required: false },
  { key: 'mailing_address', label: 'Street Address', required: false },
  { key: 'city', label: 'City', required: false },
  { key: 'state', label: 'State', required: false },
  { key: 'zip', label: 'ZIP Code', required: false },
  { key: 'phone', label: 'Phone', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'member_since', label: 'Member Since (YYYY-MM-DD)', required: false },
  { key: 'bio', label: 'Bio', required: false },
]

function normalizeDirectoryNames(value: string): string {
  return value.replace(/\(\s*and\s+([^)]+)\)/gi, ' and $1').replace(/\s+/g, ' ').trim()
}

function splitNameParts(value: string): string[] {
  return value.split(/\s+/).filter(Boolean)
}

function endsWithFamilyName(candidate: string, familyName: string): boolean {
  const candidateParts = splitNameParts(candidate.toLowerCase())
  const familyParts = splitNameParts(familyName.toLowerCase())
  if (candidateParts.length < familyParts.length) return false

  const tail = candidateParts.slice(candidateParts.length - familyParts.length)
  return tail.join(' ') === familyParts.join(' ')
}

function parseDirectoryMember(rawSegment: string, familyName: string): DirectoryMemberDraft {
  const segment = rawSegment.replace(/\s+/g, ' ').trim()
  if (!segment) {
    return {
      first_name: '',
      last_name: familyName,
      needs_review: true,
      override_approved: false,
      review_reason: 'Empty name segment',
    }
  }

  const parts = splitNameParts(segment)
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: familyName, needs_review: false, override_approved: false }
  }

  if (endsWithFamilyName(segment, familyName)) {
    const familyPartCount = splitNameParts(familyName).length
    const firstName = parts.slice(0, parts.length - familyPartCount).join(' ').trim()
    return {
      first_name: firstName,
      last_name: familyName,
      needs_review: firstName.length === 0,
      override_approved: false,
      review_reason: firstName.length === 0 ? 'Missing first name before family name' : undefined,
    }
  }

  return {
    first_name: parts.slice(0, -1).join(' '),
    last_name: parts[parts.length - 1],
    needs_review: true,
    override_approved: false,
    review_reason: `Last name "${parts[parts.length - 1]}" differs from family "${familyName}"`,
  }
}

function parseDirectoryEntry(value: string): Omit<DirectoryFamilyDraft, 'import_id'> | null {
  const normalized = normalizeDirectoryNames(value)
  if (!DIRECTORY_FORMAT_MATCH.test(normalized)) return null

  const pieces = normalized.split(DIRECTORY_SPLIT)
  if (pieces.length !== 2) return null

  const familyName = pieces[0].trim()
  const namesPart = pieces[1].trim()
  if (!familyName || !namesPart) return null

  const segments = namesPart
    .split(/\s+and\s+|,\s*/i)
    .map((v) => v.trim())
    .filter(Boolean)
  if (segments.length === 0) return null

  return {
    family_name: familyName,
    source_value: value,
    members: segments.map((segment) => parseDirectoryMember(segment, familyName)),
  }
}

function convertDirectoryDraftToImportRows(drafts: DirectoryFamilyDraft[]): PreviewRow[] {
  return drafts.flatMap((family) =>
    family.members.map((member) => ({
      import_id: family.import_id,
      family_name: family.family_name.trim(),
      first_name: member.first_name.trim(),
      last_name: member.last_name.trim(),
    }))
  )
}

export function SpreadsheetImporter() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('upload')
  const [importMode, setImportMode] = useState<ImportMode | null>(null)
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [directoryDrafts, setDirectoryDrafts] = useState<DirectoryFamilyDraft[]>([])
  const [mapping, setMapping] = useState<Partial<Record<keyof ImportRow, string>>>({})
  const [mappedRows, setMappedRows] = useState<PreviewRow[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null)

  function parseFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array', dateNF: 'yyyy-mm-dd' })
        setFileName(file.name)

        const sheetMatrices = workbook.SheetNames.map((sheetName) => ({
          sheetName,
          matrix: XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
            header: 1,
            raw: false,
            dateNF: 'yyyy-mm-dd',
            defval: '',
          }) as string[][],
        }))

        // Detect "LastName — Names" directory format across all sheets/columns.
        let bestSheetIndex = -1
        let bestCol = -1
        let bestRatio = 0

        sheetMatrices.forEach(({ matrix }, sheetIdx) => {
          for (let colIdx = 0; colIdx < 8; colIdx++) {
            const values = matrix
              .map((row) => String(row[colIdx] ?? '').trim())
              .filter(Boolean)
            if (values.length < 20) continue
            const matches = values.filter((value) => DIRECTORY_FORMAT_MATCH.test(value)).length
            const ratio = matches / values.length
            if (ratio > bestRatio) {
              bestRatio = ratio
              bestCol = colIdx
              bestSheetIndex = sheetIdx
            }
          }
        })

        if (bestSheetIndex >= 0 && bestCol >= 0 && bestRatio >= 0.7) {
          const bestMatrix = sheetMatrices[bestSheetIndex].matrix
          const parsed = bestMatrix
            .map((row) => String(row[bestCol] ?? '').trim())
            .filter(Boolean)
            .map((value) => parseDirectoryEntry(value))
            .filter((entry): entry is Omit<DirectoryFamilyDraft, 'import_id'> => entry !== null)
            .map((entry, idx) => ({
              ...entry,
              import_id: `FAM-${String(idx + 1).padStart(3, '0')}`,
            }))

          if (parsed.length > 0) {
            setImportMode('directory')
            setDirectoryDrafts(parsed)
            setStep('review')
            return
          }
        }

        const matrix = sheetMatrices[0]?.matrix ?? []
        if (matrix.length === 0) {
          toast.error('The spreadsheet appears to be empty')
          return
        }

        const firstRow = matrix[0] ?? []
        const cols = firstRow.map((value, idx) => String(value || `Column ${idx + 1}`).trim())
        const json: Record<string, string>[] = matrix
          .slice(1)
          .map((row) => {
            const obj: Record<string, string> = {}
            cols.forEach((col, idx) => {
              obj[col] = String(row[idx] ?? '').trim()
            })
            return obj
          })
          .filter((row) => Object.values(row).some((value) => value !== ''))

        if (json.length === 0) {
          toast.error('No data rows found below the header row.')
          return
        }

        setImportMode('standard')
        setHeaders(cols)
        setRawRows(json)

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

  function updateDirectoryMember(
    familyIndex: number,
    memberIndex: number,
    key: 'first_name' | 'last_name',
    value: string
  ) {
    setDirectoryDrafts((prev) =>
      prev.map((family, fIdx) => {
        if (fIdx !== familyIndex) return family
        return {
          ...family,
          members: family.members.map((member, mIdx) => {
            if (mIdx !== memberIndex) return member
            const next = { ...member, [key]: value.trimStart() }
            if (next.first_name.trim() && next.last_name.trim()) {
              next.needs_review = false
              next.override_approved = false
              next.review_reason = undefined
            } else {
              next.needs_review = true
              next.override_approved = false
              next.review_reason = 'First and last name are both required'
            }
            return next
          }),
        }
      })
    )
  }

  function toggleOverrideApproval(familyIndex: number, memberIndex: number, approved: boolean) {
    setDirectoryDrafts((prev) =>
      prev.map((family, fIdx) => {
        if (fIdx !== familyIndex) return family
        return {
          ...family,
          members: family.members.map((member, mIdx) => {
            if (mIdx !== memberIndex) return member
            return {
              ...member,
              override_approved: approved,
            }
          }),
        }
      })
    )
  }

  function handleDirectoryPreview() {
    const unresolved = directoryDrafts.flatMap((family) =>
      family.members.filter(
        (member) =>
          (member.needs_review && !member.override_approved) ||
          !member.first_name.trim() ||
          !member.last_name.trim()
      )
    )
    if (unresolved.length > 0) {
      toast.error('Please resolve all unclear names before previewing import.')
      return
    }

    const rows = convertDirectoryDraftToImportRows(directoryDrafts)
    if (rows.length === 0) {
      toast.error('No valid rows found after review.')
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
    setImportMode(null)
    setFileName('')
    setHeaders([])
    setRawRows([])
    setDirectoryDrafts([])
    setMapping({})
    setMappedRows([])
    setResult(null)
  }

  const stepFlow: Step[] =
    importMode === 'directory'
      ? ['upload', 'review', 'preview', 'done']
      : ['upload', 'map', 'preview', 'done']
  const activeStepIndex = stepFlow.indexOf(step)
  const totalDirectoryMembers = directoryDrafts.reduce((sum, family) => sum + family.members.length, 0)
  const unresolvedMembers = directoryDrafts.flatMap((family) =>
    family.members.filter((member) => member.needs_review && !member.override_approved)
  ).length

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {stepFlow.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                step === s
                  ? 'bg-[#7A9C49] text-white'
                  : i <= activeStepIndex
                  ? 'bg-[#F4F4EC] text-[#7A9C49]'
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
              {s === 'review' ? 'review unclear names' : s}
            </span>
            {i < stepFlow.length - 1 && <ArrowRight className="h-3 w-3 text-slate-300" />}
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
                dragging ? 'border-[#7A9C49] bg-[#F4F4EC]' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              )}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F4F4EC]">
                <FileSpreadsheet className="h-8 w-8 text-[#7A9C49]" />
              </div>
              <div className="text-center">
                <p className="font-medium text-slate-700">
                  Drop your spreadsheet here, or <span className="text-[#7A9C49]">browse</span>
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
              <Button className="bg-[#7A9C49] hover:bg-[#6B8A3D]" onClick={handlePreview}>
                Preview import
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Review unclear directory names */}
      {step === 'review' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Review unclear names</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  <span className="font-medium">{fileName}</span> · {directoryDrafts.length} families ·{' '}
                  {totalDirectoryMembers} members
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="mr-1.5 h-3.5 w-3.5" />
                Start over
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-600">
              Directory format detected (<code>LastName — Names</code>). Any uncertain rows are listed below
              for confirmation.
            </div>

            {unresolvedMembers === 0 ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                All names parsed cleanly. Continue to preview.
              </div>
            ) : (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                {unresolvedMembers} unclear name{unresolvedMembers === 1 ? '' : 's'} need confirmation.
              </div>
            )}

            <div className="max-h-[480px] overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    {['Family', 'Family ID', 'Source', 'First Name', 'Last Name', 'Override', 'Status'].map((h) => (
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
                  {directoryDrafts.map((family, familyIndex) =>
                    family.members.map((member, memberIndex) => (
                      <tr
                        key={`${familyIndex}-${memberIndex}`}
                        className={cn(member.needs_review ? 'bg-yellow-50/60' : 'hover:bg-slate-50')}
                      >
                        <td className="px-3 py-2 font-medium text-slate-700">{family.family_name}</td>
                        <td className="px-3 py-2 text-slate-500">{family.import_id}</td>
                        <td className="px-3 py-2 text-slate-500">{family.source_value}</td>
                        <td className="px-3 py-2">
                          <Input
                            value={member.first_name}
                            onChange={(e) =>
                              updateDirectoryMember(
                                familyIndex,
                                memberIndex,
                                'first_name',
                                e.target.value
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            value={member.last_name}
                            onChange={(e) =>
                              updateDirectoryMember(
                                familyIndex,
                                memberIndex,
                                'last_name',
                                e.target.value
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {member.needs_review ? (
                            <label className="inline-flex items-center gap-2 text-slate-600">
                              <input
                                type="checkbox"
                                checked={member.override_approved}
                                onChange={(e) =>
                                  toggleOverrideApproval(familyIndex, memberIndex, e.target.checked)
                                }
                              />
                              Approve
                            </label>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {member.needs_review && !member.override_approved ? (
                            <span className="font-medium text-yellow-700">
                              Needs review{member.review_reason ? `: ${member.review_reason}` : ''}
                            </span>
                          ) : member.needs_review && member.override_approved ? (
                            <span className="font-medium text-[#7A9C49]">Approved override</span>
                          ) : (
                            <span className="text-green-700">OK</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={reset}>
                Cancel
              </Button>
              <Button className="bg-[#7A9C49] hover:bg-[#6B8A3D]" onClick={handleDirectoryPreview}>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(importMode === 'directory' ? 'review' : 'map')}
              >
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
                    {['Family', 'Family ID', 'First Name', 'Last Name', 'Role', 'Phone', 'Email'].map((h) => (
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
                      <td className="px-3 py-2 text-slate-500">{row.import_id ?? '—'}</td>
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
              <Button variant="outline" onClick={() => setStep(importMode === 'directory' ? 'review' : 'map')}>
                Back
              </Button>
              <Button
                className="bg-[#7A9C49] hover:bg-[#6B8A3D]"
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
                  className="bg-[#7A9C49] hover:bg-[#6B8A3D]"
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
