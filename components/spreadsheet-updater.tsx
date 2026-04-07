'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import {
  Upload,
  Check,
  AlertCircle,
  Loader2,
  X,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  Users,
  UserPlus,
} from 'lucide-react'
import {
  applyReimportChanges,
  computeReimportDiff,
  type ReimportDiff,
  type ReimportRow,
  type ReimportNewFamilyDiff,
  type ReimportFamilyUpdateDiff,
  type ReimportRemovedFamilyDiff,
} from '@/lib/actions'
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
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Column header matching
// ---------------------------------------------------------------------------

const COL_ALIASES: Record<keyof ReimportRow, string[]> = {
  family_id: ['familyid', 'family_id'],
  member_id: ['memberid', 'member_id'],
  family_name: ['familyname', 'family_name'],
  first_name: ['firstname', 'first_name'],
  last_name: ['lastname', 'last_name'],
  role: ['role'],
  mailing_address: ['streetaddress', 'mailing_address', 'street', 'address'],
  city: ['city'],
  state: ['state'],
  zip: ['zip', 'zipcode'],
  phone: ['phone'],
  email: ['email'],
  member_since: ['membersince', 'member_since'],
  bio: ['bio'],
}

function normHeader(h: string): string {
  return String(h ?? '').trim().toLowerCase().replace(/[\s_-]/g, '')
}

function norm(s: string | undefined | null): string {
  return (s ?? '').trim()
}

// ---------------------------------------------------------------------------
// XLSX parsing
// ---------------------------------------------------------------------------

function parseExportSheet(data: ArrayBuffer): { rows: ReimportRow[]; error?: string } {
  try {
    const workbook = XLSX.read(data, { type: 'array', dateNF: 'yyyy-mm-dd' })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) return { rows: [], error: 'Workbook has no sheets.' }
    const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      raw: false,
      dateNF: 'yyyy-mm-dd',
      defval: '',
    }) as string[][]
    if (matrix.length < 2) return { rows: [], error: 'Sheet has no data rows.' }

    const headerCells = (matrix[0] ?? []).map((c) => String(c ?? '').trim())
    const normLookup = new Map<string, number>()
    headerCells.forEach((h, i) => normLookup.set(normHeader(h), i))

    const col = (key: keyof ReimportRow): number => {
      for (const alias of COL_ALIASES[key]) {
        const idx = normLookup.get(alias)
        if (idx !== undefined) return idx
      }
      return -1
    }

    const iFamilyId = col('family_id')
    const iFamName = col('family_name')
    if (iFamName < 0) return { rows: [], error: 'Missing "Family Name" column.' }
    if (iFamilyId < 0) {
      return {
        rows: [],
        error: 'Missing "Family ID" column. Use a file exported from this app (Families > Export).',
      }
    }

    const indices: Record<keyof ReimportRow, number> = {
      family_id: iFamilyId,
      member_id: col('member_id'),
      family_name: iFamName,
      first_name: col('first_name'),
      last_name: col('last_name'),
      role: col('role'),
      mailing_address: col('mailing_address'),
      city: col('city'),
      state: col('state'),
      zip: col('zip'),
      phone: col('phone'),
      email: col('email'),
      member_since: col('member_since'),
      bio: col('bio'),
    }

    const rows: ReimportRow[] = []
    for (let r = 1; r < matrix.length; r++) {
      const line = matrix[r] ?? []
      const get = (idx: number) => (idx >= 0 ? String(line[idx] ?? '').trim() : '')
      rows.push({
        family_id: get(indices.family_id),
        member_id: get(indices.member_id),
        family_name: get(indices.family_name),
        first_name: get(indices.first_name),
        last_name: get(indices.last_name),
        role: get(indices.role),
        mailing_address: get(indices.mailing_address),
        city: get(indices.city),
        state: get(indices.state),
        zip: get(indices.zip),
        phone: get(indices.phone),
        email: get(indices.email),
        member_since: get(indices.member_since),
        bio: get(indices.bio),
      })
    }

    return { rows }
  } catch {
    return { rows: [], error: 'Could not read the spreadsheet.' }
  }
}

