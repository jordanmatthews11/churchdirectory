'use client'

import { Family, Member } from '@/types'
import { formatMemberDisplayLine } from '@/lib/member-display'
import { getPhotoFitClass, getPhotoPresentationStyle } from '@/lib/photo-presentation'

export interface DirectoryCellProps {
  family: Family & { members?: Member[] }
  placeholderUrl?: string | null
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

export function DirectoryCell({ family, placeholderUrl }: DirectoryCellProps) {
  const members = family.members ?? []
  const memberLine = formatMemberDisplayLine(
    members,
    family.different_last_names ?? false
  )

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
            className={`absolute inset-0 h-full w-full ${getPhotoFitClass(family.photo_fit)}`}
            style={getPhotoPresentationStyle({
              fit: family.photo_fit,
              positionX: family.photo_position_x,
              positionY: family.photo_position_y,
              zoom: family.photo_zoom,
            })}
          />
        ) : placeholderUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={placeholderUrl}
            alt="Family photo placeholder"
            className="absolute inset-0 h-full w-full object-cover"
          />
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

