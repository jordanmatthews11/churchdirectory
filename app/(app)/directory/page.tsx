'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { toast } from 'sonner'

import { getDirectorySettings, getFamiliesWithMembers, updateDirectorySettings } from '@/lib/actions'
import { CoverPage } from '@/components/directory/cover-page'
import { TitlePage } from '@/components/directory/title-page'
import { DirectoryGrid, getDirectoryPageCount } from '@/components/directory/directory-grid'
import { LeadershipPage } from '@/components/directory/leadership-page'
import { BackPage } from '@/components/directory/back-page'
import { PropertiesPanel } from '@/components/directory/properties-panel'
import { DirectorySettings, Family } from '@/types'
import { Button } from '@/components/ui/button'

/** Modern CSS color functions html2canvas cannot parse. Handles one level of nested parens. */
const COLOR_FN_RE = /\b(?:oklch|lab|oklab|lch|color)\((?:[^()]*|\([^()]*\))*\)/gi

function stripUnsupportedCssColors(css: string) {
  return css
    .replace(COLOR_FN_RE, 'transparent')
    .replace(/\blight-dark\((?:[^()]*|\([^()]*\))*\)/gi, 'transparent')
    .replace(/\bcolor-mix\((?:[^()]*|\((?:[^()]*|\([^()]*\))*\))*\)/gi, 'transparent')
}

function collectSanitizedCss(): string {
  let css = ''
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = (sheet as CSSStyleSheet).cssRules
      for (const rule of Array.from(rules)) {
        css += `${rule.cssText}\n`
      }
    } catch {
      // cross-origin stylesheets throw — skip them
    }
  }
  return stripUnsupportedCssColors(css)
}

type StyleSnapshot = { el: Element; parent: Node; before: Node | null }

/** Snapshot ALL <link rel="stylesheet"> and <style> in the entire document (head + body). */
function snapshotAllStyles(): StyleSnapshot[] {
  const nodes = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
  return nodes.map((el) => ({
    el,
    parent: el.parentNode!,
    before: el.nextSibling,
  }))
}

/** Remove every snapshotted stylesheet and inject one sanitized <style> into <head>. */
function applySanitizedStyles(sanitizedCss: string, snapshots: StyleSnapshot[]) {
  snapshots.forEach(({ el }) => el.remove())
  const inject = document.createElement('style')
  inject.id = 'directory-export-sanitized-css'
  inject.textContent = sanitizedCss
  document.head.appendChild(inject)
  return inject
}

/** Restore all original stylesheets to their original positions. */
function restoreStyles(inject: HTMLStyleElement, snapshots: StyleSnapshot[]) {
  inject.remove()
  for (let i = snapshots.length - 1; i >= 0; i--) {
    const { el, parent, before } = snapshots[i]
    parent.insertBefore(el, before)
  }
}

/**
 * Force any CSS color value into #rrggbb or rgba() that html2canvas can parse.
 * Chrome 111+ returns lab()/oklch() from getComputedStyle; canvas 2D always
 * serializes back to hex or rgba().
 */
const _colorCtx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null

function toSafeColor(value: string): string {
  if (!value || value === 'transparent' || value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) {
    return value
  }
  if (!_colorCtx) return value
  _colorCtx.fillStyle = '#000'
  _colorCtx.fillStyle = value
  return _colorCtx.fillStyle
}

function inlineExportColors(container: HTMLElement) {
  const propsToInline: Array<[string, (cs: CSSStyleDeclaration) => string]> = [
    ['color', (cs) => cs.color],
    ['background-color', (cs) => cs.backgroundColor],
    ['border-top-color', (cs) => cs.borderTopColor],
    ['border-right-color', (cs) => cs.borderRightColor],
    ['border-bottom-color', (cs) => cs.borderBottomColor],
    ['border-left-color', (cs) => cs.borderLeftColor],
    ['outline-color', (cs) => cs.outlineColor],
    ['text-decoration-color', (cs) => cs.textDecorationColor],
    ['column-rule-color', (cs) => cs.columnRuleColor],
    ['caret-color', (cs) => cs.caretColor],
  ]
  const restore = new Map<HTMLElement, string | null>()
  const elements = [container, ...Array.from(container.querySelectorAll<HTMLElement>('*'))]
  for (const el of elements) {
    restore.set(el, el.getAttribute('style'))
    const cs = window.getComputedStyle(el)
    for (const [propName, getValue] of propsToInline) {
      const value = getValue(cs)
      if (!value) continue
      el.style.setProperty(propName, toSafeColor(value))
    }
  }
  return () => {
    for (const [el, styleAttr] of restore.entries()) {
      if (styleAttr === null) el.removeAttribute('style')
      else el.setAttribute('style', styleAttr)
    }
  }
}

