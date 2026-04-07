import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Users } from 'lucide-react'
import { Family, Member } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatMemberDisplayLine } from '@/lib/member-display'

interface FamilyCardProps {
  family: Family & { members?: Member[] }
}

export function FamilyCard({ family }: FamilyCardProps) {
  const memberCount = family.members?.length ?? 0
  const memberLine = formatMemberDisplayLine(
    family.members,
    family.different_last_names ?? false
  )
  const location = [family.city, family.state].filter(Boolean).join(', ')

  return (
    <Link href={`/families/${family.id}`}>
      <Card className="group h-full overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5">
        <div className="relative h-32 bg-gradient-to-br from-blue-50 to-slate-100">
          {family.photo_url ? (
            <Image
              src={family.photo_url}
              alt={`${family.name} family`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                <span className="text-2xl font-bold text-blue-700">
                  {family.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
              {family.name} Family
            </h3>
            <Badge variant="secondary" className="shrink-0 text-xs">
              <Users className="mr-1 h-3 w-3" />
              {memberCount}
            </Badge>
          </div>
          {memberLine && (
            <p className="mt-1 text-sm font-medium text-blue-800/90">{memberLine}</p>
          )}
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
