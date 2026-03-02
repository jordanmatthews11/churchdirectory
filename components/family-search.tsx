'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useTransition, useState } from 'react'

export function FamilySearch({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const [value, setValue] = useState(defaultValue ?? '')

  function handleChange(val: string) {
    setValue(val)
    startTransition(() => {
      const params = new URLSearchParams()
      if (val) params.set('q', val)
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        placeholder="Search families..."
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="pl-9 pr-8"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
          onClick={() => handleChange('')}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}
