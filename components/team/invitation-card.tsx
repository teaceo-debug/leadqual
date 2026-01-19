'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatRelativeDate } from '@/lib/utils'
import { Clock, X } from 'lucide-react'

interface Invitation {
  id: string
  email: string
  role: 'admin' | 'manager' | 'viewer'
  created_at: string
  expires_at: string
}

interface InvitationCardProps {
  invitation: Invitation
  onCancel: (id: string) => void
  canManage: boolean
}

export function InvitationCard({
  invitation,
  onCancel,
  canManage,
}: InvitationCardProps) {
  const [cancelling, setCancelling] = useState(false)

  const handleCancel = async () => {
    setCancelling(true)
    await onCancel(invitation.id)
    setCancelling(false)
  }

  const isExpired = new Date(invitation.expires_at) < new Date()

  return (
    <Card className={isExpired ? 'opacity-50' : ''}>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-muted">
              {invitation.email[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{invitation.email}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              {isExpired ? (
                <span className="text-destructive">Expired</span>
              ) : (
                <span>Invited {formatRelativeDate(invitation.created_at)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline">
            {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
          </Badge>
          <Badge variant="secondary">Pending</Badge>

          {canManage && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={handleCancel}
              disabled={cancelling}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
