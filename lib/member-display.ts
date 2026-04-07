import type { Member } from '@/types'

const ROLE_ORDER: Record<Member['role'], number> = {
  adult: 0,
  child: 1,
  other: 2,
}

export function sortMembersForDisplay(members: Member[]): Member[] {
  return [...members].sort(
    (a, b) => (ROLE_ORDER[a.role] ?? 2) - (ROLE_ORDER[b.role] ?? 2)
  )
}

function fullName(m: Member): string {
  return [m.first_name, m.last_name]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ')
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1]
}

/**
 * Returns the display name to use in place of the family last name.
 * When `differentLastNames` is true, returns full names of non-child
 * members joined with "and" (e.g. "Gene Wirth and Mary Degloyer").
 * Returns null when the default family name should be used instead.
 */
export function formatFamilyDisplayName(
  members: Member[] | undefined,
  differentLastNames: boolean
): string | null {
  if (!differentLastNames) return null
  const list = sortMembersForDisplay(members ?? [])
  const nonChildren = list.filter((m) => m.role !== 'child')
  const names = nonChildren.map(fullName).filter(Boolean)
  if (names.length === 0) return null
  return joinNames(names)
}

/**
 * Returns the member line shown beneath the family name.
 * When `differentLastNames` is false: all first names comma-separated.
 * When true: only children's first names (non-children are already
 * shown in the family name line via formatFamilyDisplayName).
 */
export function formatMemberDisplayLine(
  members: Member[] | undefined,
  differentLastNames: boolean
): string {
  const list = sortMembersForDisplay(members ?? [])
  if (list.length === 0) return ''

  if (!differentLastNames) {
    return list.map((m) => m.first_name.trim()).filter(Boolean).join(', ')
  }

  const children = list.filter((m) => m.role === 'child')
  return children.map((m) => m.first_name.trim()).filter(Boolean).join(', ')
}
