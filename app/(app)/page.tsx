import Link from 'next/link'
import { Plus, Upload, Users } from 'lucide-react'
import { getFamiliesWithMembers } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { FamilyCard } from '@/components/family-card'
import { FamilySearch } from '@/components/family-search'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const allFamilies = await getFamiliesWithMembers()
  const families = q
    ? allFamilies.filter((f) =>
        f.name.toLowerCase().includes(q.toLowerCase())
      )
    : allFamilies

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Family Directory</h1>
          <p className="text-sm text-slate-500">
            {allFamilies.length} {allFamilies.length === 1 ? 'family' : 'families'} in the directory
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/import">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Link>
          </Button>
          <Button asChild size="sm" className="bg-blue-700 hover:bg-blue-800">
            <Link href="/families/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Family
            </Link>
          </Button>
        </div>
      </div>

      <FamilySearch defaultValue={q} />

      {families.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Users className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="mb-1 text-lg font-semibold text-slate-700">
            {q ? 'No families found' : 'No families yet'}
          </h3>
          <p className="mb-6 max-w-sm text-sm text-slate-500">
            {q
              ? `No families match "${q}". Try a different search.`
              : 'Get started by adding your first family or importing a spreadsheet.'}
          </p>
          {!q && (
            <div className="flex gap-3">
              <Button asChild variant="outline" size="sm">
                <Link href="/import">
                  <Upload className="mr-2 h-4 w-4" />
                  Import spreadsheet
                </Link>
              </Button>
              <Button asChild size="sm" className="bg-blue-700 hover:bg-blue-800">
                <Link href="/families/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add family
                </Link>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {families.map((family) => (
            <FamilyCard key={family.id} family={family} />
          ))}
        </div>
      )}
    </div>
  )
}
