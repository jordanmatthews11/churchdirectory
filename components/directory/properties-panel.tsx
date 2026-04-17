'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ImagePlus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { DirectorySettings } from '@/types'
import { deleteDirectoryAsset, uploadDirectoryAsset } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { BackPageEditor } from '@/components/directory/back-page-editor'
import { CollapsibleSection } from '@/components/directory/collapsible-section'
import {
  DEFAULT_INTRO_ALIGN,
  DEFAULT_INTRO_FONT_SIZE,
  DEFAULT_INTRO_LINE_HEIGHT,
  DEFAULT_INTRO_PARAGRAPH_SPACING,
  DEFAULT_TITLE_IMAGE_GAP,
  DEFAULT_TITLE_IMAGE_OFFSET_Y,
  DEFAULT_TITLE_IMAGE_SCALE,
  DEFAULT_TITLE_LOGO_GAP,
  patchTitlePageLayout,
  resolveTitlePageLayout,
  type TitlePageLayoutPatch,
} from '@/lib/title-page-layout'

const UPLOAD_MAX_BYTES = 4 * 1024 * 1024 // 4 MB (Vercel body limit)

function compressImage(file: File, maxBytes: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)

      let quality = 0.92
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Compression failed'))
            if (blob.size <= maxBytes || quality <= 0.5) {
              resolve(new File([blob], file.name.replace(/\.png$/i, '.jpg'), { type: 'image/jpeg' }))
            } else {
              quality -= 0.1
              tryCompress()
            }
          },
          'image/jpeg',
          quality,
        )
      }
      tryCompress()
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

type PageType = 'cover' | 'title' | 'grid' | 'leadership' | 'back'

interface PropertiesPanelProps {
  pageType: PageType
  settings: DirectorySettings
  onSettingsSaved: (values: Partial<DirectorySettings>) => Promise<void>
  onPreviewChange?: (values: Partial<DirectorySettings>) => void
  onOpenTitlePhotoEditor?: () => void
}

