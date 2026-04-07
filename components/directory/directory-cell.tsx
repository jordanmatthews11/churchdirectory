'use client'

import Image from 'next/image'
import { Family, Member } from '@/types'

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
  const memberNames = members.map((m) => m.first_name.trim()).filter(Boolean)
  const memberLine = memberNames.join(', ')

  return (
    <div className="directory-cell">
      <div className="directory-photo">
        {family.photo_url ? (
          <Image src={family.photo_url} alt={`${family.name} photo`} fill className="object-cover" sizes="80px" />
        ) : (
          <div className="directory-photo-placeholder">
            <span className="directory-photo-initials">{getInitials(family.name)}</span>
          </div>
        )}
      </div>

      <div className="directory-names">
        <div className="directory-family-name">{family.name || '\u00A0'}</div>
        <div className="directory-member-names">{memberLine || '\u00A0'}</div>
      </div>
    </div>
  )
}

