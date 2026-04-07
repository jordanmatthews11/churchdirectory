'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Edit2, Trash2, MapPin, Save, X, Loader2, Plus } from 'lucide-react'
import { Family } from '@/types'
import { updateFamily, deleteFamily } from '@/lib/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
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
import { MemberCard } from '@/components/member-card'
import Link from 'next/link'
import { Checkbox } from '@/components/ui/checkbox'
import { formatMemberDisplayLine } from '@/lib/member-display'

interface FamilyProfileProps {
  family: Family
}

export function FamilyProfile({ family: initialFamily }: FamilyProfileProps) {
  const router = useRouter()
  const [family, setFamily] = useState(initialFamily)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: initialFamily.name,
    different_last_names: initialFamily.different_last_names ?? false,
    mailing_address: initialFamily.mailing_address ?? '',
    city: initialFamily.city ?? '',
    state: initialFamily.state ?? '',
    zip: initialFamily.zip ?? '',
    photo_url: initialFamily.photo_url ?? '',
    notes: initialFamily.notes ?? '',
  })

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Family name is required')
      return
    }
    setSaving(true)
    try {
      const updated = await updateFamily(family.id, {
        name: form.name.trim(),
        different_last_names: form.different_last_names,
        mailing_address: form.mailing_address || null,
        city: form.city || null,
        state: form.state || null,
        zip: form.zip || null,
        photo_url: form.photo_url || null,
        notes: form.notes || null,
      })
      setFamily((prev) => ({ ...prev, ...updated }))
      setEditing(false)
      toast.success('Family updated')
    } catch {
      toast.error('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setForm({
      name: family.name,
      different_last_names: family.different_last_names ?? false,
      mailing_address: family.mailing_address ?? '',
      city: family.city ?? '',
      state: family.state ?? '',
      zip: family.zip ?? '',
      photo_url: family.photo_url ?? '',
      notes: family.notes ?? '',
    })
    setEditing(false)
  }

  async function handleDelete() {
    try {
      await deleteFamily(family.id)
      toast.success('Family deleted')
      router.push('/')
      router.refresh()
    } catch {
      toast.error('Failed to delete family')
    }
  }

  const location = [family.city, family.state].filter(Boolean).join(', ')
  const fullAddress = [family.mailing_address, location, family.zip]
    .filter(Boolean)
    .join(' · ')

  const sortedMembers = [...(family.members ?? [])].sort((a, b) => {
    const order = { head: 0, spouse: 1, child: 2, other: 3 }
    return (order[a.role] ?? 3) - (order[b.role] ?? 3)
  })

  return (
    <div className="space-y-6">
      {/* Family header card */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <CardTitle className="text-base">Family Details</CardTitle>
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-blue-700 hover:bg-blue-800"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {family.name} family?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the family and all {family.members?.length ?? 0} member
                        {(family.members?.length ?? 0) === 1 ? '' : 's'}. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete family
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-5">
              <PhotoUpload
                bucket="family-photos"
                entityId={family.id}
                currentUrl={form.photo_url || null}
                onUpload={(url) => update('photo_url', url)}
                onRemove={() => update('photo_url', '')}
                size="lg"
                shape="rounded"
              />
              <div className="space-y-2">
                <Label>Family Name</Label>
                <Input value={form.name} onChange={(e) => update('name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Street Address</Label>
                <Input
                  placeholder="123 Main St"
                  value={form.mailing_address}
                  onChange={(e) => update('mailing_address', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1 space-y-2">
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => update('city', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    maxLength={2}
                    value={form.state}
                    onChange={(e) => update('state', e.target.value.toUpperCase())}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ZIP</Label>
                  <Input value={form.zip} onChange={(e) => update('zip', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => update('notes', e.target.value)}
                />
              </div>
              <div className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50/80 p-3">
                <Checkbox
                  id="different_last_names"
                  checked={form.different_last_names}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      different_last_names: checked === true,
                    }))
                  }
                  className="mt-0.5"
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="different_last_names" className="font-normal">
                    Different last names
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Show full names for heads of household and spouses in the directory and on cards
                    (e.g. &quot;Gene Wirth and Mary Degloyer&quot;). Children still list first names
                    only.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-6">
              {family.photo_url && (
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  <Image
                    src={family.photo_url}
                    alt={`${family.name} family`}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-slate-800">{family.name} Family</h2>
                {sortedMembers.length > 0 && (
                  <p className="text-sm text-blue-800/90">
                    {formatMemberDisplayLine(
                      sortedMembers,
                      family.different_last_names ?? false
                    )}
                  </p>
                )}
                {fullAddress && (
                  <p className="flex items-start gap-1.5 text-sm text-slate-500">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    {fullAddress}
                  </p>
                )}
                {family.notes && (
                  <p className="mt-2 text-sm text-slate-600">{family.notes}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Members</h2>
          <Button asChild size="sm" variant="outline">
            <Link href={`/families/${family.id}/members/new`}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Member
            </Link>
          </Button>
        </div>

        {sortedMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-12 text-center">
            <p className="mb-4 text-sm text-slate-500">No members yet</p>
            <Button asChild size="sm" className="bg-blue-700 hover:bg-blue-800">
              <Link href={`/families/${family.id}/members/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Add first member
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {sortedMembers.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                familyId={family.id}
                onUpdate={(updated) => {
                  setFamily((prev) => ({
                    ...prev,
                    members: prev.members?.map((m) => (m.id === updated.id ? updated : m)),
                  }))
                }}
                onDelete={(id) => {
                  setFamily((prev) => ({
                    ...prev,
                    members: prev.members?.filter((m) => m.id !== id),
                  }))
                }}
              />
            ))}
          </div>
        )}
      </div>

      <Separator />

      <div className="flex justify-end">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete entire family
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {family.name} family?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove the family and all{' '}
                {family.members?.length ?? 0} member
                {(family.members?.length ?? 0) === 1 ? '' : 's'} from the directory. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Yes, delete family
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
