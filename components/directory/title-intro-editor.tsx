'use client'

import { useMemo } from 'react'

import { type ResolvedTitlePageLayout, type TitlePageLayoutPatch } from '@/lib/title-page-layout'
import { RichTextEditor } from '@/components/directory/rich-text-editor'

interface TitleIntroEditorProps {
  introText: string
  introLayout: ResolvedTitlePageLayout['intro']
  onChange: (patch: TitlePageLayoutPatch) => void
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function splitIntoParagraphs(text: string) {
  return text
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

function buildLegacyIntroStyle(introLayout: ResolvedTitlePageLayout['intro']) {
  const styleParts = [
    `font-size:${introLayout.font_size}px`,
    `line-height:${introLayout.line_height}`,
    `text-align:${introLayout.align}`,
    'margin:0',
  ]

  if (introLayout.color) styleParts.push(`color:${introLayout.color}`)
  if (introLayout.bold) styleParts.push('font-weight:700')
  if (introLayout.italic) styleParts.push('font-style:italic')

  return styleParts.join(';')
}

function buildIntroHtmlFromLegacy(
  introText: string,
  introLayout: ResolvedTitlePageLayout['intro']
) {
  const paragraphs = splitIntoParagraphs(introText)
  if (paragraphs.length === 0) return '<p></p>'

  const paragraphStyle = buildLegacyIntroStyle(introLayout)
  return paragraphs
    .map((paragraph) => {
      const html = escapeHtml(paragraph).replaceAll('\n', '<br />')
      return `<p style="${paragraphStyle}">${html}</p>`
    })
    .join('')
}

export function TitleIntroEditor({
  introText,
  introLayout,
  onChange,
}: TitleIntroEditorProps) {
  const initialHtml = useMemo(() => {
    if (introLayout.intro_html && introLayout.intro_html.trim()) {
      return introLayout.intro_html
    }
    return buildIntroHtmlFromLegacy(introText, introLayout)
  }, [introLayout, introText])

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Edit the Opening page copy with the same toolbar used on the Back page.
      </p>
      <RichTextEditor
        initialHtml={initialHtml}
        minHeight={280}
        onChange={(html) => onChange({ intro: { intro_html: html } })}
      />
    </div>
  )
}
