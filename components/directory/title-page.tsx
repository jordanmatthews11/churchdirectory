'use client'

import { useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { Upload, Trash2, Save } from 'lucide-react'
import { toast } from 'sonner'

import { DirectorySettings } from '@/types'
import { deleteDirectoryAsset, uploadDirectoryAsset } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export interface TitlePageProps {
  settings: DirectorySettings
  onTitleImageSaved: (url: string | null) => Promise<void>
  onTextSaved: (values: Pick<DirectorySettings, 'intro_text' | 'date_label'>) => Promise<void>
}

function splitIntoParagraphs(text: string) {
  // Keep author formatting: blank lines become paragraphs.
  return text
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter(Boolean)
}

export function TitlePage({ settings, onTitleImageSaved, onTextSaved }: TitlePageProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const [introText, setIntroText] = useState(settings.intro_text)
  const [dateLabel, setDateLabel] = useState(settings.date_label)
  const [savingText, setSavingText] = useState(false)

  const paragraphs = useMemo(() => splitIntoParagraphs(introText), [introText])

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    const isJpegOrPng = file.type === 'image/jpeg' || file.type === 'image/png'
    if (!isJpegOrPng) {
      toast.error('Please upload a JPEG or PNG image')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB')
      return
    }

    setUploading(true)
    try {
      const url = await uploadDirectoryAsset(file, 'title')
      await onTitleImageSaved(url)
      toast.success('Title image updated')
    } catch {
      toast.error('Failed to upload title image')
    } finally {
      setUploading(false)
    }
  }

  async function handleRemoveImage() {
    if (!settings.title_image_url) return
    setUploading(true)
    try {
      await deleteDirectoryAsset(settings.title_image_url)
      await onTitleImageSaved(null)
      toast.success('Title image removed')
    } catch {
      toast.error('Failed to remove title image')
    } finally {
      setUploading(false)
    }
  }

  async function handleSaveText() {
    if (!introText.trim()) {
      toast.error('Intro text cannot be empty')
      return
    }
    setSavingText(true)
    try {
      await onTextSaved({ intro_text: introText, date_label: dateLabel })
      toast.success('Text updated')
    } catch {
      toast.error('Failed to save text')
    } finally {
      setSavingText(false)
    }
  }

  return (
    <section className="directory-page directory-title-page relative overflow-hidden bg-white break-after-page">
      <div className="relative z-10 flex h-full flex-col justify-between p-10">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative h-10 w-10">
                  <div className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 bg-green-800" />
                  <div className="absolute left-1/2 top-1/2 h-1 w-full -translate-x-1/2 -translate-y-1/2 bg-green-800" />
                  <div className="absolute left-1/2 top-0 h-10 w-10 -translate-x-1/2 rounded-md border-2 border-green-800/30" />
                </div>
              </div>
            </div>
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-800">
              Christ Community Church
            </div>
          </div>

          <div className="text-left">
            <div className="text-5xl font-extrabold leading-[1] text-green-800">Church</div>
            <div className="text-5xl font-extrabold leading-[1] text-green-800">Directory</div>
          </div>
        </div>

        {/* Title image / edit zone */}
        <div className="relative mt-6 flex flex-1 items-center justify-center">
          {settings.title_image_url ? (
            <div className="relative h-48 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <Image
                src={settings.title_image_url}
                alt="Title"
                fill
                className="object-cover"
                sizes="800px"
              />
              <div className="print-hidden absolute inset-0 flex items-end justify-end p-4">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-white"
                    disabled={uploading}
                    onClick={() => inputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploading ? 'Uploading...' : 'Change'}
                  </Button>
                  <button
                    type="button"
                    className="flex items-center gap-2 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                    onClick={handleRemoveImage}
                    disabled={uploading}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-48 w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
              <div className="flex flex-col items-center gap-3 px-6 text-center">
                <Upload className="h-8 w-8 text-slate-600" />
                <div className="text-sm font-medium text-slate-800">Upload title image (JPEG/PNG)</div>
                <Button
                  type="button"
                  variant="outline"
                  className="bg-white"
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Select JPEG/PNG'}
                </Button>
              </div>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFile(file)
              if (inputRef.current) inputRef.current.value = ''
            }}
          />
        </div>

        {/* Date label */}
        <div className="print-hidden mt-4 flex items-end justify-between gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Date label
            </label>
            <Input value={dateLabel} onChange={(e) => setDateLabel(e.target.value)} />
          </div>
          <div>
            <Button type="button" className="bg-blue-700 hover:bg-blue-800" onClick={handleSaveText} disabled={savingText}>
              <Save className="mr-2 h-4 w-4" />
              {savingText ? 'Saving...' : 'Save Text'}
            </Button>
          </div>
        </div>

        <div className="mt-2 hidden print:block text-right text-sm font-semibold text-slate-800">
          {dateLabel || ' '}
        </div>

        {/* Intro text */}
        <div className="print-hidden mt-4">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
            Directory Intro Text
          </label>
          <Textarea
            value={introText}
            onChange={(e) => setIntroText(e.target.value)}
            rows={7}
            className="bg-white"
          />
          <div className="mt-2 text-[11px] text-slate-500">
            Tip: Use blank lines to separate paragraphs. This text prints exactly as shown.
          </div>
        </div>

        <div className="hidden print:block mt-5 directory-intro">
          {paragraphs.map((p, idx) => (
            <p key={idx} className="mb-3">
              {p}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}