export function PropertiesPanel({
  pageType,
  settings,
  onSettingsSaved,
  onPreviewChange,
  onOpenTitlePhotoEditor,
}: PropertiesPanelProps) {
  const resolvedLayout = resolveTitlePageLayout(settings.title_page_layout)
  const [form, setForm] = useState({
    intro_text: settings.intro_text,
    date_label: settings.date_label,
    logo_scale: settings.logo_scale ?? 100,
    logo_offset_y: settings.logo_offset_y ?? 0,
    logo_crop_top: settings.logo_crop_top ?? 0,
    logo_crop_bottom: settings.logo_crop_bottom ?? 0,
    logo_crop_left: settings.logo_crop_left ?? 0,
    logo_crop_right: settings.logo_crop_right ?? 0,
    title_page_layout: resolvedLayout,
  })
  const [saving, setSaving] = useState(false)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)

  useEffect(() => {
    const nextLayout = resolveTitlePageLayout(settings.title_page_layout)
    setForm({
      intro_text: settings.intro_text,
      date_label: settings.date_label,
      logo_scale: settings.logo_scale ?? 100,
      logo_offset_y: settings.logo_offset_y ?? 0,
      logo_crop_top: settings.logo_crop_top ?? 0,
      logo_crop_bottom: settings.logo_crop_bottom ?? 0,
      logo_crop_left: settings.logo_crop_left ?? 0,
      logo_crop_right: settings.logo_crop_right ?? 0,
      title_page_layout: nextLayout,
    })
  }, [settings])

  async function handleSave() {
    setSaving(true)
    try {
      await onSettingsSaved(form)
      toast.success('Template updated')
    } catch {
      toast.error('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  async function handleImageUpload(
    file: File | undefined,
    kind: 'cover' | 'title' | 'logo',
    field: 'cover_image_url' | 'title_image_url' | 'logo_url'
  ) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Please upload a JPEG or PNG image')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Image must be under 20 MB')
      return
    }

    setUploadingKey(field)
    try {
      let uploadFile = file
      if (file.size > UPLOAD_MAX_BYTES) {
        toast.info('Compressing image for upload...')
        uploadFile = await compressImage(file, UPLOAD_MAX_BYTES)
      }
      const url = await uploadDirectoryAsset(uploadFile, kind)
      await onSettingsSaved({ [field]: url })
      toast.success('Image updated')
    } catch {
      toast.error('Failed to upload image')
    } finally {
      setUploadingKey(null)
    }
  }

  async function handleRemove(url: string | null, field: 'cover_image_url' | 'title_image_url' | 'logo_url') {
    if (!url) return
    setUploadingKey(field)
    try {
      await deleteDirectoryAsset(url)
      await onSettingsSaved({ [field]: null })
      toast.success('Image removed')
    } catch {
      toast.error('Failed to remove image')
    } finally {
      setUploadingKey(null)
    }
  }

  function updateLayout(patch: TitlePageLayoutPatch) {
    const nextLayout = patchTitlePageLayout(form.title_page_layout, patch)
    setForm((prev) => ({
      ...prev,
      title_page_layout: resolveTitlePageLayout(nextLayout),
    }))
    onPreviewChange?.({ title_page_layout: nextLayout })
  }

  function updateTopLevel<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    onPreviewChange?.({ [key]: value } as Partial<DirectorySettings>)
  }

  return (
    <aside className="builder-properties">
      {pageType === 'cover' && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Cover Art</h3>
          <p className="text-sm text-slate-600">
            Upload your full cover design. It should match the booklet cover style and layout.
          </p>
          <p className="text-[11px] text-slate-500">
            Recommended size: 8.5 x 11 in (2550 x 3300 px at 300 dpi)
          </p>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">Cover Image</label>
            <div className="flex gap-2">
              <label className="inline-flex">
                <input
                  className="hidden"
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) => void handleImageUpload(e.target.files?.[0], 'cover', 'cover_image_url')}
                />
                <Button asChild variant="outline" size="sm" disabled={uploadingKey === 'cover_image_url'}>
                  <span><ImagePlus className="mr-2 h-4 w-4" />{uploadingKey === 'cover_image_url' ? 'Uploading...' : 'Upload'}</span>
                </Button>
              </label>
              {settings.cover_image_url && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleRemove(settings.cover_image_url, 'cover_image_url')}
                  disabled={uploadingKey === 'cover_image_url'}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {pageType === 'title' && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Opening Page</h3>
          <CollapsibleSection
            title="Header Image"
            description="Upload or replace the logo/header art at the top of the Opening page."
            defaultOpen
          >
            <div className="space-y-2">
              <p className="text-[11px] text-slate-500">Recommended size: approx. 470 x 300 px</p>
              <div className="flex gap-2">
                <label className="inline-flex">
                  <input
                    className="hidden"
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={(e) => void handleImageUpload(e.target.files?.[0], 'logo', 'logo_url')}
                  />
                  <Button asChild variant="outline" size="sm" disabled={uploadingKey === 'logo_url'}>
                    <span><ImagePlus className="mr-2 h-4 w-4" />{uploadingKey === 'logo_url' ? 'Uploading...' : 'Upload'}</span>
                  </Button>
                </label>
                {settings.logo_url && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleRemove(settings.logo_url, 'logo_url')}
                    disabled={uploadingKey === 'logo_url'}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Remove
                  </Button>
                )}
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Logo Framing"
            description="Resize or move the top logo image without changing the rest of the layout."
            defaultOpen
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600">Logo Size</label>
                  <span className="text-xs text-slate-500">{form.logo_scale}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={150}
                  step={5}
                  value={form.logo_scale}
                  onChange={(e) => updateTopLevel('logo_scale', Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#7A9C49]"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600">Logo Position</label>
                  <span className="text-xs text-slate-500">{form.logo_offset_y}px</span>
                </div>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  step={5}
                  value={form.logo_offset_y}
                  onChange={(e) => updateTopLevel('logo_offset_y', Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#7A9C49]"
                />
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Logo Crop"
            description="Collapse this section when you do not need to trim the logo edges."
          >
            <div className="space-y-4">
              {([
                ['logo_crop_top', 'Crop Top'],
                ['logo_crop_bottom', 'Crop Bottom'],
                ['logo_crop_left', 'Crop Left'],
                ['logo_crop_right', 'Crop Right'],
              ] as const).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-600">{label}</label>
                    <span className="text-xs text-slate-500">{form[key]}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    step={5}
                    value={form[key]}
                    onChange={(e) => updateTopLevel(key, Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#7A9C49]"
                  />
                </div>
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Intro Text"
            description="Edit the text and adjust typography, spacing, and color without changing current defaults."
            defaultOpen
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600">Intro Text</label>
                <Textarea
                  value={form.intro_text}
                  rows={10}
                  onChange={(e) => updateTopLevel('intro_text', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-600">Font Size</label>
                    <span className="text-[11px] text-slate-500">{form.title_page_layout.intro.font_size}px</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={24}
                    step={1}
                    value={form.title_page_layout.intro.font_size}
                    onChange={(e) =>
                      updateLayout({ intro: { font_size: Number(e.target.value) } })
                    }
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#7A9C49]"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-600">Line Height</label>
                    <span className="text-[11px] text-slate-500">
                      {form.title_page_layout.intro.line_height.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={2}
                    step={0.05}
                    value={form.title_page_layout.intro.line_height}
                    onChange={(e) =>
                      updateLayout({ intro: { line_height: Number(e.target.value) } })
                    }
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#7A9C49]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600">Alignment</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(['left', 'center', 'right', 'justify'] as const).map((align) => (
                    <Button
                      key={align}
                      type="button"
                      variant={form.title_page_layout.intro.align === align ? 'default' : 'outline'}
                      className={form.title_page_layout.intro.align === align ? 'bg-[#7A9C49] hover:bg-[#6B8A3D]' : ''}
                      onClick={() => updateLayout({ intro: { align } })}
                    >
                      {align}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={form.title_page_layout.intro.bold ? 'default' : 'outline'}
                  className={form.title_page_layout.intro.bold ? 'bg-[#7A9C49] hover:bg-[#6B8A3D]' : ''}
                  onClick={() =>
                    updateLayout({ intro: { bold: !form.title_page_layout.intro.bold } })
                  }
                >
                  Bold
                </Button>
                <Button
                  type="button"
                  variant={form.title_page_layout.intro.italic ? 'default' : 'outline'}
                  className={form.title_page_layout.intro.italic ? 'bg-[#7A9C49] hover:bg-[#6B8A3D]' : ''}
                  onClick={() =>
                    updateLayout({ intro: { italic: !form.title_page_layout.intro.italic } })
                  }
                >
                  Italic
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600">Text Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.title_page_layout.intro.color || '#111827'}
                    onChange={(e) => updateLayout({ intro: { color: e.target.value } })}
                    className="h-9 w-12 rounded border border-slate-200 bg-white p-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateLayout({ intro: { color: '' } })}
                  >
                    Reset color
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-600">Top Margin</label>
                    <span className="text-[11px] text-slate-500">{form.title_page_layout.intro.margin_top}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={80}
                    step={2}
                    value={form.title_page_layout.intro.margin_top}
                    onChange={(e) =>
                      updateLayout({ intro: { margin_top: Number(e.target.value) } })
                    }
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#7A9C49]"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-600">Bottom Margin</label>
                    <span className="text-[11px] text-slate-500">
                      {form.title_page_layout.intro.margin_bottom}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={80}
                    step={2}
                    value={form.title_page_layout.intro.margin_bottom}
                    onChange={(e) =>
                      updateLayout({ intro: { margin_bottom: Number(e.target.value) } })
                    }
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#7A9C49]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600">Paragraph Spacing</label>
                  <span className="text-[11px] text-slate-500">
                    {form.title_page_layout.intro.paragraph_spacing}px
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={32}
                  step={1}
                  value={form.title_page_layout.intro.paragraph_spacing}
                  onChange={(e) =>
                    updateLayout({ intro: { paragraph_spacing: Number(e.target.value) } })
                  }
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#7A9C49]"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  updateLayout({
                    intro: {
                      font_size: DEFAULT_INTRO_FONT_SIZE,
                      line_height: DEFAULT_INTRO_LINE_HEIGHT,
                      align: DEFAULT_INTRO_ALIGN,
                      color: '',
                      bold: false,
                      italic: false,
                      margin_top: DEFAULT_TITLE_LOGO_GAP,
                      margin_bottom: 0,
                      paragraph_spacing: DEFAULT_INTRO_PARAGRAPH_SPACING,
                    },
                  })
                }
              >
                Reset intro formatting
              </Button>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Title Image"
            description="Upload the Opening page photo, adjust framing, or move/scale the whole image box."
            defaultOpen
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500">
                  Recommended size: approx. 470 x 340 px (~1.38:1 ratio)
                </p>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex">
                    <input
                      className="hidden"
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={(e) => void handleImageUpload(e.target.files?.[0], 'title', 'title_image_url')}
                    />
                    <Button asChild variant="outline" size="sm" disabled={uploadingKey === 'title_image_url'}>
                      <span><ImagePlus className="mr-2 h-4 w-4" />{uploadingKey === 'title_image_url' ? 'Uploading...' : 'Upload'}</span>
                    </Button>
                  </label>
                  {settings.title_image_url ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onOpenTitlePhotoEditor}
                      >
                        Adjust photo from preview
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void handleRemove(settings.title_image_url, 'title_image_url')}
                        disabled={uploadingKey === 'title_image_url'}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Remove
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-600">Box Scale</label>
                    <span className="text-[11px] text-slate-500">{form.title_page_layout.title_image.scale}%</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={150}
                    step={5}
                    value={form.title_page_layout.title_image.scale}
                    onChange={(e) =>
                      updateLayout({ title_image: { scale: Number(e.target.value) } })
                    }
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#7A9C49]"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-600">Box Position</label>
                    <span className="text-[11px] text-slate-500">
                      {form.title_page_layout.title_image.offset_y}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-240}
                    max={240}
                    step={2}
                    value={form.title_page_layout.title_image.offset_y}
                    onChange={(e) =>
                      updateLayout({ title_image: { offset_y: Number(e.target.value) } })
                    }
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#7A9C49]"
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  updateLayout({
                    title_image: {
                      scale: DEFAULT_TITLE_IMAGE_SCALE,
                      offset_y: DEFAULT_TITLE_IMAGE_OFFSET_Y,
                    },
                  })
                }
              >
                Reset image box
              </Button>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Date"
            description="Control the publication line shown below the Opening page photo."
            defaultOpen
          >
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Date Label</label>
              <Input value={form.date_label} onChange={(e) => updateTopLevel('date_label', e.target.value)} />
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Spacing"
            description="Fine-tune the gaps between the logo, intro text, image, and date."
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600">Gap Below Logo</label>
                  <span className="text-[11px] text-slate-500">{form.title_page_layout.spacing.below_logo}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={2}
                  value={form.title_page_layout.spacing.below_logo}
                  onChange={(e) =>
                    updateLayout({ spacing: { below_logo: Number(e.target.value) } })
                  }
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#7A9C49]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600">Space Above Image</label>
                  <span className="text-[11px] text-slate-500">{form.title_page_layout.spacing.below_intro}px</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Slide right to pull the image up toward the intro text.
                </p>
                <input
                  type="range"
                  min={0}
                  max={500}
                  step={2}
                  value={form.title_page_layout.spacing.below_intro}
                  onChange={(e) =>
                    updateLayout({ spacing: { below_intro: Number(e.target.value) } })
                  }
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#7A9C49]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600">Gap Below Image</label>
                  <span className="text-[11px] text-slate-500">{form.title_page_layout.spacing.below_image}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={2}
                  value={form.title_page_layout.spacing.below_image}
                  onChange={(e) =>
                    updateLayout({ spacing: { below_image: Number(e.target.value) } })
                  }
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#7A9C49]"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  updateLayout({
                    spacing: {
                      below_logo: DEFAULT_TITLE_LOGO_GAP,
                      below_intro: 0,
                      below_image: DEFAULT_TITLE_IMAGE_GAP,
                    },
                  })
                }
              >
                Reset spacing
              </Button>
            </div>
          </CollapsibleSection>

          <Button type="button" className="w-full bg-[#7A9C49] hover:bg-[#6B8A3D]" onClick={() => void handleSave()} disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : 'Save Opening Settings'}
          </Button>
        </div>
      )}

      {pageType === 'grid' && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Grid Page</h3>
          <p className="text-sm text-slate-600">
            Family cells are generated from your family records. Edit names, photos, and members on the Families page.
          </p>
        </div>
      )}

      {pageType === 'leadership' && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Leadership &amp; Staff</h3>
          <p className="text-sm text-slate-600">
            Edit elders, deacons, deaconesses, and staff on the Leadership page for a full-width editor with more room.
          </p>
          <Button asChild className="w-full bg-[#7A9C49] hover:bg-[#6B8A3D]">
            <Link href="/leadership">Open Leadership editor</Link>
          </Button>
        </div>
      )}

      {pageType === 'back' && (
        <BackPageEditor
          initialHtml={settings.back_page_html}
          onSettingsSaved={onSettingsSaved}
          onPreviewChange={onPreviewChange}
        />
      )}
    </aside>
  )
}
