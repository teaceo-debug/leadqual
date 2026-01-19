'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { MoreHorizontal, Shield, UserCog, Eye, UserMinus } from 'lucide-react'

interface TeamMember {
  id: string
  user_id: string
  email: string
  full_name: string | null
  role: 'admin' | 'manager' | 'viewer'
  created_at: string
}

interface MemberCardProps {
  member: TeamMember
  isCurrentUser: boolean
  currentUserRole: string
  onRoleChange: (id: string, role: string) => void
  onRemove: (id: string) => void
}

const roleIcons = {
  admin: Shield,
  manager: UserCog,
  viewer: Eye,
}

const roleColors = {
  admin: 'bg-primary/10 text-primary border-primary/20',
  manager: 'bg-warning/10 text-warning border-warning/20',
  viewer: 'bg-muted text-muted-foreground',
}

export function MemberCard({
  member,
  isCurrentUser,
  currentUserRole,
  onRoleChange,
  onRemove,
}: MemberCardProps) {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)

  const RoleIcon = roleIcons[member.role]
  const canManage = currentUserRole === 'admin' && !isCurrentUser

  const getInitials = () => {
    if (member.full_name) {
      return member.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return member.email[0].toUpperCase()
  }

  return (
    <>
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{getInitials()}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">
                  {member.full_name || member.email.split('@')[0]}
                </p>
                {isCurrentUser && (
                  <Badge variant="outline" className="text-xs">
                    You
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{member.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className={roleColors[member.role]}>
              <RoleIcon className="mr-1 h-3 w-3" />
              {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
            </Badge>

            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => onRoleChange(member.id, 'admin')}
                    disabled={member.role === 'admin'}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Make Admin
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onRoleChange(member.id, 'manager')}
                    disabled={member.role === 'manager'}
                  >
                    <UserCog className="mr-2 h-4 w-4" />
                    Make Manager
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onRoleChange(member.id, 'viewer')}
                    disabled={member.role === 'viewer'}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Make Viewer
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowRemoveConfirm(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <UserMinus className="mr-2 h-4 w-4" />
                    Remove from team
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showRemoveConfirm}
        onOpenChange={setShowRemoveConfirm}
        title="Remove Team Member"
        description={`Are you sure you want to remove ${member.full_name || member.email} from the team? They will lose access to all leads and data.`}
        confirmText={member.email}
        onConfirm={() => onRemove(member.id)}
        variant="destructive"
      />
    </>
  )
}
