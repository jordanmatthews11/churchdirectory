'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from '@tiptap/extension-image'
import { mergeAttributes } from '@tiptap/core'
import { NodeViewProps, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import { AlignCenter, AlignLeft, AlignRight, ImagePlus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

export const BACK_PAGE_IMAGE_NODE_NAME = 'backPageImage'
export const DEFAULT_BACK_PAGE_IMAGE_WIDTH = 50
const MIN_BACK_PAGE_IMAGE_WIDTH = 10
const MAX_BACK_PAGE_IMAGE_WIDTH = 100

type BackPageImageAlign = 'left' | 'center' | 'right'

interface UploadImageArgs {
  file: File
  position?: number
  replaceAt?: number
  preserve?: {
    width?: number
    align?: BackPageImageAlign
    alt?: string | null
  }
}

export interface BackPageImageOptions {
  uploadImage: (args: UploadImageArgs) => Promise<void>
}

function clampWidth(width: number) {
  return Math.max(MIN_BACK_PAGE_IMAGE_WIDTH, Math.min(MAX_BACK_PAGE_IMAGE_WIDTH, Math.round(width)))
}

function getImageMargin(align: BackPageImageAlign) {
  if (align === 'left') return '0 auto 0 0'
  if (align === 'right') return '0 0 0 auto'
  return '0 auto'
}

function parseWidthFromFigure(element: HTMLElement) {
  const img = element.querySelector('img')
  if (!img) return DEFAULT_BACK_PAGE_IMAGE_WIDTH

  const inlineWidth = img.style.width || img.getAttribute('width') || ''
  const match = inlineWidth.match(/(\d+(?:\.\d+)?)%/)
  if (!match) return DEFAULT_BACK_PAGE_IMAGE_WIDTH

  return clampWidth(Number(match[1]))
}

function BackPageImageView(props: NodeViewProps) {
  const { node, selected, updateAttributes, deleteNode, extension, getPos } = props
  const fileInputRef = useRef<HTMLInputElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [dragWidth, setDragWidth] = useState<number | null>(null)
  const dragWidthRef = useRef<number | null>(null)

  const width = clampWidth(
    typeof node.attrs.width === 'number' ? node.attrs.width : Number(node.attrs.width ?? DEFAULT_BACK_PAGE_IMAGE_WIDTH)
  )
  const align = (node.attrs.align ?? 'center') as BackPageImageAlign
  const src = String(node.attrs.src ?? '')
  const alt = typeof node.attrs.alt === 'string' ? node.attrs.alt : ''
  const isUploading = Boolean(node.attrs.uploading)
  const displayWidth = dragWidth ?? width

  useEffect(() => {
    if (!selected) {
      setDragWidth(null)
      dragWidthRef.current = null
    }
  }, [selected])

  const frameStyle = useMemo(
    () => ({
      width: `${displayWidth}%`,
      margin: getImageMargin(align),
    }),
    [align, displayWidth]
  )

  const imageStyle = useMemo(
    () => ({
      width: '100%',
      maxWidth: '100%',
      height: 'auto',
    }),
    []
  )

  function startResize(event: React.MouseEvent<HTMLButtonElement>, direction: 'left' | 'right') {
    event.preventDefault()
    event.stopPropagation()

    const frame = frameRef.current
    if (!frame) return

    const editorRoot = frame.closest('[contenteditable="true"]') as HTMLElement | null
    const containerWidth = editorRoot?.getBoundingClientRect().width ?? frame.getBoundingClientRect().width
    if (!containerWidth) return

    const startX = event.clientX
    const startWidth = width

    const onPointerMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const signedDelta = direction === 'left' ? -deltaX : deltaX
      const nextWidth = clampWidth(startWidth + (signedDelta / containerWidth) * 100)
      setDragWidth(nextWidth)
      dragWidthRef.current = nextWidth
    }

    const onPointerUp = () => {
      const nextWidth = dragWidthRef.current ?? startWidth
      updateAttributes({ width: clampWidth(nextWidth) })
      setDragWidth(null)
      dragWidthRef.current = null
      window.removeEventListener('mousemove', onPointerMove)
      window.removeEventListener('mouseup', onPointerUp)
    }

    window.addEventListener('mousemove', onPointerMove)
    window.addEventListener('mouseup', onPointerUp)
  }

  async function handleReplace(file: File) {
    const position = typeof getPos === 'function' ? getPos() : undefined
    if (typeof position !== 'number') return

    await (extension.options as BackPageImageOptions).uploadImage({
      file,
      replaceAt: position,
      preserve: {
        width,
        align,
        alt,
      },
    })
  }

  return (
    <NodeViewWrapper className="back-page-image-node" data-dragging={dragWidth !== null ? 'true' : undefined}>
      <figure className={`back-page-image${selected ? ' is-selected' : ''}`} data-align={align}>
        {selected ? (
          <div className="back-page-image-toolbar" contentEditable={false}>
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={align === 'left' ? 'bg-[#E8F0DA] text-[#46612C]' : ''}
                onClick={() => updateAttributes({ align: 'left' })}
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={align === 'center' ? 'bg-[#E8F0DA] text-[#46612C]' : ''}
                onClick={() => updateAttributes({ align: 'center' })}
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={align === 'right' ? 'bg-[#E8F0DA] text-[#46612C]' : ''}
                onClick={() => updateAttributes({ align: 'right' })}
              >
                <AlignRight className="h-4 w-4" />
              </Button>

              <div className="mx-1 h-5 w-px bg-slate-200" />

              {[25, 50, 75, 100].map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={width === preset ? 'bg-[#E8F0DA] text-[#46612C]' : ''}
                  onClick={() => updateAttributes({ width: preset })}
                >
                  {preset}%
                </Button>
              ))}

              <div className="mx-1 h-5 w-px bg-slate-200" />

              <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                <ImagePlus className="mr-1 h-4 w-4" />
                Replace
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => deleteNode()}>
                <Trash2 className="mr-1 h-4 w-4" />
                Remove
              </Button>
            </div>
          </div>
        ) : null}

        <div ref={frameRef} className="back-page-image-frame" contentEditable={false} style={frameStyle}>
          <img src={src} alt={alt} style={imageStyle} draggable={false} />

          {selected ? (
            <>
              <button
                type="button"
                className="back-page-image-handle back-page-image-handle-nw"
                onMouseDown={(event) => startResize(event, 'left')}
                aria-label="Resize image smaller or larger from the left"
              />
              <button
                type="button"
                className="back-page-image-handle back-page-image-handle-ne"
                onMouseDown={(event) => startResize(event, 'right')}
                aria-label="Resize image smaller or larger from the right"
              />
              <button
                type="button"
                className="back-page-image-handle back-page-image-handle-sw"
                onMouseDown={(event) => startResize(event, 'left')}
                aria-label="Resize image smaller or larger from the left"
              />
              <button
                type="button"
                className="back-page-image-handle back-page-image-handle-se"
                onMouseDown={(event) => startResize(event, 'right')}
                aria-label="Resize image smaller or larger from the right"
              />
            </>
          ) : null}

          {isUploading ? (
            <div className="back-page-image-uploading" contentEditable={false}>
              Uploading image...
            </div>
          ) : null}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) return
            void handleReplace(file)
          }}
        />
      </figure>
    </NodeViewWrapper>
  )
}

