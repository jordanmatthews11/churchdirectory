'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { toast } from 'sonner'

import { DirectorySettings } from '@/types'
import { Button } from '@/components/ui/button'
import { RichTextEditor } from '@/components/directory/rich-text-editor'

const EMPTY_OPENING_PAGE_HTML = '<p></p>'
const DEFAULT_PAGE_MARGIN = 0.65
const MIN_PAGE_MARGIN = 0
const MAX_PAGE_MARGIN = 1.5
const PAGE_MARGIN_STEP = 0.05

interface OpeningPageEditorProps {
  initialHtml: string | null
  initialMarginTop?: number | null
  initialMarginBottom?: number | null
  onSettingsSaved: (values: Partial<DirectorySettings>) => Promise<void>
  onPreviewChange?: (values: Partial<DirectorySettings>) => void
}

function normalizeMargin(value: number | string | null | undefined) {
  const parsedValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(parsedValue) ? parsedValue : DEFAULT_PAGE_MARGIN
}

function formatMargin(value: number) {
  return `${value.toFixed(2)} in`
}

export function OpeningPageEditor({
  initialHtml,
  initialMarginTop,
  initialMarginBottom,
  onSettingsSaved,
  onPreviewChange,
}: OpeningPageEditorProps) {
  const [saving, setSaving] = useState(false)
  const [draftHtml, setDraftHtml] = useState(
    initialHtml && initialHtml.trim() ? initialHtml : EMPTY_OPENING_PAGE_HTML
  )
  const [marginTop, setMarginTop] = useState(normalizeMargin(initialMarginTop))
  const [marginBottom, setMarginBottom] = useState(normalizeMargin(initialMarginBottom))

  useEffect(() => {
    setDraftHtml(initialHtml && initialHtml.trim() ? initialHtml : EMPTY_OPENING_PAGE_HTML)
  }, [initialHtml])

  useEffect(() => {
    setMarginTop(normalizeMargin(initialMarginTop))
  }, [initialMarginTop])

  useEffect(() => {
    setMarginBottom(normalizeMargin(initialMarginBottom))
  }, [initialMarginBottom])

  function previewChange(values: Partial<DirectorySettings>) {
    onPreviewChange?.(values)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSettingsSaved({
        opening_page_html: draftHtml,
        opening_page_margin_top: marginTop,
        opening_page_margin_bottom: marginBottom,
      })
      toast.success('Opening page updated')
    } catch {
      toast.error('Failed to save opening page')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">Opening Page</h3>
      <p className="text-sm text-slate-600">
        Arrange logo, text, photos, and dates freely. Formatting and image sizing are preserved in PDF export.
      </p>
      <RichTextEditor
        initialHtml={draftHtml}
        minHeight={620}
        supportImages
        onChange={(html) => {
          setDraftHtml(html)
          previewChange({ opening_page_html: html })
        }}
      />

      <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Page Margins</h4>
          <p className="text-xs text-slate-600">Reduce or increase the top and bottom printable margins for the Opening page.</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-600">Top Margin</label>
            <span className="text-[11px] text-slate-500">{formatMargin(marginTop)}</span>
          </div>
          <input
            type="range"
            min={MIN_PAGE_MARGIN}
            max={MAX_PAGE_MARGIN}
            step={PAGE_MARGIN_STEP}
            value={marginTop}
            onChange={(e) => {
              const value = Number(e.target.value)
              setMarginTop(value)
              previewChange({ opening_page_margin_top: value })
            }}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#7A9C49]"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-600">Bottom Margin</label>
            <span className="text-[11px] text-slate-500">{formatMargin(marginBottom)}</span>
          </div>
          <input
            type="range"
            min={MIN_PAGE_MARGIN}
            max={MAX_PAGE_MARGIN}
            step={PAGE_MARGIN_STEP}
            value={marginBottom}
            onChange={(e) => {
              const value = Number(e.target.value)
              setMarginBottom(value)
              previewChange({ opening_page_margin_bottom: value })
            }}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#7A9C49]"
          />
        </div>

        <p className="text-xs text-slate-500">
          Note: the Book PDF adds whitespace at the bottom of each panel because the booklet uses a half-letter page shape.
        </p>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setMarginTop(DEFAULT_PAGE_MARGIN)
            setMarginBottom(DEFAULT_PAGE_MARGIN)
            previewChange({
              opening_page_margin_top: DEFAULT_PAGE_MARGIN,
              opening_page_margin_bottom: DEFAULT_PAGE_MARGIN,
            })
          }}
        >
          Reset margins
        </Button>
      </div>

      <Button
        type="button"
        className="w-full bg-[#7A9C49] hover:bg-[#6B8A3D]"
        onClick={() => void handleSave()}
        disabled={saving}
      >
        <Save className="mr-2 h-4 w-4" />
        {saving ? 'Saving...' : 'Save Opening Page'}
      </Button>
    </div>
  )
}
