'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { Camera, Loader2, Trash2, User } from 'lucide-react'
import { uploadPhoto, PhotoBucket } from '@/lib/storage'
import { PhotoFitMode } from '@/types'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface PhotoPresentation {
  fit: PhotoFitMode
  positionX: number
  positionY: number
}

interface PhotoUploadProps {
  bucket: PhotoBucket
  entityId: string
  currentUrl: string | null
  currentFit?: PhotoFitMode | null
  currentPositionX?: number | null
  currentPositionY?: number | null
  onUpload: (url: string, presentation: PhotoPresentation) => void
  onRemove?: () => void
  size?: 'sm' | 'md' | 'lg'
  shape?: 'circle' | 'rounded'
}

const sizeMap = {
  sm: 'h-16 w-16',
  md: 'h-24 w-24',
  lg: 'h-32 w-32',
}
const MAX_UPLOAD_SIZE_MB = 10
const MAX_UPLOAD_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024

function clampPct(value: number): number {
  if (Number.isNaN(value)) return 50
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function PhotoUpload({
  bucket,
  entityId,
  currentUrl,
  currentFit,
  currentPositionX,
  currentPositionY,
  onUpload,
  onRemove,
  size = 'md',
  shape = 'circle',
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [fit, setFit] = useState<PhotoFitMode>(currentFit ?? 'cover')
  const [positionX, setPositionX] = useState<number>(clampPct(currentPositionX ?? 50))
  const [positionY, setPositionY] = useState<number>(clampPct(currentPositionY ?? 50))
  const inputRef = useRef<HTMLInputElement>(null)

  const pendingUrl = useMemo(() => {
    if (!pendingFile) return null
    return URL.createObjectURL(pendingFile)
  }, [pendingFile])

  useEffect(() => {
    return () => {
      if (pendingUrl) URL.revokeObjectURL(pendingUrl)
    }
  }, [pendingUrl])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(`Image must be under ${MAX_UPLOAD_SIZE_MB}MB`)
      return
    }

    setPendingFile(file)
    setFit(currentFit ?? 'cover')
    setPositionX(clampPct(currentPositionX ?? 50))
    setPositionY(clampPct(currentPositionY ?? 50))
    setEditorOpen(true)
  }

  async function handleUploadConfirmed() {
    if (!pendingFile) return
    setUploading(true)
    try {
      const url = await uploadPhoto(bucket, pendingFile, entityId)
      onUpload(url, { fit, positionX: clampPct(positionX), positionY: clampPct(positionY) })
      toast.success('Photo uploaded')
      setEditorOpen(false)
      setPendingFile(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload photo')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function closeEditor() {
    setEditorOpen(false)
    setPendingFile(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl'
  const fitClass = (currentFit ?? 'cover') === 'contain' ? 'object-contain' : 'object-cover'
  const previewStyle = {
    objectPosition: `${clampPct(currentPositionX ?? 50)}% ${clampPct(currentPositionY ?? 50)}%`,
  }

  return (
    <>
      <div className="flex items-end gap-2">
        <div
          className={cn(
            'relative overflow-hidden border-2 border-dashed border-slate-200 bg-slate-100',
            sizeMap[size],
            shapeClass
          )}
        >
          {currentUrl ? (
            <Image
              src={currentUrl}
              alt="Profile photo"
              fill
              className={fitClass}
              style={previewStyle}
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

      <Dialog open={editorOpen} onOpenChange={(open) => (!open ? closeEditor() : setEditorOpen(true))}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Fit and crop photo</DialogTitle>
            <DialogDescription>
              Choose whether to fit the whole image or fill/crop the frame. You can adjust crop focus
              with horizontal and vertical position sliders.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={fit === 'contain' ? 'default' : 'outline'}
                onClick={() => setFit('contain')}
                className={fit === 'contain' ? 'bg-[#7A9C49] hover:bg-[#6B8A3D]' : ''}
              >
                Fit entire image
              </Button>
              <Button
                type="button"
                variant={fit === 'cover' ? 'default' : 'outline'}
                onClick={() => setFit('cover')}
                className={fit === 'cover' ? 'bg-[#7A9C49] hover:bg-[#6B8A3D]' : ''}
              >
                Fill and crop
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium text-slate-600">Square preview</p>
                <div className="relative aspect-square overflow-hidden rounded-lg border bg-slate-100">
                  {pendingUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pendingUrl}
                      alt="Pending photo"
                      className={cn('h-full w-full', fit === 'contain' ? 'object-contain' : 'object-cover')}
                      style={{ objectPosition: `${positionX}% ${positionY}%` }}
                    />
                  ) : null}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-slate-600">
                  {shape === 'circle' ? 'Circle preview' : 'Rounded preview'}
                </p>
                <div
                  className={cn(
                    'relative aspect-square overflow-hidden border bg-slate-100',
                    shape === 'circle' ? 'rounded-full' : 'rounded-xl'
                  )}
                >
                  {pendingUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pendingUrl}
                      alt="Pending photo preview"
                      className={cn('h-full w-full', fit === 'contain' ? 'object-contain' : 'object-cover')}
                      style={{ objectPosition: `${positionX}% ${positionY}%` }}
                    />
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <label className="text-xs font-medium text-slate-600">
                Horizontal position: {clampPct(positionX)}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={positionX}
                onChange={(e) => setPositionX(Number(e.target.value))}
                className="w-full accent-[#7A9C49]"
              />

              <label className="text-xs font-medium text-slate-600">
                Vertical position: {clampPct(positionY)}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={positionY}
                onChange={(e) => setPositionY(Number(e.target.value))}
                className="w-full accent-[#7A9C49]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeEditor} disabled={uploading}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#7A9C49] hover:bg-[#6B8A3D]"
              onClick={handleUploadConfirmed}
              disabled={!pendingFile || uploading}
            >
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
