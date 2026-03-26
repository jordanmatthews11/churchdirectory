export interface Family {
  id: string
  name: string
  mailing_address: string | null
  city: string | null
  state: string | null
  zip: string | null
  photo_url: string | null
  notes: string | null
  created_at: string
  members?: Member[]
}

export interface Member {
  id: string
  family_id: string
  first_name: string
  last_name: string
  role: 'head' | 'spouse' | 'child' | 'other'
  bio: string | null
  member_since: string | null
  phone: string | null
  email: string | null
  photo_url: string | null
  created_at: string
}

export type MemberRole = 'head' | 'spouse' | 'child' | 'other'

export const ROLE_LABELS: Record<MemberRole, string> = {
  head: 'Head of Household',
  spouse: 'Spouse',
  child: 'Child',
  other: 'Other',
}

export interface DirectorySettings {
  id: string
  cover_image_url: string | null
  title_image_url: string | null
  intro_text: string
  date_label: string
  updated_at: string
}
