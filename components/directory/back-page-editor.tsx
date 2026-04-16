'use client'

import { useEffect, useMemo, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { FontSize, TextStyle } from '@tiptap/extension-text-style'
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Italic, List, ListOrdered, Save, Underline as UnderlineIcon } from 'lucide-react'
import { toast } from 'sonner'

import { DirectorySettings } from '@/types'
import { Button } from '@/components/ui/button'

const EMPTY_BACK_PAGE_HTML = '<p></p>'

interface BackPageEditorProps {
  initialHtml: string | null
  onSettingsSaved: (values: Partial<DirectorySettings>) => Promise<void>
  onPreviewChange?: (values: Partial<DirectorySettings>) => void
}

export function BackPageEditor({ initialHtml, onSettingsSaved, onPreviewChange }: BackPageEditorProps) {
  const [saving, setSaving] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontSize,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: initialHtml && initialHtml.trim() ? initialHtml : EMPTY_BACK_PAGE_HTML,
    editorProps: {
      attributes: {
        class:
          'back-page-editor min-h-[620px] rounded-lg border border-slate-200 bg-white p-5 text-slate-800 focus:outline-none',
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      onPreviewChange?.({ back_page_html: nextEditor.getHTML() })
    },
  })

  useEffect(() => {
    if (!editor) return
    const nextHtml = initialHtml && initialHtml.trim() ? initialHtml : EMPTY_BACK_PAGE_HTML
    if (nextHtml !== editor.getHTML()) {
      editor.commands.setContent(nextHtml)
    }
  }, [editor, initialHtml])

  const currentFontSize = useMemo(() => {
    if (!editor) return '16px'
    const size = editor.getAttributes('textStyle').fontSize as string | undefined
    return size || '16px'
  }, [editor, editor?.state.selection])

  async function handleSave() {
    if (!editor) return
    setSaving(true)
    try {
      const html = editor.getHTML()
      await onSettingsSaved({ back_page_html: html })
      toast.success('Back page updated')
    } catch {
      toast.error('Failed to save back page')
    } finally {
      setSaving(false)
    }
  }

  if (!editor) {
    return <p className="text-sm text-slate-500">Loading editor...</p>
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">Back Page</h3>
      <p className="text-sm text-slate-600">
        Add custom text for the final page. Formatting is preserved in PDF export.
      </p>

      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={editor.isActive('bold') ? 'bg-[#E8F0DA] text-[#46612C]' : ''}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={editor.isActive('italic') ? 'bg-[#E8F0DA] text-[#46612C]' : ''}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={editor.isActive('underline') ? 'bg-[#E8F0DA] text-[#46612C]' : ''}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>

        <select
          value={currentFontSize}
          onChange={(e) => {
            const value = e.target.value
            if (value === '16px') {
              editor.chain().focus().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run()
              return
            }
            editor.chain().focus().setMark('textStyle', { fontSize: value }).run()
          }}
          className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700"
        >
          <option value="14px">Small</option>
          <option value="16px">Normal</option>
          <option value="20px">Large</option>
          <option value="24px">Extra Large</option>
        </select>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={editor.isActive({ textAlign: 'left' }) ? 'bg-[#E8F0DA] text-[#46612C]' : ''}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={editor.isActive({ textAlign: 'center' }) ? 'bg-[#E8F0DA] text-[#46612C]' : ''}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={editor.isActive({ textAlign: 'right' }) ? 'bg-[#E8F0DA] text-[#46612C]' : ''}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={editor.isActive({ textAlign: 'justify' }) ? 'bg-[#E8F0DA] text-[#46612C]' : ''}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        >
          <AlignJustify className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={editor.isActive('bulletList') ? 'bg-[#E8F0DA] text-[#46612C]' : ''}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={editor.isActive('orderedList') ? 'bg-[#E8F0DA] text-[#46612C]' : ''}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>

      <EditorContent editor={editor} />

      <Button type="button" className="w-full bg-[#7A9C49] hover:bg-[#6B8A3D]" onClick={() => void handleSave()} disabled={saving}>
        <Save className="mr-2 h-4 w-4" />
        {saving ? 'Saving...' : 'Save Back Page'}
      </Button>
    </div>
  )
}

