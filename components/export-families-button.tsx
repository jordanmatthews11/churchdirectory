'use client'

import { Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { Family } from '@/types'

const ROLE_ORDER: Record<string, number> = { adult: 0, child: 1, other: 2 }

const HEADERS: string[] = [
  'Family ID',
  'Member ID',
  'Family Name',
  'First Name',
  'Last Name',
  'Role',
  'Street Address',
  'City',
  'State',
  'ZIP',
  'Phone',
  'Email',
  'Member Since',
  'Bio',
]

interface Props {
  families: Family[]
}

export function ExportFamiliesButton({ families }: Props) {
  function handleExport() {
    const aoa: string[][] = [[...HEADERS]]

    const sorted = [...families].sort((a, b) => a.name.localeCompare(b.name))

    for (const family of sorted) {
      const members = [...(family.members ?? [])].sort(
        (a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9)
      )

      const addressRow = [
        family.id,
        '',
        family.name,
        '',
        '',
        '',
        family.mailing_address ?? '',
        family.city ?? '',
        family.state ?? '',
        family.zip ?? '',
        '',
        '',
        '',
        '',
      ]

      if (members.length === 0) {
        aoa.push(addressRow)
      } else {
        for (const m of members) {
          aoa.push([
            family.id,
            m.id,
            family.name,
            m.first_name,
            m.last_name,
            m.role,
            family.mailing_address ?? '',
            family.city ?? '',
            family.state ?? '',
            family.zip ?? '',
            m.phone ?? '',
            m.email ?? '',
            m.member_since ?? '',
            m.bio ?? '',
          ])
        }
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa)

    const colWidths = HEADERS.map((key, colIdx) => {
      const max = Math.max(
        key.length,
        ...aoa.slice(1).map((row) => String(row[colIdx] ?? '').length)
      )
      return { wch: Math.min(max + 2, 40) }
    })
    ws['!cols'] = colWidths

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Families')
    XLSX.writeFile(wb, `church-directory-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={families.length === 0}>
      <Download className="mr-2 h-4 w-4" />
      Export
    </Button>
  )
}