// ---------------------------------------------------------------------------
// Types for unresolved new rows
// ---------------------------------------------------------------------------

interface UnresolvedNewRow {
  idx: number
  row: ReimportRow
  /** User's choice: 'new-family' | an existing family_id from the file */
  assignment: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Step = 'upload' | 'resolve' | 'preview' | 'done'

export function SpreadsheetUpdater() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('upload')
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [diff, setDiff] = useState<ReimportDiff | null>(null)
  const [parsedRows, setParsedRows] = useState<ReimportRow[]>([])
  const [applyResult, setApplyResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [showHelp, setShowHelp] = useState(false)

  const [unresolvedRows, setUnresolvedRows] = useState<UnresolvedNewRow[]>([])

  const [selNew, setSelNew] = useState<Set<string>>(new Set())
  const [selUpdated, setSelUpdated] = useState<Set<string>>(new Set())
  const [selRemoved, setSelRemoved] = useState<Set<string>>(new Set())

  // Collect existing family names from the file (rows that DO have a family_id)
  const existingFamiliesInFile = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of parsedRows) {
      const fid = norm(r.family_id)
      const fname = norm(r.family_name)
      if (fid && fname && !map.has(fid)) map.set(fid, fname)
    }
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, name]) => ({ id, name }))
  }, [parsedRows])

  function initSelections(d: ReimportDiff) {
    setSelNew(new Set(d.newFamilies.map((f) => f.key)))
    setSelUpdated(new Set(d.updatedFamilies.map((f) => f.family_id)))
    setSelRemoved(new Set())
  }

  // -------------------------------------------------------------------------
  // Parsing & diff
  // -------------------------------------------------------------------------

  function parseFile(file: File) {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const buf = e.target?.result as ArrayBuffer
      const { rows, error } = parseExportSheet(buf)
      if (error) { toast.error(error); return }
      if (rows.length === 0) { toast.error('No rows found in file.'); return }
      setParsedRows(rows)
      setFileName(file.name)

      const blankIdRows: UnresolvedNewRow[] = []
      rows.forEach((r, idx) => {
        const hasFid = !!norm(r.family_id)
        const hasMid = !!norm(r.member_id)
        const hasName = !!norm(r.first_name) || !!norm(r.last_name)
        if (!hasFid && !hasMid && hasName) {
          const famName = norm(r.family_name).toLowerCase()
          const matchingFamily = existingFamiliesInFile.find(
            (f) => f.name.toLowerCase() === famName
          )
          blankIdRows.push({
            idx,
            row: r,
            assignment: matchingFamily ? matchingFamily.id : 'new-family',
          })
        }
      })

      if (blankIdRows.length > 0) {
        setUnresolvedRows(blankIdRows)
        setStep('resolve')
      } else {
        await runDiff(rows)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  async function runDiff(rows: ReimportRow[]) {
    setLoading(true)
    try {
      const result = await computeReimportDiff(rows)
      setParsedRows(rows)
      setDiff(result)
      initSelections(result)
      setStep('preview')
      if (result.warnings.length > 0) {
        toast.warning(`${result.warnings.length} note(s) — review below.`)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to compute changes')
    } finally {
      setLoading(false)
    }
  }

  function handleResolveAssignment(rowIdx: number, value: string) {
    setUnresolvedRows((prev) =>
      prev.map((u) => (u.idx === rowIdx ? { ...u, assignment: value } : u))
    )
  }

  async function handleResolveConfirm() {
    const updatedRows = [...parsedRows]
    for (const u of unresolvedRows) {
      if (u.assignment === 'new-family') {
        // Leave family_id blank — server treats it as new family (grouped by family_name)
      } else {
        updatedRows[u.idx] = { ...updatedRows[u.idx], family_id: u.assignment }
      }
    }
    setParsedRows(updatedRows)
    await runDiff(updatedRows)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) parseFile(file)
  }, [existingFamiliesInFile])

  // -------------------------------------------------------------------------
  // Selection toggles
  // -------------------------------------------------------------------------

  function toggleNew(key: string, checked: boolean) {
    setSelNew((prev) => { const n = new Set(prev); checked ? n.add(key) : n.delete(key); return n })
  }
  function toggleUpdated(id: string, checked: boolean) {
    setSelUpdated((prev) => { const n = new Set(prev); checked ? n.add(id) : n.delete(id); return n })
  }
  function toggleRemoved(id: string, checked: boolean) {
    setSelRemoved((prev) => { const n = new Set(prev); checked ? n.add(id) : n.delete(id); return n })
  }

  // -------------------------------------------------------------------------
  // Apply
  // -------------------------------------------------------------------------

  async function handleApply() {
    if (!diff) return
    const newFamilies: ReimportNewFamilyDiff[] = diff.newFamilies.filter((f) => selNew.has(f.key))
    const updatedFamilies: ReimportFamilyUpdateDiff[] = diff.updatedFamilies.filter((f) =>
      selUpdated.has(f.family_id)
    )
    const removedFamilyIds = diff.removedFamilies
      .filter((f) => selRemoved.has(f.family_id))
      .map((f) => f.family_id)

    if (!newFamilies.length && !updatedFamilies.length && !removedFamilyIds.length) {
      toast.error('Select at least one change to apply.')
      return
    }

    setApplying(true)
    try {
      const res = await applyReimportChanges({ newFamilies, updatedFamilies, removedFamilyIds })
      if (res.ok) {
        setApplyResult({ ok: true, message: res.summary })
        toast.success('Updates applied')
        setStep('done')
        router.refresh()
      } else {
        setApplyResult({ ok: false, message: res.error })
        toast.error(res.error)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Apply failed'
      setApplyResult({ ok: false, message: msg })
      toast.error(msg)
    } finally {
      setApplying(false)
    }
  }

  function reset() {
    setStep('upload')
    setFileName('')
    setDiff(null)
    setParsedRows([])
    setApplyResult(null)
    setSelNew(new Set())
    setSelUpdated(new Set())
    setSelRemoved(new Set())
    setUnresolvedRows([])
    setShowHelp(false)
  }

  const hasAnythingSelected = diff && (selNew.size > 0 || selUpdated.size > 0 || selRemoved.size > 0)

  const stepFlow: Step[] = unresolvedRows.length > 0
    ? ['upload', 'resolve', 'preview', 'done']
    : ['upload', 'preview', 'done']
  const activeIdx = stepFlow.indexOf(step)

  const stepLabels: Record<Step, string> = {
    upload: 'Upload',
    resolve: 'Assign new people',
    preview: 'Review changes',
    done: 'Done',
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

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
                  : activeIdx > i
                  ? 'bg-[#F4F4EC] text-[#7A9C49]'
                  : 'bg-slate-100 text-slate-400'
              )}
            >
              {i + 1}
            </div>
            <span className={cn(step === s ? 'font-medium' : 'text-slate-400')}>
              {stepLabels[s]}
            </span>
            {i < stepFlow.length - 1 && <ArrowRight className="h-3 w-3 text-slate-300" />}
          </div>
        ))}
      </div>

      {/* ─── Upload ─────────────────────────────────────────────────────── */}
      {step === 'upload' && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <label
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 transition-colors',
                  dragging
                    ? 'border-[#7A9C49] bg-[#F4F4EC]'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                )}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F4F4EC]">
                  {loading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-[#7A9C49]" />
                  ) : (
                    <RefreshCw className="h-8 w-8 text-[#7A9C49]" />
                  )}
                </div>
                <div className="text-center">
                  <p className="font-medium text-slate-700">
                    Drop your exported directory file here, or{' '}
                    <span className="text-[#7A9C49]">browse</span>
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Supports .xlsx and .csv
                  </p>
                </div>
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  className="hidden"
                  disabled={loading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f) }}
                />
              </label>
            </CardContent>
          </Card>

          {/* Instructions panel */}
          <Card>
            <CardHeader className="pb-2">
              <button
                type="button"
                className="flex w-full items-center gap-2 text-left"
                onClick={() => setShowHelp(!showHelp)}
              >
                <HelpCircle className="h-4 w-4 text-[#7A9C49]" />
                <CardTitle className="text-sm">How to use Update from Export</CardTitle>
                <ArrowRight
                  className={cn(
                    'ml-auto h-4 w-4 text-slate-400 transition-transform',
                    showHelp && 'rotate-90'
                  )}
                />
              </button>
            </CardHeader>
            {showHelp && (
              <CardContent className="space-y-4 text-sm text-slate-600">
                <div>
                  <p className="font-semibold text-slate-800">Step 1 — Export the directory</p>
                  <p>
                    Go to the <span className="font-medium">Families</span> page and click{' '}
                    <span className="font-medium">Export</span>. This downloads an Excel file with every family
                    and member, including <strong>Family ID</strong> and <strong>Member ID</strong> columns.
                    These IDs are how the app matches rows back to the database.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-slate-800">Step 2 — Edit the file in Excel</p>
                  <p>Open the file and make your changes:</p>
                  <ul className="mt-1 list-inside list-disc space-y-1 text-slate-500">
                    <li>
                      <strong>Update existing info</strong> — Change any cell (name, phone, email, role, address, etc.).
                      Keep the Family ID and Member ID columns untouched so the app knows which record to update.
                    </li>
                    <li>
                      <strong>Add a new member to an existing family</strong> — Add a new row.
                      Copy the <strong>Family ID</strong> from that family{"'"}s other rows into the new row.
                      Leave <strong>Member ID</strong> blank. Fill in the name, role, and other info.
                    </li>
                    <li>
                      <strong>Add a brand-new family</strong> — Add one or more new rows.
                      Leave both <strong>Family ID</strong> and <strong>Member ID</strong> blank.
                      Fill in a <strong>Family Name</strong>, the member{"'"}s name, and other info.
                      All rows with the same Family Name (and blank Family ID) become one new family.
                    </li>
                    <li>
                      <strong>Remove a member</strong> — Delete the row from the spreadsheet.
                      When you upload, the app will show that member as "removed."
                    </li>
                    <li>
                      <strong>Remove a family</strong> — Delete all of that family{"'"}s rows.
                      The app will show it as "removed" in the review step.
                    </li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold text-slate-800">Step 3 — Upload and review</p>
                  <p>
                    Upload the edited file here. The app compares it to the current database and shows a summary
                    of everything that changed — new families, updated fields, and removals. Use the checkboxes
                    to approve or skip individual changes before applying.
                  </p>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <p className="font-semibold">Quick reference for new rows</p>
                  <table className="mt-2 w-full text-left">
                    <thead>
                      <tr className="border-b border-amber-200">
                        <th className="pb-1 pr-4 font-semibold">I want to...</th>
                        <th className="pb-1 pr-4 font-semibold">Family ID</th>
                        <th className="pb-1 font-semibold">Member ID</th>
                      </tr>
                    </thead>
                    <tbody className="text-amber-700">
                      <tr>
                        <td className="py-1 pr-4">Add member to existing family</td>
                        <td className="py-1 pr-4">Copy from that family{"'"}s rows</td>
                        <td className="py-1">Leave blank</td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-4">Create a brand-new family</td>
                        <td className="py-1 pr-4">Leave blank</td>
                        <td className="py-1">Leave blank</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <p className="font-semibold text-slate-800">Valid roles</p>
                  <p className="text-slate-500">
                    Use <code className="rounded bg-slate-100 px-1">adult</code>,{' '}
                    <code className="rounded bg-slate-100 px-1">child</code>, or{' '}
                    <code className="rounded bg-slate-100 px-1">other</code> (case-insensitive).
                    Legacy exports may still say <code className="rounded bg-slate-100 px-1">head</code> or{' '}
                    <code className="rounded bg-slate-100 px-1">spouse</code> — those are treated as{' '}
                    <strong>adult</strong>. Any other word is saved and shown as <strong>Other</strong> in the app.
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      )}

      {/* ─── Resolve new rows ───────────────────────────────────────────── */}
      {step === 'resolve' && unresolvedRows.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Assign new people</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  <span className="font-medium">{fileName}</span> · {unresolvedRows.length} new row
                  {unresolvedRows.length === 1 ? '' : 's'} with blank Family ID and Member ID
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="mr-1.5 h-3.5 w-3.5" />
                Start over
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              <p>
                These rows have no Family ID or Member ID. For each person, choose whether they belong
                to an <strong>existing family</strong> already in the file, or are part of a{' '}
                <strong>brand-new family</strong>.
              </p>
              <p className="mt-1 text-xs text-blue-700">
                People marked as a new family will be grouped by their Family Name column. Make sure
                all members of the same new family have the same Family Name.
              </p>
            </div>

            <div className="max-h-[500px] overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    {['First Name', 'Last Name', 'Family Name', 'Role', 'Assign to'].map((h) => (
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
                  {unresolvedRows.map((u) => (
                    <tr key={u.idx} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-700">{u.row.first_name}</td>
                      <td className="px-3 py-2 text-slate-700">{u.row.last_name}</td>
                      <td className="px-3 py-2 text-slate-500">{u.row.family_name || '—'}</td>
                      <td className="px-3 py-2 text-slate-500">{u.row.role || '—'}</td>
                      <td className="px-3 py-2">
                        <Select
                          value={u.assignment}
                          onValueChange={(val) => handleResolveAssignment(u.idx, val)}
                        >
                          <SelectTrigger className="h-8 w-56 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new-family">
                              <span className="flex items-center gap-1.5">
                                <UserPlus className="h-3 w-3 text-green-600" />
                                New family (by Family Name)
                              </span>
                            </SelectItem>
                            {existingFamiliesInFile.map((f) => (
                              <SelectItem key={f.id} value={f.id}>
                                <span className="flex items-center gap-1.5">
                                  <Users className="h-3 w-3 text-blue-600" />
                                  {f.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={reset}>Cancel</Button>
              <Button
                className="bg-[#7A9C49] hover:bg-[#6B8A3D]"
                onClick={handleResolveConfirm}
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Continue to review
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Preview ────────────────────────────────────────────────────── */}
      {step === 'preview' && diff && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base">Review changes</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  <span className="font-medium">{fileName}</span> · {parsedRows.length} rows ·{' '}
                  {diff.unchangedFamilyCount} famil
                  {diff.unchangedFamilyCount === 1 ? 'y' : 'ies'} unchanged
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="mr-1.5 h-3.5 w-3.5" />
                Start over
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {diff.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="font-medium">Notes</p>
                  <ul className="mt-1 list-inside list-disc text-xs">
                    {diff.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}

              {diff.newFamilies.length === 0 &&
                diff.updatedFamilies.length === 0 &&
                diff.removedFamilies.length === 0 && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    No differences detected between the file and the current directory.
                  </div>
                )}

              {/* New families */}
              {diff.newFamilies.length > 0 && (
                <section className="rounded-xl border border-green-200 bg-green-50/50 p-4">
                  <h3 className="text-sm font-semibold text-green-800">
                    New families ({diff.newFamilies.length})
                  </h3>
                  <ul className="mt-3 space-y-3">
                    {diff.newFamilies.map((nf) => (
                      <li
                        key={nf.key}
                        className="flex gap-3 rounded-lg border border-green-100 bg-white/80 p-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-[#7A9C49] focus:ring-[#7A9C49]"
                          checked={selNew.has(nf.key)}
                          onChange={(e) => toggleNew(nf.key, e.target.checked)}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-800">{nf.family_name}</p>
                          <p className="text-xs text-slate-500">
                            {nf.members.filter((m) => norm(m.first_name) || norm(m.last_name)).length} member(s)
                          </p>
                          <ul className="mt-1 text-xs text-slate-600">
                            {nf.members.map((m, i) =>
                              norm(m.first_name) || norm(m.last_name) ? (
                                <li key={i}>
                                  + {m.first_name} {m.last_name}
                                  {norm(m.role) ? ` · ${m.role}` : ''}
                                </li>
                              ) : null
                            )}
                          </ul>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Updated families */}
              {diff.updatedFamilies.length > 0 && (
                <section className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                  <h3 className="text-sm font-semibold text-amber-900">
                    Updated families ({diff.updatedFamilies.length})
                  </h3>
                  <ul className="mt-3 space-y-4">
                    {diff.updatedFamilies.map((u) => (
                      <li
                        key={u.family_id}
                        className="flex gap-3 rounded-lg border border-amber-100 bg-white/80 p-3"
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-[#7A9C49] focus:ring-[#7A9C49]"
                          checked={selUpdated.has(u.family_id)}
                          onChange={(e) => toggleUpdated(u.family_id, e.target.checked)}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800">{u.family_name}</p>

                          {u.familyChanges.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Family info
                              </p>
                              <ul className="mt-1 space-y-1 text-xs">
                                {u.familyChanges.map((ch, i) => (
                                  <li key={i} className="text-slate-700">
                                    <span className="font-medium">{ch.field}:</span>{' '}
                                    <span className="text-red-600 line-through">{ch.old || '—'}</span>{' '}
                                    <span className="text-green-700">→ {ch.new || '—'}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {u.newMembers.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-semibold text-green-700">New members</p>
                              <ul className="mt-1 text-xs text-slate-700">
                                {u.newMembers.map((nm, i) => (
                                  <li key={i}>+ {nm.row.first_name} {nm.row.last_name}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {u.updatedMembers.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-semibold text-amber-800">Member updates</p>
                              <ul className="mt-1 space-y-2 text-xs">
                                {u.updatedMembers.map((um) => (
                                  <li key={um.member_id}>
                                    <span className="font-medium text-slate-700">{um.displayName}</span>
                                    <ul className="ml-2 mt-0.5 space-y-0.5 border-l-2 border-amber-200 pl-2">
                                      {um.changes.map((ch, i) => (
                                        <li key={i}>
                                          {ch.field}:{' '}
                                          <span className="text-red-600 line-through">{ch.old || '—'}</span>{' '}
                                          <span className="text-green-700">→ {ch.new || '—'}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {u.removedMembers.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-semibold text-red-800">Members removed</p>
                              <ul className="mt-1 text-xs text-red-700">
                                {u.removedMembers.map((rm) => (
                                  <li key={rm.member_id}>− {rm.name}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Removed families */}
              {diff.removedFamilies.length > 0 && (
                <section className="rounded-xl border border-red-200 bg-red-50/40 p-4">
                  <h3 className="text-sm font-semibold text-red-900">
                    Families not in file — will be deleted ({diff.removedFamilies.length})
                  </h3>
                  <p className="mt-1 text-xs text-slate-600">
                    These families exist in the database but are missing from your file.
                    Check the box to confirm deletion.
                  </p>
                  <ul className="mt-3 space-y-2">
                    {diff.removedFamilies.map((rf: ReimportRemovedFamilyDiff) => (
                      <li
                        key={rf.family_id}
                        className="flex items-start gap-3 rounded-lg border border-red-100 bg-white/80 p-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-[#7A9C49] focus:ring-[#7A9C49]"
                          checked={selRemoved.has(rf.family_id)}
                          onChange={(e) => toggleRemoved(rf.family_id, e.target.checked)}
                        />
                        <div>
                          <p className="font-medium text-slate-800">{rf.family_name}</p>
                          <p className="text-xs text-slate-500">
                            {rf.memberCount} member(s)
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={reset}>Cancel</Button>
                <Button
                  className="bg-[#7A9C49] hover:bg-[#6B8A3D]"
                  disabled={!hasAnythingSelected || applying}
                  onClick={handleApply}
                >
                  {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  <Upload className="mr-2 h-4 w-4" />
                  Apply selected changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Done ───────────────────────────────────────────────────────── */}
      {step === 'done' && applyResult && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div
                className={cn(
                  'flex h-16 w-16 items-center justify-center rounded-full',
                  applyResult.ok ? 'bg-green-100' : 'bg-red-100'
                )}
              >
                {applyResult.ok ? (
                  <Check className="h-8 w-8 text-green-600" />
                ) : (
                  <AlertCircle className="h-8 w-8 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-800">
                  {applyResult.ok ? 'Directory updated' : 'Something went wrong'}
                </p>
                <p className="mt-1 text-sm text-slate-600">{applyResult.message}</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={reset}>Upload another file</Button>
                <Button className="bg-[#7A9C49] hover:bg-[#6B8A3D]" onClick={() => router.push('/')}>
                  View families
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
