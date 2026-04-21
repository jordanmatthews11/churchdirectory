'use client'

import { useEffect, useMemo, useRef } from 'react'

import { buildOpeningPageHtmlFromLegacy } from '@/lib/opening-page-html'
import { DirectorySettings } from '@/types'

export interface TitlePageProps {
  settings: DirectorySettings
  onSettingsSaved?: (values: Partial<DirectorySettings>) => Promise<void>
}

function toInches(value: number | null | undefined) {
  return typeof value === 'number' ? `${value}in` : undefined
}

export function TitlePage({ settings, onSettingsSaved }: TitlePageProps) {
  const attemptedSeedRef = useRef<string | null>(null)
  const seededHtml = useMemo(() => buildOpeningPageHtmlFromLegacy(settings), [settings])
  const savedHtml = settings.opening_page_html?.trim() ? settings.opening_page_html : ''
  const html = savedHtml || seededHtml
  const hasContent = Boolean(html.trim() && html !== '<p></p>')

  useEffect(() => {
    if (savedHtml || !seededHtml.trim() || !onSettingsSaved) return
    if (attemptedSeedRef.current === seededHtml) return

    attemptedSeedRef.current = seededHtml
    void onSettingsSaved({ opening_page_html: seededHtml })
  }, [savedHtml, seededHtml, onSettingsSaved])

  return (
    <section className="directory-page directory-title-page break-after-page bg-white" aria-label="Opening page">
      {hasContent ? (
        <div
          className="opening-page-content"
          style={{
            paddingTop: toInches(settings.opening_page_margin_top),
            paddingBottom: toInches(settings.opening_page_margin_bottom),
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : null}
    </section>
  )
}

