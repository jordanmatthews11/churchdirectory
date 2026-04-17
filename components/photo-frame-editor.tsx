'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Move, RotateCcw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  clampPhotoPosition,
  clampPhotoZoom,
  DEFAULT_PHOTO_FIT,
  DEFAULT_PHOTO_POSITION,
  DEFAULT_PHOTO_ZOOM,
  getPhotoFitClass,
  getPhotoPresentationStyle,
  MAX_PHOTO_ZOOM,
  MIN_PHOTO_ZOOM,
} from '@/lib/photo-presentation'
import type { PhotoFitMode } from '@/types'

export interface PhotoFrameEditorValue {
  fit: PhotoFitMode
  positionX: number
  positionY: number
  zoom: number
}

interface PhotoFrameEditorProps {
  open: boolean
  photoUrl: string
  fit?: PhotoFitMode | null
  positionX?: number | null
  positionY?: number | null
  zoom?: number | null
  aspect?: number
  title?: string
  description?: string
  onSave: (value: PhotoFrameEditorValue) => Promise<void> | void
  onOpenChange: (open: boolean) => void
}

interface PointerPoint {
  x: number
  y: number
}

function getDistance(a: PointerPoint, b: PointerPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function PhotoFrameEditor({
  open,
  photoUrl,
  fit,
  positionX,
  positionY,
  zoom,
  aspect = 1,
  title = 'Adjust photo framing',
  description = 'Drag to choose the focal point, use the zoom slider or mouse wheel, and preview the directory crop before saving.',
  onSave,
  onOpenChange,
}: PhotoFrameEditorProps) {
  const [draftFit, setDraftFit] = useState<PhotoFitMode>(fit ?? DEFAULT_PHOTO_FIT)
  const [draftPositionX, setDraftPositionX] = useState(clampPhotoPosition(positionX))
  const [draftPositionY, setDraftPositionY] = useState(clampPhotoPosition(positionY))
  const [draftZoom, setDraftZoom] = useState(clampPhotoZoom(zoom))
  const [saving, setSaving] = useState(false)
  const previewRef = useRef<HTMLDivElement | null>(null)
  const pointersRef = useRef(new Map<number, PointerPoint>())
  const pinchStartDistanceRef = useRef(0)
  const pinchStartZoomRef = useRef(DEFAULT_PHOTO_ZOOM)

  useEffect(() => {
    if (!open) return
    setDraftFit(fit ?? DEFAULT_PHOTO_FIT)
    setDraftPositionX(clampPhotoPosition(positionX))
    setDraftPositionY(clampPhotoPosition(positionY))
    setDraftZoom(clampPhotoZoom(zoom))
    setSaving(false)
    pointersRef.current.clear()
    pinchStartDistanceRef.current = 0
    pinchStartZoomRef.current = DEFAULT_PHOTO_ZOOM
  }, [open, fit, positionX, positionY, zoom])

  const previewStyle = useMemo(
    () =>
      getPhotoPresentationStyle({
        fit: draftFit,
        positionX: draftPositionX,
        positionY: draftPositionY,
        zoom: draftZoom,
      }),
    [draftFit, draftPositionX, draftPositionY, draftZoom]
  )

  function updatePositionFromPointer(clientX: number, clientY: number) {
    const frame = previewRef.current
    if (!frame) return

    const rect = frame.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    const nextX = ((clientX - rect.left) / rect.width) * 100
    const nextY = ((clientY - rect.top) / rect.height) * 100

    setDraftPositionX(clampPhotoPosition(nextX))
    setDraftPositionY(clampPhotoPosition(nextY))
  }

  function resetPinchTracking() {
    pinchStartDistanceRef.current = 0
    pinchStartZoomRef.current = draftZoom
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointersRef.current.size === 1) {
      updatePositionFromPointer(event.clientX, event.clientY)
      return
    }

    if (pointersRef.current.size === 2) {
      const [first, second] = Array.from(pointersRef.current.values())
      pinchStartDistanceRef.current = getDistance(first, second)
      pinchStartZoomRef.current = draftZoom
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.has(event.pointerId)) return

    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointersRef.current.size >= 2) {
      const [first, second] = Array.from(pointersRef.current.values())
      const nextDistance = getDistance(first, second)
      if (!pinchStartDistanceRef.current) {
        pinchStartDistanceRef.current = nextDistance
        pinchStartZoomRef.current = draftZoom
        return
      }

      const nextZoom = pinchStartZoomRef.current * (nextDistance / pinchStartDistanceRef.current)
      setDraftZoom(clampPhotoZoom(nextZoom))
      return
    }

    updatePositionFromPointer(event.clientX, event.clientY)
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(event.pointerId)
    if (pointersRef.current.size < 2) {
      resetPinchTracking()
    }
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault()
    const direction = Math.sign(event.deltaY)
    const delta = direction === 0 ? 0 : direction * 10
    setDraftZoom((current) => clampPhotoZoom(current - delta))
  }

  function handleReset() {
    setDraftFit(DEFAULT_PHOTO_FIT)
    setDraftPositionX(DEFAULT_PHOTO_POSITION)
    setDraftPositionY(DEFAULT_PHOTO_POSITION)
    setDraftZoom(DEFAULT_PHOTO_ZOOM)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({
        fit: draftFit,
        positionX: clampPhotoPosition(draftPositionX),
        positionY: clampPhotoPosition(draftPositionY),
        zoom: clampPhotoZoom(draftZoom),
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Move className="h-3.5 w-3.5" />
                Drag to reposition
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5" />
                Scroll or pinch to zoom
              </span>
            </div>

            <div
              ref={previewRef}
              className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner"
              style={{ aspectRatio: String(aspect), touchAction: 'none' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              onWheel={handleWheel}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl}
                alt="Photo preview"
                className={cn('h-full w-full select-none', getPhotoFitClass(draftFit))}
                draggable={false}
                style={previewStyle}
              />

              <div className="pointer-events-none absolute inset-0 border-2 border-white/80 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.16)]" />
              <div className="pointer-events-none absolute inset-[12%] rounded-[1.25rem] border border-dashed border-white/80" />
              <div
                className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#7A9C49]/70 shadow-sm"
                style={{ left: `${draftPositionX}%`, top: `${draftPositionY}%` }}
              />
            </div>

            <p className="text-center text-xs text-slate-500">
              Directory frame preview: {draftFit === 'cover' ? 'Fill' : 'Fit'} at {(draftZoom / 100).toFixed(1)}x
            </p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-800">Zoom</p>
              <input
                type="range"
                min={MIN_PHOTO_ZOOM}
                max={MAX_PHOTO_ZOOM}
                step={1}
                value={draftZoom}
                onChange={(event) => setDraftZoom(clampPhotoZoom(Number(event.target.value)))}
                className="w-full accent-[#7A9C49]"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{(MIN_PHOTO_ZOOM / 100).toFixed(1)}x</span>
                <span className="font-medium text-slate-700">{(draftZoom / 100).toFixed(1)}x</span>
                <span>{(MAX_PHOTO_ZOOM / 100).toFixed(1)}x</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-800">Fit mode</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={draftFit === 'cover' ? 'default' : 'outline'}
                  className={draftFit === 'cover' ? 'bg-[#7A9C49] hover:bg-[#6B8A3D]' : ''}
                  onClick={() => setDraftFit('cover')}
                >
                  Fill
                </Button>
                <Button
                  type="button"
                  variant={draftFit === 'contain' ? 'default' : 'outline'}
                  className={draftFit === 'contain' ? 'bg-[#7A9C49] hover:bg-[#6B8A3D]' : ''}
                  onClick={() => setDraftFit('contain')}
                >
                  Fit
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-800">Current framing</p>
              <p className="mt-1">Horizontal focus: {draftPositionX}%</p>
              <p>Vertical focus: {draftPositionY}%</p>
            </div>

            <Button type="button" variant="outline" onClick={handleReset} className="w-full">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[#7A9C49] hover:bg-[#6B8A3D]"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