export const BackPageImage = Image.extend<BackPageImageOptions>({
  name: BACK_PAGE_IMAGE_NODE_NAME,

  addOptions() {
    return {
      ...this.parent?.(),
      inline: false,
      allowBase64: true,
      uploadImage: async () => {},
    }
  },

  inline() {
    return false
  },

  group() {
    return 'block'
  },

  draggable: false,

  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: 'center',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-align') ?? 'center',
        renderHTML: (attributes: { align?: BackPageImageAlign }) => ({
          'data-align': attributes.align ?? 'center',
        }),
      },
      width: {
        default: DEFAULT_BACK_PAGE_IMAGE_WIDTH,
        parseHTML: (element: HTMLElement) => parseWidthFromFigure(element),
        renderHTML: () => ({}),
      },
      uploading: {
        default: false,
        parseHTML: () => false,
        renderHTML: () => ({}),
      },
      uploadId: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'figure.back-page-image' }]
  },

  renderHTML({ HTMLAttributes }) {
    const { align, width, uploading: _uploading, uploadId: _uploadId, ...rest } = HTMLAttributes

    return [
      'figure',
      mergeAttributes(rest, {
        class: 'back-page-image',
        'data-align': align ?? 'center',
      }),
      [
        'img',
        {
          src: rest.src,
          alt: rest.alt ?? '',
          title: rest.title ?? null,
          style: `width:${clampWidth(Number(width ?? DEFAULT_BACK_PAGE_IMAGE_WIDTH))}%;`,
        },
      ],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(BackPageImageView)
  },
})
