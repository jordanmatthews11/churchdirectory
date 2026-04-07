'use client'

import { Family, Member } from '@/types'
import { DirectoryCell } from '@/components/directory/directory-cell'

export interface DirectoryGridProps {
  families: (Family & { members?: Member[] })[]
  onlyPageIndex?: number
}

export const DIRECTORY_FAMILIES_PER_PAGE = 16

export function getDirectoryPageCount(familyCount: number) {
  return Math.max(1, Math.ceil(familyCount / DIRECTORY_FAMILIES_PER_PAGE))
}

export function DirectoryGrid({ families, onlyPageIndex }: DirectoryGridProps) {
  const pages: typeof families[] = []

  for (let i = 0; i < families.length; i += DIRECTORY_FAMILIES_PER_PAGE) {
    pages.push(families.slice(i, i + DIRECTORY_FAMILIES_PER_PAGE))
  }

  if (pages.length === 0) pages.push([])

  return (
    <>
      {pages
        .filter((_, pageIndex) => onlyPageIndex === undefined || pageIndex === onlyPageIndex)
        .map((pageFamilies, pageIndex) => {
        const cells = [...pageFamilies]
        while (cells.length < DIRECTORY_FAMILIES_PER_PAGE) {
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
              {cells.slice(0, DIRECTORY_FAMILIES_PER_PAGE).map((family) => (
                <DirectoryCell key={family.id} family={family} />
              ))}
            </div>
          </section>
        )
        })}
    </>
  )
}

