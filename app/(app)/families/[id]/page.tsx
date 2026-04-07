import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'
import { getFamily } from '@/lib/actions'
import { formatMemberDisplayLine } from '@/lib/member-display'
import { Button } from '@/components/ui/button'
import { FamilyProfile } from '@/components/family-profile'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function FamilyPage({ params }: PageProps) {
  const { id } = await params
  const family = await getFamily(id)

  if (!family) notFound()

  const members = family.members ?? []
  const sortedMembers = [...members].sort((a, b) => {
    const order = { head: 0, spouse: 1, child: 2, other: 3 } as const
    return (order[a.role] ?? 3) - (order[b.role] ?? 3)
  })
  const subtitle =
    family.different_last_names && sortedMembers.length > 0
      ? formatMemberDisplayLine(sortedMembers, true)
      : `${sortedMembers.length} ${sortedMembers.length === 1 ? 'member' : 'members'}`

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">{family.name} Family</h1>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <Button asChild size="sm" className="bg-blue-700 hover:bg-blue-800">
          <Link href={`/families/${id}/members/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Member
          </Link>
        </Button>
      </div>

      <FamilyProfile family={family} />
    </div>
  )
}
