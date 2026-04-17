import type { CSSProperties } from 'react'
import type { PhotoFitMode } from '@/types'

export const DEFAULT_PHOTO_FIT: PhotoFitMode = 'cover'
export const DEFAULT_PHOTO_POSITION = 50
export const DEFAULT_PHOTO_ZOOM = 100
export const MIN_PHOTO_ZOOM = 100
export const MAX_PHOTO_ZOOM = 400

export interface PhotoPresentationValues {
  fit?: PhotoFitMode | null
  positionX?: number | null
  positionY?: number | null
  zoom?: number | null
}

export function clampPhotoPosition(value: number | null | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return DEFAULT_PHOTO_POSITION
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function clampPhotoZoom(value: number | null | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return DEFAULT_PHOTO_ZOOM
  return Math.max(MIN_PHOTO_ZOOM, Math.min(MAX_PHOTO_ZOOM, Math.round(value)))
}

export function getPhotoFitClass(fit: PhotoFitMode | null | undefined): 'object-cover' | 'object-contain' {
  return fit === 'contain' ? 'object-contain' : 'object-cover'
}

export function getPhotoPresentationStyle(values: PhotoPresentationValues): CSSProperties {
  const positionX = clampPhotoPosition(values.positionX)
  const positionY = clampPhotoPosition(values.positionY)
  const zoom = clampPhotoZoom(values.zoom)

  return {
    objectPosition: `${positionX}% ${positionY}%`,
    transform: `scale(${zoom / 100})`,
    transformOrigin: `${positionX}% ${positionY}%`,
  }
}
