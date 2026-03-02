import { getAdmins } from '@/lib/actions'
import { AdminsManager } from '@/components/admins-manager'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const admins = await getAdmins()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage admin access to the directory</p>
      </div>
      <AdminsManager initialAdmins={admins} />
    </div>
  )
}
