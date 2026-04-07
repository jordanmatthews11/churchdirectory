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
}

export function PropertiesPanel({ pageType, settings, onSettingsSaved }: PropertiesPanelProps) {
  const [form, setForm] = useState({
    intro_text: settings.intro_text,
    date_label: settings.date_label,
  })
  const [saving, setSaving] = useState(false)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)

  useEffect(() => {
    setForm({
      intro_text: settings.intro_text,
      date_label: settings.date_label,
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
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">Header Image</label>
            <p className="text-[11px] text-slate-500">
              Recommended size: approx. 470 x 300 px
            </p>
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

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">Date Label</label>
            <Input value={form.date_label} onChange={(e) => setForm((p) => ({ ...p, date_label: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">Intro Text</label>
            <Textarea value={form.intro_text} rows={10} onChange={(e) => setForm((p) => ({ ...p, intro_text: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">Title Image</label>
            <p className="text-[11px] text-slate-500">
              Recommended size: approx. 470 x 340 px (~1.38:1 ratio)
            </p>
            <div className="flex gap-2">
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
              {settings.title_image_url && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleRemove(settings.title_image_url, 'title_image_url')}
                  disabled={uploadingKey === 'title_image_url'}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Remove
                </Button>
              )}
            </div>
          </div>
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
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Back Page</h3>
          <p className="text-sm text-slate-600">Blank back page -- no settings needed</p>
        </div>
      )}
    </aside>
  )
}
