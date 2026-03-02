'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Camera, Loader2, Trash2, User } from 'lucide-react'
import { uploadPhoto, PhotoBucket } from '@/lib/storage'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PhotoUploadProps {
  bucket: PhotoBucket
  entityId: string
  currentUrl: string | null
  onUpload: (url: string) => void
  onRemove?: () => void
  size?: 'sm' | 'md' | 'lg'
  shape?: 'circle' | 'rounded'
}

const sizeMap = {
  sm: 'h-16 w-16',
  md: 'h-24 w-24',
  lg: 'h-32 w-32',
}

export function PhotoUpload({
  bucket,
  entityId,
  currentUrl,
  onUpload,
  onRemove,
  size = 'md',
  shape = 'circle',
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB')
      return
    }

    setUploading(true)
    try {
      const url = await uploadPhoto(bucket, file, entityId)
      onUpload(url)
      toast.success('Photo uploaded')
    } catch {
      toast.error('Failed to upload photo')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl'

  return (
    <div className="flex items-end gap-2">
      <div className={cn('relative overflow-hidden bg-slate-100 border-2 border-dashed border-slate-200', sizeMap[size], shapeClass)}>
        {currentUrl ? (
          <Image
            src={currentUrl}
            alt="Profile photo"
            fill
            className="object-cover"
            sizes="128px"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              <User className="h-8 w-8 text-slate-300" />
            )}
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="h-8 text-xs"
        >
          <Camera className="mr-1.5 h-3.5 w-3.5" />
          {currentUrl ? 'Change' : 'Upload photo'}
        </Button>
        {currentUrl && onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-8 text-xs text-red-500 hover:text-red-600"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Remove
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