/**
 * Convert cross-origin <img> srcs to data URLs via our same-origin proxy.
 * html2canvas can't load cross-origin images when the bucket lacks CORS headers.
 */
async function proxyImagesToDataUrls(container: HTMLElement): Promise<() => void> {
  const imgs = Array.from(container.querySelectorAll<HTMLImageElement>('img[src]'))
  const origSrcs = new Map<HTMLImageElement, string>()

  for (const img of imgs) {
    if (img.src.startsWith('data:') || img.src.startsWith('blob:')) continue
    if (new URL(img.src).origin === window.location.origin) continue

    origSrcs.set(img, img.src)
    try {
      const res = await fetch(`/api/image-proxy?url=${encodeURIComponent(img.src)}`)
      if (!res.ok) continue
      const blob = await res.blob()
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
      img.src = dataUrl
    } catch {
      // leave original src if proxy fails
    }
  }

  return () => {
    for (const [img, src] of origSrcs) img.src = src
  }
}

function normalizeExportCssValue(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function parseObjectPositionPercent(value: string): { x: number; y: number } {
  const normalized = normalizeExportCssValue(value)
  if (!normalized) return { x: 50, y: 50 }

  const keywordToPercent = (part: string, axis: 'x' | 'y'): number | null => {
    if (part.endsWith('%')) {
      const parsed = Number.parseFloat(part)
      return Number.isFinite(parsed) ? parsed : null
    }
    if (part === 'left' || part === 'top') return 0
    if (part === 'center') return 50
    if (part === 'right' || part === 'bottom') return 100
    if (axis === 'x' && part === 'x-start') return 0
    if (axis === 'x' && part === 'x-end') return 100
    if (axis === 'y' && part === 'y-start') return 0
    if (axis === 'y' && part === 'y-end') return 100
    return null
  }

  const parts = normalized.split(/\s+/).filter(Boolean)
  const x = keywordToPercent(parts[0] ?? '', 'x') ?? 50
  const y = keywordToPercent(parts[1] ?? parts[0] ?? '', 'y') ?? 50
  return { x, y }
}

function parseScaleFromTransform(value: string): number {
  const normalized = normalizeExportCssValue(value)
  if (!normalized || normalized === 'none') return 1

  const scaleMatch = normalized.match(/^scale\(([^,)]+)(?:,\s*([^)]+))?\)$/)
  if (scaleMatch) {
    const x = Number.parseFloat(scaleMatch[1] ?? '')
    const y = Number.parseFloat(scaleMatch[2] ?? scaleMatch[1] ?? '')
    if (Number.isFinite(x) && Number.isFinite(y)) return (x + y) / 2
    if (Number.isFinite(x)) return x
  }

  const matrixMatch = normalized.match(/^matrix\((.+)\)$/)
  if (matrixMatch) {
    const values = matrixMatch[1].split(',').map((part) => Number.parseFloat(part.trim()))
    const [a, b, c, d] = values
    if ([a, b, c, d].every((part) => Number.isFinite(part))) {
      const scaleX = Math.hypot(a!, b!)
      const scaleY = Math.hypot(c!, d!)
      return (scaleX + scaleY) / 2
    }
  }

  return 1
}

function parseInsetClip(
  value: string,
  containerWidth: number,
  containerHeight: number
): { x: number; y: number; w: number; h: number } | null {
  const normalized = normalizeExportCssValue(value)
  if (!normalized || normalized === 'none') return null

  const insetMatch = normalized.match(/^inset\((.+)\)$/)
  if (!insetMatch) return null

  const tokens = insetMatch[1]
    .replace(/round\s+.+$/, '')
    .split(/\s+/)
    .filter(Boolean)

  if (tokens.length === 0) return null

  const [topToken, rightToken = topToken, bottomToken = topToken, leftToken = rightToken] = tokens

  const parseInsetValue = (token: string, axisSize: number): number | null => {
    if (token.endsWith('%')) {
      const percent = Number.parseFloat(token)
      return Number.isFinite(percent) ? (axisSize * percent) / 100 : null
    }
    if (token.endsWith('px') || /^-?\d*\.?\d+$/.test(token)) {
      const pixels = Number.parseFloat(token)
      return Number.isFinite(pixels) ? pixels : null
    }
    return null
  }

  const top = parseInsetValue(topToken, containerHeight)
  const right = parseInsetValue(rightToken, containerWidth)
  const bottom = parseInsetValue(bottomToken, containerHeight)
  const left = parseInsetValue(leftToken, containerWidth)
  if ([top, right, bottom, left].some((part) => part === null)) return null

  const x = Math.max(0, left!)
  const y = Math.max(0, top!)
  const w = Math.max(0, containerWidth - left! - right!)
  const h = Math.max(0, containerHeight - top! - bottom!)
  return { x, y, w, h }
}

