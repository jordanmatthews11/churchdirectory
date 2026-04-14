'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  isMissingPhotoPresentationColumnsError,
  omitPhotoPresentationFields,
  toThrownError,
} from '@/lib/photo-presentation-db'
import { DirectorySettings, Family, Member } from '@/types'

// ─── Families ────────────────────────────────────────────────────────────────

export async function getFamilies(): Promise<Family[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('families')
    .select('*')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function getFamily(id: string): Promise<Family | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('families')
    .select('*, members(*)')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function createFamily(
  values: Omit<Family, 'id' | 'created_at' | 'members'>
): Promise<Family> {
  const supabase = await createClient()
  let { data, error } = await supabase
    .from('families')
    .insert(values)
    .select()
    .single()
  if (error && isMissingPhotoPresentationColumnsError(error)) {
    const retry = await supabase
      .from('families')
      .insert(omitPhotoPresentationFields({ ...values }))
      .select()
      .single()
    data = retry.data
    error = retry.error
  }
  if (error) throw toThrownError(error)
  revalidatePath('/')
  return data
}

export async function updateFamily(
  id: string,
  values: Partial<Omit<Family, 'id' | 'created_at' | 'members'>>
): Promise<Family> {
  const supabase = await createClient()
  let { data, error } = await supabase
    .from('families')
    .update(values)
    .eq('id', id)
    .select()
    .single()
  if (error && isMissingPhotoPresentationColumnsError(error)) {
    const retry = await supabase
      .from('families')
      .update(omitPhotoPresentationFields({ ...values }))
      .eq('id', id)
      .select()
      .single()
    data = retry.data
    error = retry.error
  }
  if (error) throw toThrownError(error)
  revalidatePath('/')
  revalidatePath(`/families/${id}`)
  return data
}

export async function deleteFamily(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('families').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/')
}

// ─── Members ─────────────────────────────────────────────────────────────────

export async function createMember(
  values: Omit<Member, 'id' | 'created_at'>
): Promise<Member> {
  const supabase = await createClient()
  let { data, error } = await supabase
    .from('members')
    .insert(values)
    .select()
    .single()
  if (error && isMissingPhotoPresentationColumnsError(error)) {
    const retry = await supabase
      .from('members')
      .insert(omitPhotoPresentationFields({ ...values }))
      .select()
      .single()
    data = retry.data
    error = retry.error
  }
  if (error) throw toThrownError(error)
  revalidatePath(`/families/${values.family_id}`)
  return data
}

export async function updateMember(
  id: string,
  familyId: string,
  values: Partial<Omit<Member, 'id' | 'created_at' | 'family_id'>>
): Promise<Member> {
  const supabase = await createClient()
  let { data, error } = await supabase
    .from('members')
    .update(values)
    .eq('id', id)
    .select()
    .single()
  if (error && isMissingPhotoPresentationColumnsError(error)) {
    const retry = await supabase
      .from('members')
      .update(omitPhotoPresentationFields({ ...values }))
      .eq('id', id)
      .select()
      .single()
    data = retry.data
    error = retry.error
  }
  if (error) throw toThrownError(error)
  revalidatePath(`/families/${familyId}`)
  return data
}

export async function deleteMember(id: string, familyId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('members').delete().eq('id', id)
  if (error) throw error
  revalidatePath(`/families/${familyId}`)
}

// ─── Directory Settings ──────────────────────────────────────────────────────

export async function getDirectorySettings(): Promise<DirectorySettings | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('directory_settings')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)

  if (error) throw error
  const row = data?.[0]
  return row ?? null
}

export async function updateDirectorySettings(
  values: Partial<
    Pick<
      DirectorySettings,
      | 'cover_image_url'
      | 'title_image_url'
      | 'logo_url'
      | 'logo_scale'
      | 'logo_offset_y'
      | 'logo_position_x'
      | 'logo_position_y'
      | 'church_name'
      | 'cover_title_line1'
      | 'cover_title_line2'
      | 'cover_year'
      | 'intro_text'
      | 'date_label'
      | 'leadership_data'
    >
  >
): Promise<DirectorySettings> {
  const supabase = await createClient()

  const current = await getDirectorySettings()

  const nextValues = {
    ...values,
    updated_at: new Date().toISOString(),
  }

  if (current) {
    const { data, error } = await supabase
      .from('directory_settings')
      .update(nextValues)
      .eq('id', current.id)
      .select('*')
      .single()

    if (error) throw error
    revalidatePath('/directory')
    revalidatePath('/leadership')
    return data
  }

  const { data, error } = await supabase
    .from('directory_settings')
    .insert(nextValues)
    .select('*')
    .single()

  if (error) throw error
  revalidatePath('/directory')
  revalidatePath('/leadership')
  return data
}

