import { DirectorySettings } from '@/types'

const DEFAULT_LOGO_WIDTH = 55
const DEFAULT_TITLE_IMAGE_WIDTH = 70

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function splitIntoParagraphs(text: string) {
  return text
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

function buildImageFigure(src: string, alt: string, width: number) {
  return `<figure class="back-page-image" data-align="center"><img src="${escapeHtml(src)}" alt="${escapeHtml(
    alt
  )}" style="width:${width}%"></figure>`
}

export function buildOpeningPageHtmlFromLegacy(settings: DirectorySettings): string {
  const parts: string[] = []

  if (settings.logo_url?.trim()) {
    parts.push(buildImageFigure(settings.logo_url.trim(), 'Opening page logo', DEFAULT_LOGO_WIDTH))
  }

  for (const paragraph of splitIntoParagraphs(settings.intro_text ?? '')) {
    parts.push(`<p>${escapeHtml(paragraph)}</p>`)
  }

  if (settings.title_image_url?.trim()) {
    parts.push(buildImageFigure(settings.title_image_url.trim(), 'Opening page image', DEFAULT_TITLE_IMAGE_WIDTH))
  }

  if (settings.date_label?.trim()) {
    parts.push(`<p style="text-align:center">${escapeHtml(settings.date_label.trim())}</p>`)
  }

  return parts.join('')
}
