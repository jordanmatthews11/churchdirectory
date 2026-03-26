'use client'

import { Family, Member } from '@/types'
import { DirectoryCell } from '@/components/directory/directory-cell'

export interface DirectoryGridProps {
  families: (Family & { members?: Member[] })[]
}

const PER_PAGE = 16

export function DirectoryGrid({ families }: DirectoryGridProps) {
  const pages: typeof families[] = []

  for (let i = 0; i < families.length; i += PER_PAGE) {
    pages.push(families.slice(i, i + PER_PAGE))
  }

  if (pages.length === 0) pages.push([])

  return (
    <>
      {pages.map((pageFamilies, pageIndex) => {
        const cells = [...pageFamilies]
        while (cells.length < PER_PAGE) {
          cells.push({
            id: `placeholder-${pageIndex}-${cells.length}`,
            name: '',
            mailing_address: null,
            city: null,
            state: null,
            zip: null,
            photo_url: null,
            notes: null,
            created_at: '',
            members: [],
          })
        }

        return (
          <section key={pageIndex} className="directory-page directory-grid-page break-after-page">
            <div className="directory-grid">
              {cells.slice(0, PER_PAGE).map((family) => (
                <DirectoryCell key={family.id} family={family} />
              ))}
            </div>
          </section>
        )
      })}
    </>
  )
}

