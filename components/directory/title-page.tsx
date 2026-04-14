'use client'

import { useMemo } from 'react'
import Image from 'next/image'

import { DirectorySettings } from '@/types'

export interface TitlePageProps {
  settings: DirectorySettings
}

function splitIntoParagraphs(text: string) {
  // Keep author formatting: blank lines become paragraphs.
  return text
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter(Boolean)
}

export function TitlePage({ settings }: TitlePageProps) {
  const paragraphs = useMemo(() => splitIntoParagraphs(settings.intro_text), [settings.intro_text])
  const logoScale = settings.logo_scale ?? 100
  const logoOffsetY = settings.logo_offset_y ?? 0
  const logoCropTop = settings.logo_crop_top ?? 0
  const logoCropBottom = settings.logo_crop_bottom ?? 0
  const logoCropLeft = settings.logo_crop_left ?? 0
  const logoCropRight = settings.logo_crop_right ?? 0

  return (
    <section className="directory-page directory-title-page relative overflow-hidden bg-white break-after-page">
      <div className="relative z-10 flex h-full flex-col px-16 pt-8 pb-10">
        {/* Header upload area (logo + "Church Directory" text replacement) */}
        <div className="mx-auto h-[300px] w-[470px] overflow-visible">
          <div className="relative h-full w-full" style={{ transform: `translateY(${logoOffsetY}px)` }}>
            <div
              className="relative h-full w-full overflow-hidden rounded-xl bg-white"
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
        <div className="mt-5 text-[13px] leading-[1.55]">
          {paragraphs.map((p, idx) => (
            <p key={idx} className="mb-2.5">
              {p}
            </p>
          ))}
        </div>

        {/* Keep the title image at the bottom; constrain to ~470x340px */}
        <div className="mt-auto flex items-end justify-center">
          <div className="relative h-[340px] w-[470px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {settings.title_image_url ? (
              <Image src={settings.title_image_url} alt="Title" fill className="object-cover" sizes="470px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                  <div className="text-sm font-medium text-slate-600">No title image selected</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 text-center text-sm font-semibold text-slate-800">{settings.date_label || ' '}</div>
      </div>
    </section>
  )
}

