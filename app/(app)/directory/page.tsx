'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { getDirectorySettings, getFamiliesWithMembers, updateDirectorySettings } from '@/lib/actions'
import { CoverPage } from '@/components/directory/cover-page'
import { TitlePage } from '@/components/directory/title-page'
import { DirectoryGrid } from '@/components/directory/directory-grid'
import { DirectorySettings, Family } from '@/types'
import { Button } from '@/components/ui/button'

export default function DirectoryPage() {
  const [settings, setSettings] = useState<DirectorySettings | null>(null)
  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [s, f] = await Promise.all([getDirectorySettings(), getFamiliesWithMembers()])
        setSettings(s)
        setFamilies(f)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  async function handleCoverSaved(url: string | null) {
    const next = await updateDirectorySettings({ cover_image_url: url })
    setSettings(next)
  }

  async function handleTitleImageSaved(url: string | null) {
    const next = await updateDirectorySettings({ title_image_url: url })
    setSettings(next)
  }

  async function handleTextSaved(values: Pick<DirectorySettings, 'intro_text' | 'date_label'>) {
    const next = await updateDirectorySettings(values)
    setSettings(next)
  }

  if (loading || !settings) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading directory...
        </div>
      </div>
    )
  }

  return (
    <div className="directory-print">
      <div className="print-hidden mb-6 flex items-center justify-end">
        <Button type="button" className="bg-blue-700 hover:bg-blue-800" onClick={() => window.print()}>
          Print Directory
        </Button>
      </div>

      <div className="directory-print-canvas">
        <CoverPage coverImageUrl={settings.cover_image_url} onCoverImageSaved={handleCoverSaved} />

        <TitlePage
          settings={settings}
          onTitleImageSaved={handleTitleImageSaved}
          onTextSaved={handleTextSaved}
        />

        <DirectoryGrid families={families} />
      </div>
    </div>
  )
}

