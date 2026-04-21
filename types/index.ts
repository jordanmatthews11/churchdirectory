export type PhotoFitMode = 'cover' | 'contain'

export type TextAlignMode = 'left' | 'center' | 'right' | 'justify'

export interface TitlePageLayout {
  intro?: {
    intro_html?: string
    font_size?: number
    line_height?: number
    align?: TextAlignMode
    color?: string
    bold?: boolean
    italic?: boolean
    margin_left?: number
    margin_right?: number
    margin_top?: number
    margin_bottom?: number
    paragraph_spacing?: number
  }
  title_image?: {
    fit?: PhotoFitMode
    position_x?: number
    position_y?: number
    zoom?: number
    scale?: number
    offset_y?: number
  }
  spacing?: {
    below_logo?: number
    below_intro?: number
    below_image?: number
  }
}

export interface Family {
  id: string
  name: string
  different_last_names: boolean
  mailing_address: string | null
  city: string | null
  state: string | null
  zip: string | null
  photo_url: string | null
  photo_fit?: PhotoFitMode | null
  photo_position_x?: number | null
  photo_position_y?: number | null
  photo_zoom?: number | null
  notes: string | null
  created_at: string
  members?: Member[]
}

export interface Member {
  id: string
  family_id: string
  first_name: string
  last_name: string
  role: 'adult' | 'child' | 'other'
  display_order: number
  bio: string | null
  member_since: string | null
  phone: string | null
  email: string | null
  photo_url: string | null
  photo_fit?: PhotoFitMode | null
  photo_position_x?: number | null
  photo_position_y?: number | null
  photo_zoom?: number | null
  created_at: string
}

export type MemberRole = 'adult' | 'child' | 'other'

export const ROLE_LABELS: Record<MemberRole, string> = {
  adult: 'Adult',
  child: 'Child',
  other: 'Other',
}

export interface StaffEntry {
  name: string
  title: string
  email: string
}

export interface LeadershipData {
  elders: string[]
  deacons: string[]
  deaconesses: string[]
  staff: StaffEntry[]
}

export function emptyLeadershipData(): LeadershipData {
  return { elders: [], deacons: [], deaconesses: [], staff: [] }
}

/** Normalize JSON from Supabase into LeadershipData. */
export function parseLeadershipData(raw: unknown): LeadershipData {
  if (!raw || typeof raw !== 'object') return emptyLeadershipData()
  const o = raw as Record<string, unknown>
  const asStringArray = (v: unknown) =>
    Array.isArray(v) ? (v.filter((x) => typeof x === 'string') as string[]) : []
  const staffRaw = Array.isArray(o.staff) ? o.staff : []
  const staff: StaffEntry[] = staffRaw.map((s) => {
    if (!s || typeof s !== 'object') return { name: '', title: '', email: '' }
    const r = s as Record<string, unknown>
    return {
      name: typeof r.name === 'string' ? r.name : '',
      title: typeof r.title === 'string' ? r.title : '',
      email: typeof r.email === 'string' ? r.email : '',
    }
  })
  return {
    elders: asStringArray(o.elders),
    deacons: asStringArray(o.deacons),
    deaconesses: asStringArray(o.deaconesses),
    staff,
  }
}

export interface DirectorySettings {
  id: string
  cover_image_url: string | null
  title_image_url: string | null
  logo_url: string | null
  family_placeholder_url: string | null
  logo_scale: number
  logo_offset_y: number
  logo_crop_top: number
  logo_crop_bottom: number
  logo_crop_left: number
  logo_crop_right: number
  church_name: string
  cover_title_line1: string
  cover_title_line2: string
  cover_year: string
  intro_text: string
  date_label: string
  back_page_html: string | null
  opening_page_html?: string | null
  opening_page_margin_top?: number | null
  opening_page_margin_bottom?: number | null
  back_page_margin_top?: number | null
  back_page_margin_bottom?: number | null
  title_page_layout?: TitlePageLayout | null
  /** Elders, deacons, deaconesses, staff list for the Leadership PDF page (JSONB). */
  leadership_data?: LeadershipData | null
  updated_at: string
}