// ─── Directory Grid Data ─────────────────────────────────────────────────────

export async function getFamiliesWithMembers(): Promise<Family[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('families')
    .select('*, members(*)')
    .order('name')

  if (error) throw error
  return data ?? []
}

// ─── Spreadsheet Import ───────────────────────────────────────────────────────

export interface ImportRow {
  family_id?: string
  family_name: string
  mailing_address?: string
  city?: string
  state?: string
  zip?: string
  first_name: string
  last_name: string
  role?: string
  bio?: string
  member_since?: string
  phone?: string
  email?: string
}

export async function importRows(rows: ImportRow[]): Promise<{ imported: number; errors: string[] }> {
  const supabase = await createClient()
  const errors: string[] = []
  let imported = 0

  // Group rows by family_id when provided, otherwise by family name.
  const familyMap = new Map<string, ImportRow[]>()
  for (const row of rows) {
    const idKey = row.family_id?.trim()
    const nameKey = row.family_name.trim().toLowerCase()
    const key = idKey ? `id:${idKey}` : `name:${nameKey}`
    if (!familyMap.has(key)) familyMap.set(key, [])
    familyMap.get(key)!.push(row)
  }

  for (const [groupKey, members] of familyMap) {
    try {
      const firstRow = members[0]
      const familyName = firstRow.family_name.trim()
      const providedFamilyId = firstRow.family_id?.trim()

      if (!familyName && !providedFamilyId) {
        errors.push('Skipped a row group with no family_name or family_id.')
        continue
      }

      let familyId: string

      if (providedFamilyId) {
        const { data: familyById, error: familyByIdError } = await supabase
          .from('families')
          .select('id, name')
          .eq('id', providedFamilyId)
          .maybeSingle()

        if (familyByIdError) {
          errors.push(`Failed to validate family_id "${providedFamilyId}": ${familyByIdError.message}`)
          continue
        }

        if (!familyById) {
          errors.push(`family_id "${providedFamilyId}" was not found. Create/import that family first.`)
          continue
        }

        familyId = familyById.id
        await supabase
          .from('families')
          .update({
            mailing_address: firstRow.mailing_address || null,
            city: firstRow.city || null,
            state: firstRow.state || null,
            zip: firstRow.zip || null,
          })
          .eq('id', familyId)
      } else {
        // Safer lookup by exact normalized name; ambiguous matches are rejected.
        const { data: candidates, error: candidateError } = await supabase
          .from('families')
          .select('id, name')
          .ilike('name', familyName)

        if (candidateError) {
          errors.push(`Failed to look up family "${familyName}": ${candidateError.message}`)
          continue
        }

        const normalized = familyName.trim().toLowerCase()
        const exactMatches = (candidates ?? []).filter(
          (candidate) => candidate.name.trim().toLowerCase() === normalized
        )

        if (exactMatches.length > 1) {
          errors.push(
            `Family name "${familyName}" matches multiple families. Use a family_id column to target one exact family.`
          )
          continue
        }

        if (exactMatches.length === 1) {
          familyId = exactMatches[0].id
          await supabase
            .from('families')
            .update({
              mailing_address: firstRow.mailing_address || null,
              city: firstRow.city || null,
              state: firstRow.state || null,
              zip: firstRow.zip || null,
            })
            .eq('id', familyId)
        } else {
          const { data: newFamily, error: familyError } = await supabase
            .from('families')
            .insert({
              name: familyName,
              mailing_address: firstRow.mailing_address || null,
              city: firstRow.city || null,
              state: firstRow.state || null,
              zip: firstRow.zip || null,
            })
            .select('id')
            .single()

          if (familyError || !newFamily) {
            errors.push(`Failed to create family "${familyName}": ${familyError?.message}`)
            continue
          }
          familyId = newFamily.id
        }
      }

      // Insert members
      for (const row of members) {
        const raw = row.role?.toLowerCase() ?? ''
        const role =
          raw === 'head' || raw === 'spouse'
            ? 'adult'
            : ['adult', 'child', 'other'].includes(raw)
              ? raw
              : 'other'

        const { error: memberError } = await supabase.from('members').insert({
          family_id: familyId,
          first_name: row.first_name.trim(),
          last_name: row.last_name.trim(),
          role,
          bio: row.bio || null,
          member_since: row.member_since || null,
          phone: row.phone || null,
          email: row.email || null,
        })

        if (memberError) {
          errors.push(`Failed to add member "${row.first_name} ${row.last_name}": ${memberError.message}`)
        } else {
          imported++
        }
      }
    } catch (err) {
      errors.push(`Unexpected error for group "${groupKey}": ${String(err)}`)
    }
  }

  revalidatePath('/')
  return { imported, errors }
}