function computeFitDraw(
  imageWidth: number,
  imageHeight: number,
  containerWidth: number,
  containerHeight: number,
  mode: 'cover' | 'contain',
  zoom: number,
  positionXPercent: number,
  positionYPercent: number
): { dx: number; dy: number; dw: number; dh: number } {
  if (imageWidth <= 0 || imageHeight <= 0 || containerWidth <= 0 || containerHeight <= 0) {
    return {
      dx: 0,
      dy: 0,
      dw: containerWidth,
      dh: containerHeight,
    }
  }

  const scaleX = containerWidth / imageWidth
  const scaleY = containerHeight / imageHeight
  const scale = (mode === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY)) * zoom
  const dw = imageWidth * scale
  const dh = imageHeight * scale
  const dx = (containerWidth - dw) * (positionXPercent / 100)
  const dy = (containerHeight - dh) * (positionYPercent / 100)

  return { dx, dy, dw, dh }
}

/**
 * html2canvas ignores object-fit / object-position, stretching images to fill
 * their container. Work around this by swapping each export photo <img> with a
 * pre-rasterized <canvas> so html2canvas copies the final pixels directly. Must run
 * after proxyImagesToDataUrls so src is same-origin.
 */
async function replaceImgsWithCanvases(container: HTMLElement): Promise<() => void> {
  const entries: { img: HTMLImageElement; replacement: HTMLCanvasElement }[] = []

  const imgs = Array.from(
    container.querySelectorAll<HTMLImageElement>(
      '.directory-photo img, [data-export-photo="true"] img'
    )
  )

  for (const img of imgs) {
    const parent = img.parentElement
    if (!parent) continue

    const containerWidth = parent.clientWidth
    const containerHeight = parent.clientHeight
    if (containerWidth <= 0 || containerHeight <= 0) continue

    await img.decode().catch(() => {})

    const imageWidth = img.naturalWidth || 0
    const imageHeight = img.naturalHeight || 0
    if (imageWidth <= 0 || imageHeight <= 0) continue

    const fitMode = img.classList.contains('object-contain') ? 'contain' : 'cover'
    const zoom = parseScaleFromTransform(img.style.transform || '')
    const position = parseObjectPositionPercent(img.style.objectPosition || '')
    const dpr = Math.min(window.devicePixelRatio || 1, 3)

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(containerWidth * dpr))
    canvas.height = Math.max(1, Math.round(containerHeight * dpr))
    Object.assign(canvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      display: 'block',
    })

    const context = canvas.getContext('2d')
    if (!context) continue
    context.scale(dpr, dpr)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'

    const clipRect = parseInsetClip(img.style.clipPath || '', containerWidth, containerHeight)
    if (clipRect) {
      context.beginPath()
      context.rect(clipRect.x, clipRect.y, clipRect.w, clipRect.h)
      context.clip()
    }

    const { dx, dy, dw, dh } = computeFitDraw(
      imageWidth,
      imageHeight,
      containerWidth,
      containerHeight,
      fitMode,
      zoom,
      position.x,
      position.y
    )
    context.drawImage(img, dx, dy, dw, dh)

    img.style.display = 'none'
    parent.appendChild(canvas)
    entries.push({ img, replacement: canvas })
  }

  return () => {
    for (const { img, replacement } of entries) {
      replacement.remove()
      img.style.display = ''
    }
  }
}

function createBlankPageCanvas(sample: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = sample.width
  c.height = sample.height
  const ctx = c.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, c.width, c.height)
  }
  return c
}

