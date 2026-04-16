'use client'

import { DirectorySettings } from '@/types'

/** Blank final page for the printed directory. */
interface BackPageProps {
  settings: DirectorySettings
}

export function BackPage({ settings }: BackPageProps) {
  const hasContent = Boolean(settings.back_page_html && settings.back_page_html.trim() && settings.back_page_html !== '<p></p>')

  return (
    <section className="directory-page directory-back-page break-after-page" aria-label="Back page">
      {hasContent ? (
        <div className="back-page-content" dangerouslySetInnerHTML={{ __html: settings.back_page_html ?? '' }} />
      ) : null}
    </section>
  )
}
