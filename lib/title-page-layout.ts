import { DEFAULT_PHOTO_FIT, DEFAULT_PHOTO_POSITION, DEFAULT_PHOTO_ZOOM } from '@/lib/photo-presentation'
import type { DirectorySettings, PhotoFitMode, TextAlignMode, TitlePageLayout } from '@/types'

export const DEFAULT_TITLE_LOGO_GAP = 20
export const DEFAULT_TITLE_IMAGE_GAP = 16
export const DEFAULT_INTRO_FONT_SIZE = 13
export const DEFAULT_INTRO_LINE_HEIGHT = 1.55
export const DEFAULT_INTRO_ALIGN: TextAlignMode = 'left'
export const DEFAULT_INTRO_PARAGRAPH_SPACING = 10
export const DEFAULT_TITLE_IMAGE_SCALE = 100
export const DEFAULT_TITLE_IMAGE_OFFSET_Y = 0

export interface ResolvedTitlePageLayout {
  intro: Required<NonNullable<TitlePageLayout['intro']>>
  title_image: Required<NonNullable<TitlePageLayout['title_image']>>
  spacing: {
    below_logo: number
    below_intro: number
    below_image: number
  }
}

export interface TitlePageLayoutPatch {
  intro?: Partial<ResolvedTitlePageLayout['intro']>
  title_image?: Partial<ResolvedTitlePageLayout['title_image']>
  spacing?: Partial<ResolvedTitlePageLayout['spacing']>
}

export function resolveTitlePageLayout(
  layout: TitlePageLayout | null | undefined
): ResolvedTitlePageLayout {
  const rawBelowIntro = layout?.spacing?.below_intro

  return {
    intro: {
      intro_html: layout?.intro?.intro_html ?? '',
      font_size: layout?.intro?.font_size ?? DEFAULT_INTRO_FONT_SIZE,
      line_height: layout?.intro?.line_height ?? DEFAULT_INTRO_LINE_HEIGHT,
      align: layout?.intro?.align ?? DEFAULT_INTRO_ALIGN,
      color: layout?.intro?.color ?? '',
      bold: layout?.intro?.bold ?? false,
      italic: layout?.intro?.italic ?? false,
      margin_left: layout?.intro?.margin_left ?? 0,
      margin_right: layout?.intro?.margin_right ?? 0,
      margin_top: layout?.intro?.margin_top ?? 0,
      margin_bottom: layout?.intro?.margin_bottom ?? 0,
      paragraph_spacing: layout?.intro?.paragraph_spacing ?? DEFAULT_INTRO_PARAGRAPH_SPACING,
    },
    title_image: {
      fit: layout?.title_image?.fit ?? DEFAULT_PHOTO_FIT,
      position_x: layout?.title_image?.position_x ?? DEFAULT_PHOTO_POSITION,
      position_y: layout?.title_image?.position_y ?? DEFAULT_PHOTO_POSITION,
      zoom: layout?.title_image?.zoom ?? DEFAULT_PHOTO_ZOOM,
      scale: layout?.title_image?.scale ?? DEFAULT_TITLE_IMAGE_SCALE,
      offset_y: layout?.title_image?.offset_y ?? DEFAULT_TITLE_IMAGE_OFFSET_Y,
    },
    spacing: {
      below_logo: layout?.spacing?.below_logo ?? DEFAULT_TITLE_LOGO_GAP,
      below_intro: typeof rawBelowIntro === 'number' ? rawBelowIntro : 0,
      below_image: layout?.spacing?.below_image ?? DEFAULT_TITLE_IMAGE_GAP,
    },
  }
}

export type TitlePageLayoutInput = DirectorySettings['title_page_layout']

export function patchTitlePageLayout(
  current: TitlePageLayoutInput,
  patch: TitlePageLayoutPatch
): TitlePageLayout {
  const merged = {
    ...resolveTitlePageLayout(current),
    ...patch,
    intro: {
      ...resolveTitlePageLayout(current).intro,
      ...patch.intro,
    },
    title_image: {
      ...resolveTitlePageLayout(current).title_image,
      ...patch.title_image,
    },
    spacing: {
      ...resolveTitlePageLayout(current).spacing,
      ...patch.spacing,
    },
  }

  return {
    intro: {
      intro_html: merged.intro.intro_html,
      font_size: merged.intro.font_size,
      line_height: merged.intro.line_height,
      align: merged.intro.align,
      color: merged.intro.color,
      bold: merged.intro.bold,
      italic: merged.intro.italic,
      margin_left: merged.intro.margin_left,
      margin_right: merged.intro.margin_right,
      margin_top: merged.intro.margin_top,
      margin_bottom: merged.intro.margin_bottom,
      paragraph_spacing: merged.intro.paragraph_spacing,
    },
    title_image: {
      fit: merged.title_image.fit as PhotoFitMode,
      position_x: merged.title_image.position_x,
      position_y: merged.title_image.position_y,
      zoom: merged.title_image.zoom,
      scale: merged.title_image.scale,
      offset_y: merged.title_image.offset_y,
    },
    spacing: {
      below_logo: merged.spacing.below_logo,
      below_intro: merged.spacing.below_intro,
      below_image: merged.spacing.below_image,
    },
  }
}
