'use client'

import { DirectorySettings } from '@/types'

/** Blank final page for the printed directory. */
interface BackPageProps {
  settings: DirectorySettings
}

function toInches(value: number | string | null | undefined) {
  const parsedValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(parsedValue) ? `${parsedValue}in` : undefined
}

export function BackPage({ settings }: BackPageProps) {
  const hasContent = Boolean(settings.back_page_html && settings.back_page_html.trim() && settings.back_page_html !== '<p></p>')

  return (
    <section className="directory-page directory-back-page break-after-page" aria-label="Back page">
      {hasContent ? (
        <div
          className="back-page-content"
          data-export-photo="true"
          style={{
            paddingTop: toInches(settings.back_page_margin_top),
            paddingBottom: toInches(settings.back_page_margin_bottom),
          }}
          dangerouslySetInnerHTML={{ __html: settings.back_page_html ?? '' }}
        />
      ) : null}
    </section>
  )
}
