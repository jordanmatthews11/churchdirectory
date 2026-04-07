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
 * When true: adults as "First Last" joined with "and",
 * then children/other as first names comma-separated.
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

  const adults = list.filter((m) => m.role === 'adult')
  const rest = list.filter((m) => m.role !== 'adult')

  const adultFull = adults.map(fullName).filter(Boolean)
  const restFirst = rest.map((m) => m.first_name.trim()).filter(Boolean)

  if (adultFull.length === 0) {
    return list.map((m) => m.first_name.trim()).filter(Boolean).join(', ')
  }

  let adultPart: string
  if (adultFull.length === 1) {
    adultPart = adultFull[0]
  } else if (adultFull.length === 2) {
    adultPart = `${adultFull[0]} and ${adultFull[1]}`
  } else {
    adultPart =
      adultFull.slice(0, -1).join(', ') + ', and ' + adultFull[adultFull.length - 1]
  }

  if (restFirst.length === 0) return adultPart
  return `${adultPart}, ${restFirst.join(', ')}`
}
