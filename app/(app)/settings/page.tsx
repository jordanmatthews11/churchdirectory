import { getAdmins } from '@/lib/actions'
import { AdminsManager } from '@/components/admins-manager'
import { PlaceholderUploader } from '@/components/placeholder-uploader'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const admins = await getAdmins()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage admin access to the directory</p>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <PlaceholderUploader />
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Developer Notes</h2>
            <p className="text-sm text-slate-500">
              Project handoff guide with architecture, integrations, storage, and maintenance notes.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/settings/developer-notes">Developer Notes</Link>
          </Button>
        </div>
      </div>
      <AdminsManager initialAdmins={admins} />
    </div>
  )
}
