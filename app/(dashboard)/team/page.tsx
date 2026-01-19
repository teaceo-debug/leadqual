'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { MemberCard } from '@/components/team/member-card'
import { InvitationCard } from '@/components/team/invitation-card'
import { InviteDialog } from '@/components/team/invite-dialog'
import { UserPlus, Users, AlertCircle } from 'lucide-react'

interface TeamMember {
  id: string
  user_id: string
  email: string
  full_name: string | null
  role: 'admin' | 'manager' | 'viewer'
  created_at: string
}

interface Invitation {
  id: string
  email: string
  role: 'admin' | 'manager' | 'viewer'
  created_at: string
  expires_at: string
}

export default function TeamPage() {
  const supabase = createClient()

  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<string>('viewer')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchTeam()
    getCurrentUser()
  }, [])

  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
    }
  }

  const fetchTeam = async () => {
    try {
      const response = await fetch('/api/team')
      const data = await response.json()

      if (response.ok) {
        setMembers(data.members)
        setInvitations(data.invitations)
        setCurrentUserRole(data.currentUserRole)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to fetch team')
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async (email: string, role: string) => {
    setSending(true)
    try {
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })

      const data = await response.json()

      if (response.ok) {
        setInvitations([data.invitation, ...invitations])
        setInviteOpen(false)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to send invitation')
    } finally {
      setSending(false)
    }
  }

  const handleRoleChange = async (id: string, role: string) => {
    try {
      const response = await fetch(`/api/team/members/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })

      const data = await response.json()

      if (response.ok) {
        setMembers(members.map((m) => (m.id === id ? { ...m, role: role as TeamMember['role'] } : m)))
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to update role')
    }
  }

  const handleRemove = async (id: string) => {
    try {
      const response = await fetch(`/api/team/members/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setMembers(members.filter((m) => m.id !== id))
      } else {
        const data = await response.json()
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to remove member')
    }
  }

  const handleCancelInvite = async (id: string) => {
    try {
      const response = await fetch(`/api/team/invite/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setInvitations(invitations.filter((i) => i.id !== id))
      } else {
        const data = await response.json()
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to cancel invitation')
    }
  }

  const isAdmin = currentUserRole === 'admin'

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40 mt-1" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-muted-foreground">
            Manage your team members and their permissions
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="ml-auto"
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Team Members */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Members ({members.length})
        </h2>
        {members.length === 0 ? (
          <Card className="p-8">
            <EmptyState
              icon={<Users className="h-12 w-12" />}
              title="No team members"
              description="You're the only member. Invite others to collaborate."
            />
          </Card>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                isCurrentUser={member.user_id === currentUserId}
                currentUserRole={currentUserRole}
                onRoleChange={handleRoleChange}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Pending Invitations ({invitations.length})
          </h2>
          <div className="space-y-2">
            {invitations.map((invitation) => (
              <InvitationCard
                key={invitation.id}
                invitation={invitation}
                onCancel={handleCancelInvite}
                canManage={isAdmin}
              />
            ))}
          </div>
        </div>
      )}

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvite={handleInvite}
        sending={sending}
      />
    </div>
  )
}
