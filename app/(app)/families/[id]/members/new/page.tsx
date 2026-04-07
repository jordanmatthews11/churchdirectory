'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createMember } from '@/lib/actions'
import { MemberRole } from '@/types'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PhotoUpload } from '@/components/photo-upload'
import { v4 as uuidv4 } from 'uuid'

const ROLE_OPTIONS: Array<{ value: MemberRole; label: string }> = [
  { value: 'adult', label: 'Adult' },
  { value: 'child', label: 'Child' },
  { value: 'other', label: 'Other' },
]

export default function NewMemberPage() {
  const router = useRouter()
  const { id: familyId } = useParams<{ id: string }>()
  const [saving, setSaving] = useState(false)
  const memberId = uuidv4()

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    role: 'other' as MemberRole,
    bio: '',
    member_since: '',
    phone: '',
    email: '',
    photo_url: '',
    photo_fit: 'cover' as const,
    photo_position_x: 50,
    photo_position_y: 50,
  })

  function update(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error('First and last name are required')
      return
    }
    setSaving(true)
    try {
      await createMember({
        family_id: familyId,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        role: form.role,
        bio: form.bio || null,
        member_since: form.member_since || null,
        phone: form.phone || null,
        email: form.email || null,
        photo_url: form.photo_url || null,
        photo_fit: form.photo_fit,
        photo_position_x: form.photo_position_x,
        photo_position_y: form.photo_position_y,
      })
      toast.success('Member added')
      router.push(`/families/${familyId}`)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add member')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/families/${familyId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Add Member</h1>
          <p className="text-sm text-slate-500">Add a new member to this family</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Member Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Photo</Label>
              <PhotoUpload
                bucket="member-photos"
                entityId={memberId}
                currentUrl={form.photo_url || null}
                currentFit={form.photo_fit}
                currentPositionX={form.photo_position_x}
                currentPositionY={form.photo_position_y}
                onUpload={(url, presentation) => {
                  update('photo_url', url)
                  update('photo_fit', presentation.fit)
                  update('photo_position_x', presentation.positionX)
                  update('photo_position_y', presentation.positionY)
                }}
                onRemove={() => update('photo_url', '')}
                size="md"
                shape="circle"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  placeholder="Jane"
                  value={form.first_name}
                  onChange={(e) => update('first_name', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  placeholder="Smith"
                  value={form.last_name}
                  onChange={(e) => update('last_name', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Role in Family</Label>
              <Select
                value={form.role}
                onValueChange={(v) => update('role', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="member_since">Member Since</Label>
              <Input
                id="member_since"
                type="date"
                value={form.member_since}
                onChange={(e) => update('member_since', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="jane@example.com"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="A short bio about this person..."
                value={form.bio}
                onChange={(e) => update('bio', e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" asChild className="flex-1">
            <Link href={`/families/${familyId}`}>Cancel</Link>
          </Button>
          <Button type="submit" className="flex-1 bg-[#7A9C49] hover:bg-[#6B8A3D]" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Member
          </Button>
        </div>
      </form>
    </div>
  )
}
