'use client'

import { Family, Member } from '@/types'
import { formatFamilyDisplayName, formatMemberDisplayLine } from '@/lib/member-display'

export interface DirectoryCellProps {
  family: Family & { members?: Member[] }
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
  const initials = parts.map((p) => p.charAt(0).toUpperCase()).join('')
  return initials || '?'
}

export function DirectoryCell({ family }: DirectoryCellProps) {
  const members = family.members ?? []
  const diff = family.different_last_names ?? false
  const displayName = formatFamilyDisplayName(members, diff)
  const memberLine = formatMemberDisplayLine(members, diff)

  if (!family.name && !memberLine) {
    return <div className="directory-cell" style={{ visibility: 'hidden' }} />
  }

  return (
    <div className="directory-cell">
      <div className="directory-photo">
        {family.photo_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={family.photo_url}
            alt={`${family.name} photo`}
            className={`absolute inset-0 h-full w-full ${
              (family.photo_fit ?? 'cover') === 'contain' ? 'object-contain' : 'object-cover'
            }`}
            style={{
              objectPosition: `${family.photo_position_x ?? 50}% ${family.photo_position_y ?? 50}%`,
            }}
          />
        ) : (
          <div className="directory-photo-placeholder">
            <span className="directory-photo-initials">{getInitials(family.name)}</span>
          </div>
        )}
      </div>

      <div className="directory-names">
        <div className="directory-family-name">{displayName ?? (family.name || '\u00A0')}</div>
        <div className="directory-member-names">{memberLine || '\u00A0'}</div>
      </div>
    </div>
  )
}