// ─── Re-import from export (round-trip) ──────────────────────────────────────

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface ReimportRow {
  family_id?: string
  member_id?: string
  family_name: string
  first_name: string
  last_name: string
  role?: string
  mailing_address?: string
  city?: string
  state?: string
  zip?: string
  phone?: string
  email?: string
  member_since?: string
  bio?: string
}

export interface ReimportFieldChange {
  field: string
  old: string
  new: string
}

export interface ReimportNewFamilyDiff {
  key: string
  family_name: string
  members: ReimportRow[]
}

export interface ReimportNewMemberDiff {
  row: ReimportRow
}

export interface ReimportUpdatedMemberDiff {
  member_id: string
  displayName: string
  changes: ReimportFieldChange[]
  /** Row from the spreadsheet; required to apply updates. */
  sourceRow: ReimportRow
}

export interface ReimportRemovedMemberDiff {
  member_id: string
  name: string
}

export interface ReimportFamilyUpdateDiff {
  family_id: string
  family_name: string
  familyChanges: ReimportFieldChange[]
  newMembers: ReimportNewMemberDiff[]
  updatedMembers: ReimportUpdatedMemberDiff[]
  removedMembers: ReimportRemovedMemberDiff[]
}

export interface ReimportRemovedFamilyDiff {
  family_id: string
  family_name: string
  memberCount: number
}

export interface ReimportDiff {
  newFamilies: ReimportNewFamilyDiff[]
  updatedFamilies: ReimportFamilyUpdateDiff[]
  removedFamilies: ReimportRemovedFamilyDiff[]
  unchangedFamilyCount: number
  warnings: string[]
}

export interface ApplyReimportPayload {
  newFamilies: ReimportNewFamilyDiff[]
  updatedFamilies: ReimportFamilyUpdateDiff[]
  removedFamilyIds: string[]
}

function normStr(s: string | null | undefined): string {
  return (s ?? '').trim()
}

function normDate(s: string | null | undefined): string {
  const t = normStr(s)
  if (!t) return ''
  return t.slice(0, 10)
}

function normRole(role: string | null | undefined): string {
  const r = normStr(role).toLowerCase()
  if (r === 'head' || r === 'spouse') return 'adult'
  const valid = ['adult', 'child', 'other'] as const
  return valid.includes(r as (typeof valid)[number]) ? r : 'other'
}

function isUuid(s: string): boolean {
  return UUID_RE.test(s)
}

function reimportRowIsEmpty(row: ReimportRow): boolean {
  return (
    !normStr(row.family_id) &&
    !normStr(row.member_id) &&
    !normStr(row.family_name) &&
    !normStr(row.first_name) &&
    !normStr(row.last_name) &&
    !normStr(row.role) &&
    !normStr(row.mailing_address) &&
    !normStr(row.city) &&
    !normStr(row.state) &&
    !normStr(row.zip) &&
    !normStr(row.phone) &&
    !normStr(row.email) &&
    !normStr(row.member_since) &&
    !normStr(row.bio)
  )
}

type ReimportRowGroup =
  | { kind: 'id'; familyId: string; rows: ReimportRow[] }
  | { kind: 'new'; key: string; rows: ReimportRow[] }

