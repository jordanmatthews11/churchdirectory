'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

import { getDirectorySettings, updateDirectorySettings } from '@/lib/actions'
import { LeadershipEditor } from '@/components/directory/leadership-editor'
import { DirectorySettings } from '@/types'
import { Button } from '@/components/ui/button'

export default function LeadershipSettingsPage() {
  const [settings, setSettings] = useState<DirectorySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const s = await getDirectorySettings()
        if (!s) {
          const created = await updateDirectorySettings({
            intro_text: 'Welcome to our church directory.',
            date_label: '',
          })
          setSettings(created)
        } else {
          setSettings(s)
        }
      } catch (err) {
        console.error('Leadership page load error:', err)
        setLoadError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  async function handleSave(values: Partial<Pick<DirectorySettings, 'leadership_data'>>) {
    const next = await updateDirectorySettings(values)
    setSettings(next)
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-3 text-slate-600">
        <Loader2 className="h-6 w-6 animate-spin" />
        Loading…
      </div>
    )
  }

  if (loadError || !settings) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <h1 className="mb-2 text-lg font-semibold text-red-800">Could not load settings</h1>
        <p className="text-sm text-red-700">{loadError || 'No directory settings found.'}</p>
        <Button type="button" className="mt-4" variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Leadership &amp; Staff</h1>
          <p className="mt-1 max-w-2xl text-slate-600">
            Edit the Elders, Deacons, Deaconesses, and Staff lists for the second-to-last page of your printed
            directory. Use the{' '}
            <Link href="/directory" className="font-medium text-[#7A9C49] hover:underline">
              Directory
            </Link>{' '}
            builder to preview layout and export PDF.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <LeadershipEditor settings={settings} onSave={handleSave} />
      </div>
    </div>
  )
}
