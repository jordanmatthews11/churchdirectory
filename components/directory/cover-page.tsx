'use client'

import { useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { Upload, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { uploadDirectoryAsset, deleteDirectoryAsset } from '@/lib/storage'
import { Button } from '@/components/ui/button'

export interface CoverPageProps {
  coverImageUrl: string | null
  onCoverImageSaved: (url: string | null) => Promise<void>
}

export function CoverPage({ coverImageUrl, onCoverImageSaved }: CoverPageProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const hasImage = !!coverImageUrl

  const placeholderInitials = useMemo(() => {
    // Matches the booklet style: "CC" (Christ Community)
    return 'CC'
  }, [])

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
      const url = await uploadDirectoryAsset(file, 'cover')
      await onCoverImageSaved(url)
      toast.success('Cover image updated')
    } catch {
      toast.error('Failed to upload cover image')
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove() {
    if (!coverImageUrl) return
    setUploading(true)
    try {
      await deleteDirectoryAsset(coverImageUrl)
      await onCoverImageSaved(null)
      toast.success('Cover image removed')
    } catch {
      toast.error('Failed to remove cover image')
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className="directory-page directory-cover-page relative overflow-hidden bg-white break-after-page">
      {/* Background image */}
      <div className="absolute inset-0">
        {coverImageUrl ? (
          <Image src={coverImageUrl} alt="Cover" fill className="object-cover" priority />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
            <div className="flex h-24 w-24 items-center justify-center rounded-xl border-2 border-slate-200 bg-white">
              <span className="text-4xl font-extrabold text-green-800">{placeholderInitials}</span>
            </div>
          </div>
        )}
      </div>

      {/* Screen-only upload controls */}
      <div className="print-hidden absolute inset-0 flex items-center justify-center p-6">
        <div className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-white/70 p-6 text-center backdrop-blur-sm">
          <Upload className="h-8 w-8 text-slate-600" />
          <div className="text-sm font-medium text-slate-800">
            {hasImage ? 'Upload / Change Cover Image' : 'Upload Cover Image'}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="h-9 bg-white"
          >
            {uploading ? 'Uploading...' : 'Select JPEG/PNG'}
          </Button>
          {hasImage && (
            <button
              type="button"
              className="flex items-center gap-2 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
              onClick={handleRemove}
              disabled={uploading}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
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
      </div>

      {/* Cover overlay text */}
      <div className="relative z-10 flex h-full flex-col justify-between p-10">
        <div className="flex flex-col gap-2">
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
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-800">Christ Community Church</div>
          </div>
        </div>

        <div className="text-left">
          <div className="text-6xl font-extrabold leading-[1] text-green-800 drop-shadow-sm">Church</div>
          <div className="text-6xl font-extrabold leading-[1] text-green-800 drop-shadow-sm">DIRECTORY</div>
        </div>

        <div className="text-right text-xs font-semibold uppercase tracking-widest text-slate-800/90">
          {new Date().getFullYear()}
        </div>
      </div>
    </section>
  )
}