function buildReimportRowGroups(rows: ReimportRow[]): ReimportRowGroup[] {
  const filtered = rows.filter((r) => !reimportRowIsEmpty(r))

  const idMap = new Map<string, ReimportRow[]>()
  const newMap = new Map<string, ReimportRow[]>()
  let newCounter = 0

  for (const row of filtered) {
    const fid = normStr(row.family_id)
    if (fid) {
      if (!idMap.has(fid)) idMap.set(fid, [])
      idMap.get(fid)!.push(row)
    } else {
      const name = normStr(row.family_name).toLowerCase()
      if (!newMap.has(name)) newMap.set(name, [])
      newMap.get(name)!.push(row)
    }
  }

  const groups: ReimportRowGroup[] = []
  for (const [fid, chunk] of idMap) {
    groups.push({ kind: 'id', familyId: fid, rows: chunk })
  }
  for (const [, chunk] of newMap) {
    newCounter += 1
    const name = normStr(chunk[0]?.family_name)
    groups.push({ kind: 'new', key: `new-${newCounter}-${name || 'unknown'}`, rows: chunk })
  }
  return groups
}

function familyFieldChanges(
  db: Family,
  firstRow: ReimportRow
): ReimportFieldChange[] {
  const pairs: [string, string, string][] = [
    ['Family Name', db.name, normStr(firstRow.family_name)],
    ['Street Address', db.mailing_address ?? '', normStr(firstRow.mailing_address)],
    ['City', db.city ?? '', normStr(firstRow.city)],
    ['State', db.state ?? '', normStr(firstRow.state)],
    ['ZIP', db.zip ?? '', normStr(firstRow.zip)],
  ]
  const out: ReimportFieldChange[] = []
  for (const [field, oldV, newV] of pairs) {
    if (oldV !== newV) out.push({ field, old: oldV, new: newV })
  }
  return out
}

function memberFieldChanges(row: ReimportRow, m: Member): ReimportFieldChange[] {
  const out: ReimportFieldChange[] = []
  const push = (field: string, oldV: string, newV: string) => {
    if (oldV !== newV) out.push({ field, old: oldV, new: newV })
  }
  push('First Name', m.first_name, normStr(row.first_name))
  push('Last Name', m.last_name, normStr(row.last_name))
  push('Role', m.role, normRole(row.role))
  push('Phone', m.phone ?? '', normStr(row.phone))
  push('Email', m.email ?? '', normStr(row.email))
  push('Member Since', normDate(m.member_since), normDate(row.member_since))
  push('Bio', m.bio ?? '', normStr(row.bio))
  return out
}

