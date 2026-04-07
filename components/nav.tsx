'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Award, BookOpen, Users, Upload, Settings, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/leadership', label: 'Leadership', icon: Award },
  { href: '/', label: 'Families', icon: Users },
  { href: '/directory', label: 'Directory', icon: BookOpen },
  { href: '/import', label: 'Import Family Names', icon: Upload },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
    toast.success('Signed out')
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-semibold text-slate-800">
            <img src="/ccc-logo.png" alt="CCC Logo" className="h-8 w-8 object-contain" />
            <span className="text-lg">Christ Community Church Directory</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  pathname === href
                    ? 'bg-[#F4F4EC] text-[#7A9C49]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="ml-2 gap-2 text-slate-600"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </nav>

          {/* Mobile menu toggle */}
          <button
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="border-t bg-white px-4 py-3 md:hidden">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                pathname === href
                  ? 'bg-[#F4F4EC] text-[#7A9C49]'
                  : 'text-slate-600'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </header>
  )
}
