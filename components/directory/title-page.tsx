'use client'

import { type CSSProperties, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'

import { updateDirectorySettings } from '@/lib/actions'
import { PhotoFrameEditor } from '@/components/photo-frame-editor'
import { getPhotoFitClass, getPhotoPresentationStyle } from '@/lib/photo-presentation'
import { resolveTitlePageLayout, patchTitlePageLayout } from '@/lib/title-page-layout'
import { DirectorySettings } from '@/types'

export interface TitlePageProps {
  settings: DirectorySettings
  photoEditorNonce?: number
  onPhotoEditorHandled?: () => void
}

function splitIntoParagraphs(text: string) {
  // Keep author formatting: blank lines become paragraphs.
  return text
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter(Boolean)
}

export function TitlePage({
  settings,
  photoEditorNonce,
  onPhotoEditorHandled,
}: TitlePageProps) {
  const [manualEditorOpen, setManualEditorOpen] = useState(false)
  const paragraphs = useMemo(() => splitIntoParagraphs(settings.intro_text), [settings.intro_text])
  const logoScale = settings.logo_scale ?? 100
  const logoOffsetY = settings.logo_offset_y ?? 0
  const logoCropTop = settings.logo_crop_top ?? 0
  const logoCropBottom = settings.logo_crop_bottom ?? 0
  const logoCropLeft = settings.logo_crop_left ?? 0
  const logoCropRight = settings.logo_crop_right ?? 0
  const layout = resolveTitlePageLayout(settings.title_page_layout)
  const hasRichIntro = Boolean(layout.intro.intro_html && layout.intro.intro_html.trim() && layout.intro.intro_html !== '<p></p>')
  const richIntroStyle = {
    marginTop: layout.spacing.below_logo,
    marginBottom: layout.intro.margin_bottom,
    paddingTop: layout.intro.margin_top,
    paddingLeft: layout.intro.margin_left,
    paddingRight: layout.intro.margin_right,
    '--title-intro-gap': `${layout.intro.paragraph_spacing}px`,
  } as CSSProperties & Record<'--title-intro-gap', string>
  const editorOpen =
    manualEditorOpen || Boolean(photoEditorNonce && settings.title_image_url)

  useEffect(() => {
    if (!photoEditorNonce || !settings.title_image_url) return
    onPhotoEditorHandled?.()
  }, [photoEditorNonce, settings.title_image_url, onPhotoEditorHandled])

  async function handleSavePhotoFrame(values: {
    fit: 'cover' | 'contain'
    positionX: number
    positionY: number
    zoom: number
  }) {
    try {
      await updateDirectorySettings({
        title_page_layout: patchTitlePageLayout(settings.title_page_layout, {
          title_image: {
            fit: values.fit,
            position_x: values.positionX,
            position_y: values.positionY,
            zoom: values.zoom,
          },
        }),
      })
      toast.success('Opening photo updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update opening photo')
      throw error
    }
  }

  return (
    <>
      <section className="directory-page directory-title-page relative overflow-hidden bg-white break-after-page">
        <div className="relative z-10 flex h-full flex-col px-16 pt-8 pb-10">
          {/* Header upload area (logo + "Church Directory" text replacement) */}
          <div className="mx-auto h-[300px] w-[470px] overflow-visible">
            <div className="relative h-full w-full" style={{ transform: `translateY(${logoOffsetY}px)` }}>
              <div
                className="relative h-full w-full overflow-hidden rounded-xl"
                data-export-photo="true"
                style={{
                  transform: `scale(${logoScale / 100})`,
                  transformOrigin: 'center top',
                }}
              >
                {settings.logo_url ? (
                  <Image
                    src={settings.logo_url}
                    alt="Opening header"
                    fill
                    className="object-cover"
                    style={{
                      clipPath: `inset(${logoCropTop}% ${logoCropRight}% ${logoCropBottom}% ${logoCropLeft}%)`,
                    }}
                    sizes="470px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-center">
                    <div>
                      <div className="text-sm font-semibold text-slate-600">Upload header image</div>
                      <div className="mt-1 text-xs text-slate-500">Use the right panel</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Intro text should appear above the image, like the Canva-style layout request. */}
          {hasRichIntro ? (
            <div
              className="title-page-intro-rich"
              style={richIntroStyle}
              dangerouslySetInnerHTML={{ __html: layout.intro.intro_html }}
            />
          ) : (
            <div
              style={{
                marginTop: layout.spacing.below_logo,
                marginBottom: layout.intro.margin_bottom,
                paddingLeft: layout.intro.margin_left,
                paddingRight: layout.intro.margin_right,
                fontSize: layout.intro.font_size,
                lineHeight: String(layout.intro.line_height),
                textAlign: layout.intro.align,
                color: layout.intro.color || undefined,
                fontWeight: layout.intro.bold ? 700 : undefined,
                fontStyle: layout.intro.italic ? 'italic' : undefined,
              }}
            >
              {paragraphs.map((p, idx) => (
                <p
                  key={idx}
                  style={{
                    marginTop: idx === 0 ? layout.intro.margin_top : 0,
                    marginBottom: idx === paragraphs.length - 1 ? 0 : layout.intro.paragraph_spacing,
                  }}
                >
                  {p}
                </p>
              ))}
            </div>
          )}

          <div className="min-h-0 flex-1" />

          {/* Keep the title image at the bottom; additional spacing lifts it toward the intro. */}
          <div className="flex justify-center" style={{ marginTop: layout.spacing.below_intro }}>
            <div
              className="relative"
              style={{
                transform: `translateY(${layout.title_image.offset_y}px) scale(${layout.title_image.scale / 100})`,
                transformOrigin: 'center bottom',
              }}
            >
              <div
                className="group relative h-[340px] w-[470px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                data-export-photo="true"
              >
                {settings.title_image_url ? (
                  <button
                    type="button"
                    className="absolute inset-0 h-full w-full"
                    onClick={() => setManualEditorOpen(true)}
                    aria-label="Adjust opening page photo"
                  >
                    <Image
                      src={settings.title_image_url}
                      alt="Title"
                      fill
                      className={getPhotoFitClass(layout.title_image.fit)}
                      style={getPhotoPresentationStyle({
                        fit: layout.title_image.fit,
                        positionX: layout.title_image.position_x,
                        positionY: layout.title_image.position_y,
                        zoom: layout.title_image.zoom,
                      })}
                      sizes="470px"
                    />
                    <span className="absolute inset-x-4 bottom-4 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                      Adjust photo
                    </span>
                  </button>
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="text-center">
                      <div className="text-sm font-medium text-slate-600">No title image selected</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            className="text-center text-sm font-semibold text-slate-800"
            style={{ marginTop: layout.spacing.below_image }}
          >
            {settings.date_label || ' '}
          </div>
        </div>
      </section>

      {settings.title_image_url ? (
        <PhotoFrameEditor
          open={editorOpen}
          photoUrl={settings.title_image_url}
          fit={layout.title_image.fit}
          positionX={layout.title_image.position_x}
          positionY={layout.title_image.position_y}
          zoom={layout.title_image.zoom}
          aspect={470 / 340}
          title="Adjust Opening page photo"
          onOpenChange={setManualEditorOpen}
          onSave={handleSavePhotoFrame}
        />
      ) : null}
    </>
  )
}

