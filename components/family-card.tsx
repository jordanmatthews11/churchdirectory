import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { Family, Member } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { formatFamilyDisplayName, formatMemberDisplayLine } from '@/lib/member-display'

interface FamilyCardProps {
  family: Family & { members?: Member[] }
}

export function FamilyCard({ family }: FamilyCardProps) {
  const location = [family.city, family.state].filter(Boolean).join(', ')
  const displayName = formatFamilyDisplayName(
    family.members,
    family.different_last_names ?? false
  )
  const memberNames = formatMemberDisplayLine(
    family.members,
    family.different_last_names ?? false
  )

  return (
    <Link href={`/families/${family.id}`}>
      <Card className="group h-full overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5">
        <div className="flex items-center justify-center bg-gradient-to-br from-[#F4F4EC] to-slate-100 p-3">
          {family.photo_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={family.photo_url}
              alt={`${family.name} family`}
              className={`max-h-44 w-full rounded ${
                (family.photo_fit ?? 'cover') === 'contain' ? 'object-contain' : 'object-cover'
              }`}
              style={{
                objectPosition: `${family.photo_position_x ?? 50}% ${family.photo_position_y ?? 50}%`,
              }}
            />
          ) : (
            <div className="flex h-28 items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                <span className="text-2xl font-bold text-[#7A9C49]">
                  {family.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          )}
        </div>
        <CardContent className="p-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-slate-800 transition-colors group-hover:text-[#7A9C49]">
              {displayName ?? family.name}
            </h3>
            <p className="mt-0.5 line-clamp-2 min-h-9 text-sm text-slate-500">
              {memberNames || 'No members'}
            </p>
          </div>
          {location && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="h-3 w-3" />
              {location}
            </p>
          )}
          {family.mailing_address && (
            <p className="mt-0.5 text-xs text-slate-400">{family.mailing_address}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
