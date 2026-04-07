'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { DirectorySettings, LeadershipData, parseLeadershipData } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

function namesFromMultiline(text: string) {
  return text.split('\n').map((l) => l.trim()).filter(Boolean)
}

export interface LeadershipEditorProps {
  settings: DirectorySettings
  onSave: (values: Partial<Pick<DirectorySettings, 'leadership_data'>>) => Promise<void>
}

export function LeadershipEditor({ settings, onSave }: LeadershipEditorProps) {
  const [leadershipForm, setLeadershipForm] = useState(() => {
    const d = parseLeadershipData(settings.leadership_data)
    return {
      eldersText: d.elders.join('\n'),
      deaconsText: d.deacons.join('\n'),
      deaconessesText: d.deaconesses.join('\n'),
      staff: d.staff.length > 0 ? d.staff.map((s) => ({ ...s })) : [{ name: '', title: '', email: '' }],
    }
  })
  const [savingLeadership, setSavingLeadership] = useState(false)

  useEffect(() => {
    const d = parseLeadershipData(settings.leadership_data)
    setLeadershipForm({
      eldersText: d.elders.join('\n'),
      deaconsText: d.deacons.join('\n'),
      deaconessesText: d.deaconesses.join('\n'),
      staff: d.staff.length > 0 ? d.staff.map((s) => ({ ...s })) : [{ name: '', title: '', email: '' }],
    })
  }, [settings.id, settings.leadership_data])

  async function handleSaveLeadership() {
    const leadership_data: LeadershipData = {
      elders: namesFromMultiline(leadershipForm.eldersText),
      deacons: namesFromMultiline(leadershipForm.deaconsText),
      deaconesses: namesFromMultiline(leadershipForm.deaconessesText),
      staff: leadershipForm.staff
        .map((s) => ({
          name: s.name.trim(),
          title: s.title.trim(),
          email: s.email.trim(),
        }))
        .filter((s) => s.name || s.title || s.email),
    }
    setSavingLeadership(true)
    try {
      await onSave({ leadership_data })
      toast.success('Leadership page saved')
    } catch {
      toast.error('Failed to save leadership data')
    } finally {
      setSavingLeadership(false)
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        One name per line for Elders, Deacons, and Deaconesses. In print, each staff line appears as:{' '}
        <strong>Name</strong>, Title | email.
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800">Elders</label>
          <Textarea
            value={leadershipForm.eldersText}
            rows={12}
            className="min-h-[200px] font-mono text-sm"
            onChange={(e) => setLeadershipForm((p) => ({ ...p, eldersText: e.target.value }))}
            placeholder={'Dave Abney\nChris Berry'}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800">Deacons</label>
          <Textarea
            value={leadershipForm.deaconsText}
            rows={12}
            className="min-h-[200px] font-mono text-sm"
            onChange={(e) => setLeadershipForm((p) => ({ ...p, deaconsText: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800">Deaconesses</label>
          <Textarea
            value={leadershipForm.deaconessesText}
            rows={12}
            className="min-h-[200px] font-mono text-sm"
            onChange={(e) => setLeadershipForm((p) => ({ ...p, deaconessesText: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-sm font-medium text-slate-800">Staff</label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setLeadershipForm((p) => ({
                ...p,
                staff: [...p.staff, { name: '', title: '', email: '' }],
              }))
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Add row
          </Button>
        </div>

        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          {leadershipForm.staff.length === 0 && (
            <p className="text-sm text-slate-500">No staff rows yet. Click &quot;Add row&quot;.</p>
          )}
          {leadershipForm.staff.map((row, idx) => (
            <div
              key={idx}
              className="grid gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0 md:grid-cols-12 md:items-end"
            >
              <div className="md:col-span-3">
                <Input
                  placeholder="Name"
                  value={row.name}
                  onChange={(e) =>
                    setLeadershipForm((p) => {
                      const staff = [...p.staff]
                      staff[idx] = { ...staff[idx], name: e.target.value }
                      return { ...p, staff }
                    })
                  }
                />
              </div>
              <div className="md:col-span-5">
                <Input
                  placeholder="Title"
                  value={row.title}
                  onChange={(e) =>
                    setLeadershipForm((p) => {
                      const staff = [...p.staff]
                      staff[idx] = { ...staff[idx], title: e.target.value }
                      return { ...p, staff }
                    })
                  }
                />
              </div>
              <div className="md:col-span-3">
                <Input
                  placeholder="Email"
                  value={row.email}
                  onChange={(e) =>
                    setLeadershipForm((p) => {
                      const staff = [...p.staff]
                      staff[idx] = { ...staff[idx], email: e.target.value }
                      return { ...p, staff }
                    })
                  }
                />
              </div>
              <div className="flex items-center gap-1 md:col-span-1 md:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  disabled={idx === 0}
                  onClick={() =>
                    setLeadershipForm((p) => {
                      const staff = [...p.staff]
                      ;[staff[idx - 1], staff[idx]] = [staff[idx], staff[idx - 1]]
                      return { ...p, staff }
                    })
                  }
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  disabled={idx === leadershipForm.staff.length - 1}
                  onClick={() =>
                    setLeadershipForm((p) => {
                      const staff = [...p.staff]
                      ;[staff[idx], staff[idx + 1]] = [staff[idx + 1], staff[idx]]
                      return { ...p, staff }
                    })
                  }
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() =>
                    setLeadershipForm((p) => ({
                      ...p,
                      staff: p.staff.filter((_, i) => i !== idx),
                    }))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button
        type="button"
        className="bg-[#7A9C49] hover:bg-[#6B8A3D]"
        size="lg"
        onClick={() => void handleSaveLeadership()}
        disabled={savingLeadership}
      >
        <Save className="mr-2 h-4 w-4" /> {savingLeadership ? 'Saving...' : 'Save Leadership & Staff'}
      </Button>
    </div>
  )
}