export async function computeReimportDiff(rows: ReimportRow[]): Promise<ReimportDiff> {
  const dbFamilies = await getFamiliesWithMembers()
  const dbById = new Map(dbFamilies.map((f) => [f.id, f]))
  const warnings: string[] = []

  const filteredRows = rows.filter((r) => !reimportRowIsEmpty(r))
  const groups = buildReimportRowGroups(filteredRows)

  const fileFamilyIds = new Set<string>()
  for (const r of filteredRows) {
    const fid = normStr(r.family_id)
    if (fid) fileFamilyIds.add(fid)
  }
  const shouldComputeRemovals = fileFamilyIds.size > 0

  const newFamilies: ReimportNewFamilyDiff[] = []
  const updatedFamilies: ReimportFamilyUpdateDiff[] = []
  let unchangedFamilyCount = 0

  for (const g of groups) {
    if (g.kind === 'new') {
      const first = g.rows[0]
      const familyName = normStr(first?.family_name)
      if (!familyName) {
        warnings.push(`Skipped a new-family group (${g.key}) with no family name.`)
        continue
      }
      const members = g.rows.filter(
        (r) => normStr(r.first_name) || normStr(r.last_name)
      )
      if (members.length === 0) {
        warnings.push(
          `Skipped new family "${familyName}" — add at least one row with first and last name.`
        )
        continue
      }
      newFamilies.push({ key: g.key, family_name: familyName, members: g.rows })
      continue
    }

    const familyId = g.familyId
    if (!isUuid(familyId)) {
      warnings.push(`Family ID "${familyId}" is not a valid UUID — treating group as new family.`)
      const first = g.rows[0]
      const familyName = normStr(first?.family_name)
      if (!familyName) continue
      newFamilies.push({
        key: `invalid-id-${familyId}`,
        family_name: familyName,
        members: g.rows,
      })
      continue
    }

    const dbFam = dbById.get(familyId)
    if (!dbFam) {
      const first = g.rows[0]
      const familyName = normStr(first?.family_name)
      if (!familyName) {
        warnings.push(`Skipped rows with unknown family_id ${familyId} and no family name.`)
        continue
      }
      newFamilies.push({
        key: `unknown-id-${familyId}`,
        family_name: familyName,
        members: g.rows,
      })
      continue
    }

    const firstRow = g.rows[0]
    const famChanges = familyFieldChanges(dbFam, firstRow)

    const dbMembers = [...(dbFam.members ?? [])]
    const matchedMemberIds = new Set<string>()
    const rowIndicesWithPair = new Set<number>()
    const pairs: { row: ReimportRow; member: Member; rowIndex: number }[] = []

    g.rows.forEach((row, idx) => {
      const mid = normStr(row.member_id)
      if (!mid || !isUuid(mid)) return
      const m = dbMembers.find((x) => x.id === mid && x.family_id === familyId)
      if (m) {
        matchedMemberIds.add(m.id)
        rowIndicesWithPair.add(idx)
        pairs.push({ row, member: m, rowIndex: idx })
      } else {
        warnings.push(
          `Member ID "${mid}" in family "${dbFam.name}" was not found — will try to match by name or add as new.`
        )
      }
    })

    g.rows.forEach((row, idx) => {
      if (rowIndicesWithPair.has(idx)) return
      const fn = normStr(row.first_name).toLowerCase()
      const ln = normStr(row.last_name).toLowerCase()
      if (!fn && !ln) return
      const m = dbMembers.find(
        (x) =>
          !matchedMemberIds.has(x.id) &&
          x.first_name.trim().toLowerCase() === fn &&
          x.last_name.trim().toLowerCase() === ln
      )
      if (m) {
        matchedMemberIds.add(m.id)
        rowIndicesWithPair.add(idx)
        pairs.push({ row, member: m, rowIndex: idx })
      }
    })

    const newMemberRows: ReimportRow[] = []
    g.rows.forEach((row, idx) => {
      if (rowIndicesWithPair.has(idx)) return
      const fn = normStr(row.first_name)
      const ln = normStr(row.last_name)
      if (!fn && !ln) return
      newMemberRows.push(row)
    })

    const updatedMembers: ReimportUpdatedMemberDiff[] = []
    for (const { row, member } of pairs) {
      const ch = memberFieldChanges(row, member)
      if (ch.length > 0) {
        updatedMembers.push({
          member_id: member.id,
          displayName: `${member.first_name} ${member.last_name}`.trim(),
          changes: ch,
          sourceRow: row,
        })
      }
    }

    const removedMembers: ReimportRemovedMemberDiff[] = dbMembers
      .filter((m) => !matchedMemberIds.has(m.id))
      .map((m) => ({
        member_id: m.id,
        name: `${m.first_name} ${m.last_name}`.trim(),
      }))

    const newMembers: ReimportNewMemberDiff[] = newMemberRows.map((row) => ({ row }))

    const hasChanges =
      famChanges.length > 0 ||
      newMembers.length > 0 ||
      updatedMembers.length > 0 ||
      removedMembers.length > 0

    if (!hasChanges) unchangedFamilyCount += 1
    else {
      updatedFamilies.push({
        family_id: familyId,
        family_name: dbFam.name,
        familyChanges: famChanges,
        newMembers,
        updatedMembers,
        removedMembers,
      })
    }
  }

  const removedFamilies: ReimportRemovedFamilyDiff[] = shouldComputeRemovals
    ? dbFamilies
        .filter((f) => !fileFamilyIds.has(f.id))
        .map((f) => ({
          family_id: f.id,
          family_name: f.name,
          memberCount: f.members?.length ?? 0,
        }))
    : []

  return {
    newFamilies,
    updatedFamilies,
    removedFamilies,
    unchangedFamilyCount,
    warnings,
  }
}

