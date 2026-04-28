'use client'

import { DirectorySettings } from '@/types'

export interface CoverPageProps {
  settings: DirectorySettings
}

export function CoverPage({ settings }: CoverPageProps) {
  return (
    <section className="directory-page directory-cover-page relative overflow-hidden bg-white break-after-page">
      <div className="absolute inset-0" data-export-photo="true">
        {settings.cover_image_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={settings.cover_image_url}
            alt="Directory Cover"
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
            <div className="rounded-xl border-2 border-slate-200 bg-white px-6 py-5 text-center">
              <div className="text-sm font-semibold text-slate-700">Upload cover art</div>
              <div className="mt-1 text-xs text-slate-500">Use the cover upload in the right panel.</div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
