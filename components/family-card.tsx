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
  const hasFooterMetadata = Boolean(location || currentFamily.mailing_address)

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
        <CardContent className="p-3">
          <div className="directory-cell">
            <div className="directory-photo">
              {currentFamily.photo_url ? (
                <button
                  type="button"
                  className="absolute inset-0 block h-full w-full"
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
                    className={`absolute inset-0 h-full w-full ${getPhotoFitClass(currentFamily.photo_fit)}`}
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
                  className="absolute inset-0 h-full w-full object-contain p-2"
                />
              ) : (
                <div className="directory-photo-placeholder">
                  <span className="directory-photo-initials">
                    {(currentFamily.name.trim().charAt(0) || '?').toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <div className="directory-names">
              <div className="directory-family-name">{currentFamily.name || '\u00A0'}</div>
              <div className="directory-member-names">{memberNames || '\u00A0'}</div>
            </div>

            {hasFooterMetadata ? (
              <div className="mt-2 w-full text-center">
                {location ? (
                  <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                    <MapPin className="h-3 w-3" />
                    {location}
                  </p>
                ) : null}
                {currentFamily.mailing_address ? (
                  <p className="mt-0.5 text-xs text-slate-400">{currentFamily.mailing_address}</p>
                ) : null}
              </div>
            ) : null}
          </div>
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