export default function DirectoryPage() {
  const [settings, setSettings] = useState<DirectorySettings | null>(null)
  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<'web' | 'book' | null>(null)
  const [selectedPageIndex, setSelectedPageIndex] = useState(0)
  const [zoomMode, setZoomMode] = useState<'fit' | 'manual'>('fit')
  const [manualZoom, setManualZoom] = useState(1)
  const [autoFitScale, setAutoFitScale] = useState(1)
  const stageRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const exportCanvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const [s, f] = await Promise.all([getDirectorySettings(), getFamiliesWithMembers()])
        if (!s) {
          const created = await updateDirectorySettings({
            intro_text: 'Welcome to our church directory.',
            date_label: 'April 2026',
          })
          setSettings(created)
        } else {
          setSettings(s)
        }
        setFamilies(f)
      } catch (err) {
        console.error('Directory load error:', err)
        setLoadError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    const frame = frameRef.current
    if (!stage || !frame) return

    const PAGE_WIDTH_PX = 8.5 * 96
    const STAGE_PADDING_PX = 24

    const updatePreviewScale = () => {
      const availableWidth = Math.max(stage.clientWidth - STAGE_PADDING_PX, 0)
      const fitScale = Math.min(1, availableWidth / PAGE_WIDTH_PX) || 1
      setAutoFitScale(fitScale)
      const nextScale = zoomMode === 'fit' ? fitScale : manualZoom
      frame.style.setProperty('--preview-scale', String(nextScale || 1))
    }

    updatePreviewScale()

    const observer = new ResizeObserver(updatePreviewScale)
    observer.observe(stage)

    return () => observer.disconnect()
  }, [zoomMode, manualZoom])

  async function handleSettingsSaved(values: Partial<DirectorySettings>) {
    const next = await updateDirectorySettings(values)
    setSettings(next)
  }

  function handleSettingsPreview(values: Partial<DirectorySettings>) {
    setSettings((prev) => (prev ? { ...prev, ...values } : prev))
  }

  /**
   * Rasterize each `.directory-page`. Sanitizes the *live* document stylesheets first — html2canvas parses them
   * before `onclone`, so the clone-only approach was insufficient for `lab()` / `oklch()` from Tailwind v4.
   */
  async function renderPageCanvases(container: HTMLElement): Promise<HTMLCanvasElement[]> {
    const sanitizedCssText = collectSanitizedCss()

    // Convert cross-origin images to same-origin data URLs so html2canvas can render them.
    const restoreImages = await proxyImagesToDataUrls(container)

    // Swap <img> tags for pre-rasterized canvases so html2canvas copies the final fit directly.
    const restoreCanvases = await replaceImgsWithCanvases(container)

    // Inline computed RGB colors while original stylesheets are still active,
    // so getComputedStyle returns real colors (not the 'transparent' replacements).
    const restoreInlineStyles = inlineExportColors(container)

    // Remove ALL <style>/<link> from the entire document (head AND body) so
    // html2canvas cannot find any unsupported color functions like lab()/oklch().
    const snapshots = snapshotAllStyles()
    const inject = applySanitizedStyles(sanitizedCssText, snapshots)

    try {
      const pages = Array.from(container.querySelectorAll<HTMLElement>('.directory-page'))
      if (pages.length === 0) throw new Error('No pages to export')

      const canvases: HTMLCanvasElement[] = []
      for (const page of pages) {
        const canvas = await html2canvas(page, {
          scale: 3,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: 816,
          height: 1056,
          onclone: (clonedDoc) => {
            clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach((n) => n.remove())
            clonedDoc.querySelectorAll('style').forEach((n) => n.remove())
            const style = clonedDoc.createElement('style')
            style.textContent = sanitizedCssText
            clonedDoc.head.appendChild(style)
          },
        })
        canvases.push(canvas)
      }
      return canvases
    } finally {
      restoreStyles(inject, snapshots)
      restoreInlineStyles()
      restoreCanvases()
      restoreImages()
    }
  }

  async function handleExportWebPdf() {
    if (!exportCanvasRef.current || exporting) return
    setExporting('web')
    const container = exportCanvasRef.current

    try {
      container.style.clip = 'auto'
      container.style.left = '-99999px'
      container.style.overflow = 'visible'

      await new Promise((r) => setTimeout(r, 200))

      const canvases = await renderPageCanvases(container)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter',
      })

      for (let i = 0; i < canvases.length; i += 1) {
        const imgData = canvases[i].toDataURL('image/jpeg', 0.95)
        if (i > 0) pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, 0, 8.5, 11)
      }

      pdf.save(`church-directory-web-${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('Web PDF exported (pages in reading order)')
    } catch (err) {
      console.error('PDF export error:', err)
      toast.error('Failed to export PDF')
    } finally {
      container.style.clip = 'rect(0, 0, 0, 0)'
      container.style.left = '0'
      container.style.overflow = 'hidden'
      setExporting(null)
    }
  }

  /**
   * Saddle-stitch booklet on US Letter landscape (11"x8.5").
   * Each sheet holds two half-letter portrait panels (5.5"x8.5").
   * Print duplex, fold in half, staple at the fold.
   */
  async function handleExportBookPdf() {
    if (!exportCanvasRef.current || exporting) return
    setExporting('book')
    const container = exportCanvasRef.current

    try {
      container.style.clip = 'auto'
      container.style.left = '-99999px'
      container.style.overflow = 'visible'

      await new Promise((r) => setTimeout(r, 200))

      const canvases = await renderPageCanvases(container)
      while (canvases.length % 4 !== 0) {
        canvases.push(createBlankPageCanvas(canvases[0]!))
      }

      const n = canvases.length
      const OUTER_MARGIN = 0.125
      const GUTTER = 0.125
      const PANEL_W = 5.5
      const SHEET_H = 8.5
      const usableW = PANEL_W - OUTER_MARGIN - GUTTER
      const scaleFactor = Math.min(usableW / 8.5, SHEET_H / 11)
      const imgW = 8.5 * scaleFactor
      const imgH = 11 * scaleFactor
      const yOff = OUTER_MARGIN
      const leftX = OUTER_MARGIN + (usableW - imgW) / 2
      const rightX = PANEL_W + GUTTER + (usableW - imgW) / 2

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: 'letter' })
      const sheetCount = n / 4

      const pageMap: string[] = []

      for (let s = 0; s < sheetCount; s += 1) {
        if (s > 0) pdf.addPage('letter', 'l')

        const fl = n - 1 - 2 * s
        const fr = 2 * s
        const bl = 2 * s + 1
        const br = n - 2 - 2 * s

        pageMap.push(`Sheet ${s + 1} front: ${fl + 1} | ${fr + 1}`)
        pageMap.push(`Sheet ${s + 1} back:  ${bl + 1} | ${br + 1}`)

        const imgL_front = canvases[fl]!.toDataURL('image/jpeg', 0.95)
        const imgR_front = canvases[fr]!.toDataURL('image/jpeg', 0.95)
        pdf.addImage(imgL_front, 'JPEG', leftX, yOff, imgW, imgH)
        pdf.addImage(imgR_front, 'JPEG', rightX, yOff, imgW, imgH)

        pdf.addPage('letter', 'l')
        const imgL_back = canvases[bl]!.toDataURL('image/jpeg', 0.95)
        const imgR_back = canvases[br]!.toDataURL('image/jpeg', 0.95)
        pdf.addImage(imgL_back, 'JPEG', leftX, yOff, imgW, imgH)
        pdf.addImage(imgR_back, 'JPEG', rightX, yOff, imgW, imgH)
      }

      console.log(
        `Booklet page map (${n} pages, ${sheetCount} sheets):\n` + pageMap.join('\n')
      )

      pdf.save(`church-directory-book-${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('Book PDF exported (letter landscape, saddle-stitch)')
    } catch (err) {
      console.error('PDF export error:', err)
      toast.error('Failed to export PDF')
    } finally {
      container.style.clip = 'rect(0, 0, 0, 0)'
      container.style.left = '0'
      container.style.overflow = 'hidden'
      setExporting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading directory...
        </div>
      </div>
    )
  }

  if (loadError || !settings) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="mb-2 text-lg font-semibold text-red-800">Failed to load directory</h2>
          <p className="text-sm text-red-700">{loadError || 'No directory settings found. Please check the database.'}</p>
          <Button
            type="button"
            className="mt-4"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const GRID_START_INDEX = 2
  const totalGridPages = getDirectoryPageCount(families.length)
  const pageItems = [
    { label: 'Cover', kind: 'cover' as const },
    { label: 'Opening', kind: 'title' as const },
    ...Array.from({ length: totalGridPages }, (_, i) => ({ label: `Grid ${i + 1}`, kind: 'grid' as const })),
    { label: 'Leadership', kind: 'leadership' as const },
    { label: 'Back', kind: 'back' as const },
  ]

  const selectedPage = pageItems[selectedPageIndex] ?? pageItems[0]
  const selectedGridPageIndex = Math.max(0, selectedPageIndex - GRID_START_INDEX)
  const currentPreviewZoom = zoomMode === 'fit' ? autoFitScale : manualZoom

  function adjustManualZoom(delta: number) {
    setZoomMode('manual')
    setManualZoom((value) => {
      const nextValue = value + delta
      return Math.min(2, Math.max(0.25, Number(nextValue.toFixed(2))))
    })
  }

  return (
    <div className="directory-builder">
      <aside className="builder-sidebar">
        <div className="builder-sidebar-title">Pages</div>
        <div className="space-y-2">
          {pageItems.map((item, idx) => (
            <button
              key={`${item.label}-${idx}`}
              type="button"
              className={`builder-thumbnail ${selectedPageIndex === idx ? 'is-active' : ''}`}
              onClick={() => setSelectedPageIndex(idx)}
            >
              <span className="builder-thumbnail-index">{idx + 1}</span>
              <span className="builder-thumbnail-label">{item.label}</span>
            </button>
          ))}
        </div>
      </aside>

      <main className="builder-canvas">
        <div className="builder-toolbar flex flex-wrap gap-2">
          <div className="min-w-0 flex-1 text-sm font-semibold text-slate-700">{selectedPage.label} Page</div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={
                  zoomMode === 'fit'
                    ? 'border-[#7A9C49] bg-[#F4F4EC] text-[#1A1919] hover:bg-[#ECEBD9]'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }
                onClick={() => setZoomMode('fit')}
              >
                Fit
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-slate-200 px-2 text-slate-700 hover:bg-slate-50"
                onClick={() => adjustManualZoom(-0.1)}
              >
                -
              </Button>
              <button
                type="button"
                className="min-w-[3.75rem] rounded-md px-2 py-1 text-sm font-medium tabular-nums text-slate-700 hover:bg-slate-100"
                onClick={() => {
                  setZoomMode('manual')
                  setManualZoom(1)
                }}
              >
                {Math.round(currentPreviewZoom * 100)}%
              </button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-slate-200 px-2 text-slate-700 hover:bg-slate-50"
                onClick={() => adjustManualZoom(0.1)}
              >
                +
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-[#7A9C49] text-[#1A1919] hover:bg-[#F4F4EC]"
              onClick={() => void handleExportWebPdf()}
              disabled={exporting !== null}
            >
              {exporting === 'web' ? 'Exporting…' : 'Export Web PDF'}
            </Button>
            <Button
              type="button"
              className="bg-[#7A9C49] hover:bg-[#6B8A3D]"
              onClick={() => void handleExportBookPdf()}
              disabled={exporting !== null}
            >
              {exporting === 'book' ? 'Exporting…' : 'Export Book PDF'}
            </Button>
          </div>
        </div>

        <div ref={stageRef} className="builder-canvas-stage">
          <div ref={frameRef} className="builder-canvas-frame">
            {selectedPage.kind === 'cover' && <CoverPage settings={settings} />}
            {selectedPage.kind === 'title' && <TitlePage settings={settings} onSettingsSaved={handleSettingsSaved} />}
            {selectedPage.kind === 'grid' && (
              <DirectoryGrid
                families={families}
                onlyPageIndex={selectedGridPageIndex}
                placeholderUrl={settings?.family_placeholder_url ?? settings?.logo_url ?? null}
              />
            )}
            {selectedPage.kind === 'leadership' && <LeadershipPage settings={settings} />}
            {selectedPage.kind === 'back' && <BackPage settings={settings} />}
          </div>
        </div>
      </main>

      <PropertiesPanel
        pageType={selectedPage.kind}
        settings={settings}
        onSettingsSaved={handleSettingsSaved}
        onPreviewChange={handleSettingsPreview}
      />

      <div ref={exportCanvasRef} className="directory-export-hidden" aria-hidden="true">
        <CoverPage settings={settings} />
        <TitlePage settings={settings} />
        <DirectoryGrid families={families} placeholderUrl={settings?.family_placeholder_url ?? settings?.logo_url ?? null} />
        <LeadershipPage settings={settings} />
        <BackPage settings={settings} />
      </div>
    </div>
  )
}

