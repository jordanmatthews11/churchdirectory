'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { Family, Member } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { formatMemberDisplayLine } from '@/lib/member-display'
import { updateFamily } from '@/lib/actions'
import { PhotoFrameEditor } from '@/components/photo-frame-editor'
import { getPhotoFitClass, getPhotoPresentationStyle } from '@/lib/photo-presentation'
import { toast } from 'sonner'

interface FamilyCardProps {
  family: Family & { members?: Member[] }
  placeholderUrl?: string | null
}

export function FamilyCard({ family, placeholderUrl }: FamilyCardProps) {
  const router = useRouter()
  const [currentFamily, setCurrentFamily] = useState(family)
  const [editorOpen, setEditorOpen] = useState(false)
  const location = [currentFamily.city, currentFamily.state].filter(Boolean).join(', ')
  const memberNames = formatMemberDisplayLine(
    currentFamily.members,
    currentFamily.different_last_names ?? false
  )

  useEffect(() => {
    setCurrentFamily(family)
  }, [family])

  async function handleSavePhotoFrame(values: {
    fit: Family['photo_fit']
    positionX: number
    positionY: number
    zoom: number
  }) {
    try {
      const updated = await updateFamily(currentFamily.id, {
        photo_fit: values.fit,
        photo_position_x: values.positionX,
        photo_position_y: values.positionY,
        photo_zoom: values.zoom,
      })
      setCurrentFamily((prev) => ({ ...prev, ...updated }))
      toast.success('Family photo updated')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update family photo')
      throw error
    }
  }

  function handleOpenDetails() {
    router.push(`/families/${currentFamily.id}`)
  }

  return (
    <>
      <Card
        className="group h-full cursor-pointer overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md"
        role="link"
        tabIndex={0}
        onClick={handleOpenDetails}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            handleOpenDetails()
          }
        }}
      >
        <div className="flex items-center justify-center bg-gradient-to-br from-[#F4F4EC] to-slate-100 p-3">
          {currentFamily.photo_url ? (
            <button
              type="button"
              className="relative block w-full"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setEditorOpen(true)
              }}
              aria-label={`Adjust ${currentFamily.name} family photo`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentFamily.photo_url}
                alt={`${currentFamily.name} family`}
                className={`max-h-44 w-full rounded ${getPhotoFitClass(currentFamily.photo_fit)}`}
                style={getPhotoPresentationStyle({
                  fit: currentFamily.photo_fit,
                  positionX: currentFamily.photo_position_x,
                  positionY: currentFamily.photo_position_y,
                  zoom: currentFamily.photo_zoom,
                })}
              />
              <span className="absolute inset-x-3 bottom-3 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                Adjust photo
              </span>
            </button>
          ) : placeholderUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={placeholderUrl}
              alt="Family photo placeholder"
              className="max-h-44 w-full rounded object-contain p-6"
            />
          ) : (
            <div className="flex h-28 items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                <span className="text-2xl font-bold text-[#7A9C49]">
                  {currentFamily.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          )}
        </div>
        <CardContent className="p-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-slate-800 transition-colors group-hover:text-[#7A9C49]">
              {currentFamily.name}
            </h3>
            <p className="mt-0.5 line-clamp-2 min-h-9 text-sm text-slate-500">
              {memberNames || 'No members'}
            </p>
          </div>
          {location && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="h-3 w-3" />
              {location}
            </p>
          )}
          {currentFamily.mailing_address && (
            <p className="mt-0.5 text-xs text-slate-400">{currentFamily.mailing_address}</p>
          )}
        </CardContent>
      </Card>

      {currentFamily.photo_url ? (
        <PhotoFrameEditor
          open={editorOpen}
          photoUrl={currentFamily.photo_url}
          fit={currentFamily.photo_fit}
          positionX={currentFamily.photo_position_x}
          positionY={currentFamily.photo_position_y}
          zoom={currentFamily.photo_zoom}
          aspect={1}
          title={`Adjust ${currentFamily.name} family photo`}
          onOpenChange={setEditorOpen}
          onSave={handleSavePhotoFrame}
        />
      ) : null}
    </>
  )
}