export async function applyReimportChanges(
  payload: ApplyReimportPayload
): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  const supabase = await createClient()

  try {
    for (const id of payload.removedFamilyIds) {
      const { error } = await supabase.from('families').delete().eq('id', id)
      if (error) throw new Error(error.message)
    }

    for (const nf of payload.newFamilies) {
      const first = nf.members[0]
      const { data: created, error: famErr } = await supabase
        .from('families')
        .insert({
          name: normStr(first.family_name) || nf.family_name,
          mailing_address: normStr(first.mailing_address) || null,
          city: normStr(first.city) || null,
          state: normStr(first.state) || null,
          zip: normStr(first.zip) || null,
        })
        .select('id')
        .single()
      if (famErr || !created) throw new Error(famErr?.message ?? 'Failed to create family')

      const fid = created.id as string
      for (const row of nf.members) {
        const fn = normStr(row.first_name)
        const ln = normStr(row.last_name)
        if (!fn && !ln) continue
        const { error: memErr } = await supabase.from('members').insert({
          family_id: fid,
          first_name: fn,
          last_name: ln,
          role: normRole(row.role),
          bio: normStr(row.bio) || null,
          member_since: normDate(row.member_since) || null,
          phone: normStr(row.phone) || null,
          email: normStr(row.email) || null,
        })
        if (memErr) throw new Error(memErr.message)
      }
    }

    for (const u of payload.updatedFamilies) {
      const { data: currentFam, error: loadFamErr } = await supabase
        .from('families')
        .select('id')
        .eq('id', u.family_id)
        .single()
      if (loadFamErr || !currentFam) throw new Error(`Family not found: ${u.family_id}`)

      const nameChange = u.familyChanges.find((c) => c.field === 'Family Name')
      const addr = u.familyChanges.find((c) => c.field === 'Street Address')
      const cityCh = u.familyChanges.find((c) => c.field === 'City')
      const stateCh = u.familyChanges.find((c) => c.field === 'State')
      const zipCh = u.familyChanges.find((c) => c.field === 'ZIP')

      const patch: Record<string, string | null> = {}
      if (nameChange) patch.name = nameChange.new
      if (addr) patch.mailing_address = addr.new || null
      if (cityCh) patch.city = cityCh.new || null
      if (stateCh) patch.state = stateCh.new || null
      if (zipCh) patch.zip = zipCh.new || null
      if (Object.keys(patch).length > 0) {
        const { error: upErr } = await supabase.from('families').update(patch).eq('id', u.family_id)
        if (upErr) throw new Error(upErr.message)
      }

      for (const rm of u.removedMembers) {
        const { error: delErr } = await supabase.from('members').delete().eq('id', rm.member_id)
        if (delErr) throw new Error(delErr.message)
      }

      for (const um of u.updatedMembers) {
        const row = um.sourceRow
        const { error: upMemErr } = await supabase
          .from('members')
          .update({
            first_name: normStr(row.first_name),
            last_name: normStr(row.last_name),
            role: normRole(row.role),
            bio: normStr(row.bio) || null,
            member_since: normDate(row.member_since) || null,
            phone: normStr(row.phone) || null,
            email: normStr(row.email) || null,
          })
          .eq('id', um.member_id)
        if (upMemErr) throw new Error(upMemErr.message)
      }

      for (const nm of u.newMembers) {
        const row = nm.row
        const fn = normStr(row.first_name)
        const ln = normStr(row.last_name)
        if (!fn || !ln) continue
        const { error: insErr } = await supabase.from('members').insert({
          family_id: u.family_id,
          first_name: fn,
          last_name: ln,
          role: normRole(row.role),
          bio: normStr(row.bio) || null,
          member_since: normDate(row.member_since) || null,
          phone: normStr(row.phone) || null,
          email: normStr(row.email) || null,
        })
        if (insErr) throw new Error(insErr.message)
      }
    }

    revalidatePath('/')
    const nNew = payload.newFamilies.length
    const nUp = payload.updatedFamilies.length
    const nRm = payload.removedFamilyIds.length
    return {
      ok: true,
      summary: `Applied: ${nNew} new famil${nNew === 1 ? 'y' : 'ies'}, ${nUp} updated famil${nUp === 1 ? 'y' : 'ies'}, ${nRm} removed famil${nRm === 1 ? 'y' : 'ies'}.`,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  }
}
export async function signIn(email: string, password: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}

export async function inviteAdmin(email: string) {
  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { error } = await supabase.auth.admin.inviteUserByEmail(email)
  if (error) throw error
}

export async function getAdmins() {
  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data, error } = await supabase.auth.admin.listUsers()
  if (error) throw error
  return data.users
}

export async function removeAdmin(userId: string) {
  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) throw error
  revalidatePath('/settings')
}
