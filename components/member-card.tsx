'use client'

import { useState } from 'react'
import { Edit2, Trash2, Save, X, Loader2, Phone, Mail, Calendar } from 'lucide-react'
import { Member, ROLE_LABELS, MemberRole } from '@/types'
import { updateMember, deleteMember } from '@/lib/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { PhotoUpload } from '@/components/photo-upload'

interface MemberCardProps {
  member: Member
  familyId: string
  onUpdate: (member: Member) => void
  onDelete: (id: string) => void
}

const roleBadgeColors: Record<MemberRole, string> = {
  adult: 'bg-[#F4F4EC] text-[#7A9C49]',
  child: 'bg-green-100 text-green-700',
  other: 'bg-slate-100 text-slate-600',
}

const ROLE_OPTIONS: Array<{ value: MemberRole; label: string }> = [
  { value: 'adult', label: 'Adult' },
  { value: 'child', label: 'Child' },
  { value: 'other', label: 'Other' },
]

export function MemberCard({ member, familyId, onUpdate, onDelete }: MemberCardProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    first_name: member.first_name,
    last_name: member.last_name,
    role: member.role as MemberRole,
    bio: member.bio ?? '',
    member_since: member.member_since ?? '',
    phone: member.phone ?? '',
    email: member.email ?? '',
    photo_url: member.photo_url ?? '',
    photo_fit: member.photo_fit ?? 'cover',
    photo_position_x: member.photo_position_x ?? 50,
    photo_position_y: member.photo_position_y ?? 50,
  })

  function update(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error('First and last name are required')
      return
    }
    setSaving(true)
    try {
      const updated = await updateMember(member.id, familyId, {
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
      onUpdate(updated)
      setEditing(false)
      toast.success('Member updated')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setForm({
      first_name: member.first_name,
      last_name: member.last_name,
      role: member.role as MemberRole,
      bio: member.bio ?? '',
      member_since: member.member_since ?? '',
      phone: member.phone ?? '',
      email: member.email ?? '',
      photo_url: member.photo_url ?? '',
      photo_fit: member.photo_fit ?? 'cover',
      photo_position_x: member.photo_position_x ?? 50,
      photo_position_y: member.photo_position_y ?? 50,
    })
    setEditing(false)
  }

  async function handleDelete() {
    try {
      await deleteMember(member.id, familyId)
      onDelete(member.id)
      toast.success('Member removed')
    } catch {
      toast.error('Failed to remove member')
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        {editing ? (
          <div className="space-y-4">
            <PhotoUpload
              bucket="member-photos"
              entityId={member.id}
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">First Name</Label>
                <Input
                  value={form.first_name}
                  onChange={(e) => update('first_name', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Last Name</Label>
                <Input
                  value={form.last_name}
                  onChange={(e) => update('last_name', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Role</Label>
              <Select value={form.role} onValueChange={(v) => update('role', v)}>
                <SelectTrigger className="h-8 text-sm">
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
            <div className="space-y-1.5">
              <Label className="text-xs">Member Since</Label>
              <Input
                type="date"
                value={form.member_since}
                onChange={(e) => update('member_since', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input
                type="tel"
                placeholder="(555) 123-4567"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                placeholder="name@example.com"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Bio</Label>
              <Textarea
                placeholder="A short bio..."
                value={form.bio}
                onChange={(e) => update('bio', e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleCancel}
                disabled={saving}
              >
                <X className="mr-1.5 h-3 w-3" />
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-[#7A9C49] hover:bg-[#6B8A3D]"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-3 w-3" />
                )}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MemberAvatar member={member} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-800 truncate">
                    {member.first_name} {member.last_name}
                  </p>
                </div>
                <span
                  className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                    roleBadgeColors[member.role as MemberRole] ?? roleBadgeColors.other
                  }`}
                >
                  {ROLE_LABELS[member.role as MemberRole] ?? 'Other'}
                </span>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setEditing(true)}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Remove {member.first_name} {member.last_name}?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This member will be permanently removed from the directory.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <div className="space-y-1.5 text-sm text-slate-600">
              {member.member_since && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>
                    Member since{' '}
                    {new Date(member.member_since).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                    })}
                  </span>
                </div>
              )}
              {member.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <a
                    href={`tel:${member.phone}`}
                    className="hover:text-[#7A9C49] hover:underline"
                  >
                    {member.phone}
                  </a>
                </div>
              )}
              {member.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <a
                    href={`mailto:${member.email}`}
                    className="truncate hover:text-[#7A9C49] hover:underline"
                  >
                    {member.email}
                  </a>
                </div>
              )}
            </div>

            {member.bio && (
              <p className="text-sm leading-relaxed text-slate-600 border-t pt-3 mt-3">
                {member.bio}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MemberAvatar({ member }: { member: Member }) {
  if (member.photo_url) {
    return (
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={member.photo_url}
          alt={`${member.first_name} ${member.last_name}`}
          className={`h-full w-full ${(member.photo_fit ?? 'cover') === 'contain' ? 'object-contain' : 'object-cover'}`}
          style={{
            objectPosition: `${member.photo_position_x ?? 50}% ${member.photo_position_y ?? 50}%`,
          }}
        />
      </div>
    )
  }
  const initials = `${member.first_name.charAt(0)}${member.last_name.charAt(0)}`.toUpperCase()
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F4F4EC]">
      <span className="text-sm font-semibold text-[#7A9C49]">{initials}</span>
    </div>
  )
}
