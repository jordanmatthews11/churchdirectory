'use client'

import { useState } from 'react'
import { UserPlus, Trash2, Loader2, Mail, ShieldCheck } from 'lucide-react'
import { inviteAdmin, removeAdmin } from '@/lib/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

interface AdminUser {
  id: string
  email?: string
  created_at: string
  last_sign_in_at?: string | null
}

interface AdminsManagerProps {
  initialAdmins: AdminUser[]
}

export function AdminsManager({ initialAdmins }: AdminsManagerProps) {
  const [admins, setAdmins] = useState(initialAdmins)
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setInviting(true)
    try {
      await inviteAdmin(email.trim())
      toast.success(`Invite sent to ${email}`)
      setEmail('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  async function handleRemove(id: string, adminEmail: string) {
    try {
      await removeAdmin(id)
      setAdmins((prev) => prev.filter((a) => a.id !== id))
      toast.success(`Removed ${adminEmail}`)
    } catch {
      toast.error('Failed to remove admin')
    }
  }

  return (
    <div className="space-y-6">
      {/* Invite */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4" />
            Invite Admin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="staff@church.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                className="bg-[#7A9C49] hover:bg-[#6B8A3D]"
                disabled={inviting}
              >
                {inviting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Send Invite
              </Button>
            </div>
          </form>
          <p className="mt-2 text-xs text-slate-400">
            They will receive an email to set their password and access the directory.
          </p>
        </CardContent>
      </Card>

      {/* Admin list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Current Admins ({admins.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {admins.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-slate-400">No admins found</p>
          ) : (
            <ul className="divide-y">
              {admins.map((admin, i) => (
                <li key={admin.id} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {admin.email ?? 'Unknown email'}
                    </p>
                    {admin.last_sign_in_at && (
                      <p className="text-xs text-slate-400">
                        Last signed in{' '}
                        {new Date(admin.last_sign_in_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                  {admins.length > 1 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove {admin.email}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will revoke their access to the directory. They can be re-invited later.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemove(admin.id, admin.email ?? '')}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
