'use client'

import { useEffect, useMemo } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import Color from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { FontSize, TextStyle } from '@tiptap/extension-text-style'
import StarterKit from '@tiptap/starter-kit'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  List,
  ListOrdered,
  Underline as UnderlineIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'

const DEFAULT_EMPTY_HTML = '<p></p>'
const DEFAULT_COLOR = '#111827'

interface RichTextEditorProps {
  initialHtml: string | null | undefined
  onChange?: (html: string) => void
  minHeight?: number
  emptyHtml?: string
}

function toHexSegment(value: number) {
  return value.toString(16).padStart(2, '0')
}

function normalizeColorForInput(value: string | undefined) {
  if (!value) return DEFAULT_COLOR
  const trimmed = value.trim()

  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
  }

  const rgbMatch = trimmed.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i)
  if (rgbMatch) {
    return `#${toHexSegment(Number(rgbMatch[1]))}${toHexSegment(Number(rgbMatch[2]))}${toHexSegment(Number(rgbMatch[3]))}`
  }

  return DEFAULT_COLOR
}

function getToolbarButtonClass(isActive: boolean) {
  return isActive ? 'bg-[#E8F0DA] text-[#46612C]' : ''
}

export function RichTextEditor({
  initialHtml,
  onChange,
  minHeight = 320,
  emptyHtml = DEFAULT_EMPTY_HTML,
}: RichTextEditorProps) {
  const normalizedInitialHtml = initialHtml && initialHtml.trim() ? initialHtml : emptyHtml

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontSize,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: normalizedInitialHtml,
    editorProps: {
      attributes: {
        class:
          'directory-rich-text-editor rounded-lg border border-slate-200 bg-white p-5 text-slate-800 focus:outline-none',
        style: `min-height: ${minHeight}px;`,
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      onChange?.(nextEditor.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return
    if (normalizedInitialHtml !== editor.getHTML()) {
      editor.commands.setContent(normalizedInitialHtml, { emitUpdate: false })
    }
  }, [editor, normalizedInitialHtml])

  const currentFontSize = useMemo(() => {
    if (!editor) return '16px'
    const size = editor.getAttributes('textStyle').fontSize as string | undefined
    return size || '16px'
  }, [editor, editor?.state.selection])

  const currentColor = useMemo(() => {
    if (!editor) return DEFAULT_COLOR
    return normalizeColorForInput(editor.getAttributes('textStyle').color as string | undefined)
  }, [editor, editor?.state.selection])

  if (!editor) {
    return <p className="text-sm text-slate-500">Loading editor...</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={getToolbarButtonClass(editor.isActive('bold'))}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={getToolbarButtonClass(editor.isActive('italic'))}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={getToolbarButtonClass(editor.isActive('underline'))}
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
          className={getToolbarButtonClass(editor.isActive({ textAlign: 'left' }))}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={getToolbarButtonClass(editor.isActive({ textAlign: 'center' }))}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={getToolbarButtonClass(editor.isActive({ textAlign: 'right' }))}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={getToolbarButtonClass(editor.isActive({ textAlign: 'justify' }))}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        >
          <AlignJustify className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={getToolbarButtonClass(editor.isActive('bulletList'))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={getToolbarButtonClass(editor.isActive('orderedList'))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="ml-auto flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <span>Color</span>
            <input
              type="color"
              value={currentColor}
              onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
              className="h-7 w-9 cursor-pointer rounded border border-slate-200 bg-white p-1"
              aria-label="Set text color"
            />
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
            onClick={() => editor.chain().focus().unsetColor().removeEmptyTextStyle().run()}
          >
            Reset
          </Button>
        </div>
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}
