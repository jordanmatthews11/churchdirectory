'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createFamily } from '@/lib/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PhotoUpload } from '@/components/photo-upload'
import { v4 as uuidv4 } from 'uuid'

export default function NewFamilyPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const familyId = uuidv4()

  const [form, setForm] = useState({
    name: '',
    mailing_address: '',
    city: '',
    state: '',
    zip: '',
    photo_url: '',
    notes: '',
  })

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Family name is required')
      return
    }
    setSaving(true)
    try {
      const family = await createFamily({
        name: form.name.trim(),
        mailing_address: form.mailing_address || null,
        city: form.city || null,
        state: form.state || null,
        zip: form.zip || null,
        photo_url: form.photo_url || null,
        notes: form.notes || null,
      })
      toast.success(`${family.name} family added`)
      router.push(`/families/${family.id}`)
    } catch {
      toast.error('Failed to create family')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Add Family</h1>
          <p className="text-sm text-slate-500">Create a new family profile</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Family Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Family Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Smith"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                required
              />
              <p className="text-xs text-slate-400">
                Enter the family last name. It will display as &quot;Smith Family&quot;.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Family Photo</Label>
              <PhotoUpload
                bucket="family-photos"
                entityId={familyId}
                currentUrl={form.photo_url || null}
                onUpload={(url) => update('photo_url', url)}
                onRemove={() => update('photo_url', '')}
                size="lg"
                shape="rounded"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mailing_address">Street Address</Label>
              <Input
                id="mailing_address"
                placeholder="123 Main St"
                value={form.mailing_address}
                onChange={(e) => update('mailing_address', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1 space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Springfield"
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="IL"
                  maxLength={2}
                  value={form.state}
                  onChange={(e) => update('state', e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP</Label>
                <Input
                  id="zip"
                  placeholder="62701"
                  value={form.zip}
                  onChange={(e) => update('zip', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any notes about this family..."
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" asChild className="flex-1">
            <Link href="/">Cancel</Link>
          </Button>
          <Button type="submit" className="flex-1 bg-blue-700 hover:bg-blue-800" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Family
          </Button>
        </div>
      </form>
    </div>
  )
}
