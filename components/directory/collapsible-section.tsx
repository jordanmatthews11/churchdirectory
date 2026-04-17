'use client'

import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CollapsibleSectionProps {
  title: string
  description?: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-lg border border-slate-200 bg-white"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {description ? <div className="mt-0.5 text-[11px] text-slate-500">{description}</div> : null}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180'
          )}
        />
      </summary>
      <div className="border-t border-slate-200 px-3 py-3">{children}</div>
    </details>
  )
}
