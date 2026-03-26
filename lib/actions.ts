'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
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
  const { data, error } = await supabase
    .from('families')
    .insert(values)
    .select()
    .single()
  if (error) throw error
  revalidatePath('/')
  return data
}

export async function updateFamily(
  id: string,
  values: Partial<Omit<Family, 'id' | 'created_at' | 'members'>>
): Promise<Family> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('families')
    .update(values)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
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
  const { data, error } = await supabase
    .from('members')
    .insert(values)
    .select()
    .single()
  if (error) throw error
  revalidatePath(`/families/${values.family_id}`)
  return data
}

export async function updateMember(
  id: string,
  familyId: string,
  values: Partial<Omit<Member, 'id' | 'created_at' | 'family_id'>>
): Promise<Member> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('members')
    .update(values)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
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
  values: Partial<Pick<DirectorySettings, 'cover_image_url' | 'title_image_url' | 'intro_text' | 'date_label'>>
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
    return data
  }

  const { data, error } = await supabase
    .from('directory_settings')
    .insert(nextValues)
    .select('*')
    .single()

  if (error) throw error
  revalidatePath('/directory')
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

  // Group rows by family name
  const familyMap = new Map<string, ImportRow[]>()
  for (const row of rows) {
    const key = row.family_name.trim()
    if (!familyMap.has(key)) familyMap.set(key, [])
    familyMap.get(key)!.push(row)
  }

  for (const [familyName, members] of familyMap) {
    try {
      const firstRow = members[0]

      // Upsert family by name
      const { data: existingFamilies } = await supabase
        .from('families')
        .select('id')
        .ilike('name', familyName)
        .limit(1)

      let familyId: string

      if (existingFamilies && existingFamilies.length > 0) {
        familyId = existingFamilies[0].id
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

      // Insert members
      for (const row of members) {
        const validRoles = ['head', 'spouse', 'child', 'other']
        const role = validRoles.includes(row.role?.toLowerCase() ?? '')
          ? row.role!.toLowerCase()
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
      errors.push(`Unexpected error for family "${familyName}": ${String(err)}`)
    }
  }

  revalidatePath('/')
  return { imported, errors }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

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
