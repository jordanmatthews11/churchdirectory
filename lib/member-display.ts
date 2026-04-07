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

/**
 * When `differentLastNames` is false: comma-separated first names.
 * When true: non-child members shown as "First Last" joined with "and",
 * children shown as first names only, comma-separated after.
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

  const nonChildren = list.filter((m) => m.role !== 'child')
  const children = list.filter((m) => m.role === 'child')

  const fullNames = nonChildren.map(fullName).filter(Boolean)
  const childFirst = children.map((m) => m.first_name.trim()).filter(Boolean)

  if (fullNames.length === 0) {
    return list.map((m) => m.first_name.trim()).filter(Boolean).join(', ')
  }

  let mainPart: string
  if (fullNames.length === 1) {
    mainPart = fullNames[0]
  } else if (fullNames.length === 2) {
    mainPart = `${fullNames[0]} and ${fullNames[1]}`
  } else {
    mainPart =
      fullNames.slice(0, -1).join(', ') + ', and ' + fullNames[fullNames.length - 1]
  }

  if (childFirst.length === 0) return mainPart
  return `${mainPart}, ${childFirst.join(', ')}`
}
