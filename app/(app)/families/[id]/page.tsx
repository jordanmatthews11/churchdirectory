import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'
import { getFamily } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { FamilyProfile } from '@/components/family-profile'
import { formatFamilyDisplayName } from '@/lib/member-display'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function FamilyPage({ params }: PageProps) {
  const { id } = await params
  const family = await getFamily(id)

  if (!family) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">
            {formatFamilyDisplayName(family.members, family.different_last_names ?? false) ?? `${family.name} Family`}
          </h1>
          <p className="text-sm text-slate-500">
            {family.members?.length ?? 0}{' '}
            {(family.members?.length ?? 0) === 1 ? 'member' : 'members'}
          </p>
        </div>
        <Button asChild size="sm" className="bg-[#7A9C49] hover:bg-[#6B8A3D]">
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
