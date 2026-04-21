'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { toast } from 'sonner'

import { DirectorySettings } from '@/types'
import { Button } from '@/components/ui/button'
import { RichTextEditor } from '@/components/directory/rich-text-editor'

const EMPTY_OPENING_PAGE_HTML = '<p></p>'

interface OpeningPageEditorProps {
  initialHtml: string | null
  onSettingsSaved: (values: Partial<DirectorySettings>) => Promise<void>
  onPreviewChange?: (values: Partial<DirectorySettings>) => void
}

export function OpeningPageEditor({
  initialHtml,
  onSettingsSaved,
  onPreviewChange,
}: OpeningPageEditorProps) {
  const [saving, setSaving] = useState(false)
  const [draftHtml, setDraftHtml] = useState(
    initialHtml && initialHtml.trim() ? initialHtml : EMPTY_OPENING_PAGE_HTML
  )

  useEffect(() => {
    setDraftHtml(initialHtml && initialHtml.trim() ? initialHtml : EMPTY_OPENING_PAGE_HTML)
  }, [initialHtml])

  async function handleSave() {
    setSaving(true)
    try {
      await onSettingsSaved({ opening_page_html: draftHtml })
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
          onPreviewChange?.({ opening_page_html: html })
        }}
      />

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
