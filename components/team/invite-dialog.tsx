'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface InviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInvite: (email: string, role: string) => void
  sending: boolean
}

const ROLES = [
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full access to all features and settings',
  },
  {
    value: 'manager',
    label: 'Manager',
    description: 'Can manage leads but not team or settings',
  },
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'Read-only access to leads and analytics',
  },
]

export function InviteDialog({
  open,
  onOpenChange,
  onInvite,
  sending,
}: InviteDialogProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('viewer')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onInvite(email, role)
    setEmail('')
    setRole('viewer')
  }

  const isValid = email.includes('@') && role

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <div>
                      <span className="font-medium">{r.label}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {r.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || sending}>
              {sending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
