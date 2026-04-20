'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { toast } from 'sonner'

import { DirectorySettings } from '@/types'
import { Button } from '@/components/ui/button'
import { RichTextEditor } from '@/components/directory/rich-text-editor'

const EMPTY_BACK_PAGE_HTML = '<p></p>'

interface BackPageEditorProps {
  initialHtml: string | null
  onSettingsSaved: (values: Partial<DirectorySettings>) => Promise<void>
  onPreviewChange?: (values: Partial<DirectorySettings>) => void
}

export function BackPageEditor({ initialHtml, onSettingsSaved, onPreviewChange }: BackPageEditorProps) {
  const [saving, setSaving] = useState(false)
  const [draftHtml, setDraftHtml] = useState(initialHtml && initialHtml.trim() ? initialHtml : EMPTY_BACK_PAGE_HTML)

  useEffect(() => {
    setDraftHtml(initialHtml && initialHtml.trim() ? initialHtml : EMPTY_BACK_PAGE_HTML)
  }, [initialHtml])

  async function handleSave() {
    setSaving(true)
    try {
      await onSettingsSaved({ back_page_html: draftHtml })
      toast.success('Back page updated')
    } catch {
      toast.error('Failed to save back page')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">Back Page</h3>
      <p className="text-sm text-slate-600">
        Add custom text for the final page. Formatting is preserved in PDF export.
      </p>
      <RichTextEditor
        initialHtml={draftHtml}
        minHeight={620}
        supportImages
        onChange={(html) => {
          setDraftHtml(html)
          onPreviewChange?.({ back_page_html: html })
        }}
      />

      <Button type="button" className="w-full bg-[#7A9C49] hover:bg-[#6B8A3D]" onClick={() => void handleSave()} disabled={saving}>
        <Save className="mr-2 h-4 w-4" />
        {saving ? 'Saving...' : 'Save Back Page'}
      </Button>
    </div>
  )
}

