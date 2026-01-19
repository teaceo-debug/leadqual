'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, CheckCircle, Users } from 'lucide-react'
import Link from 'next/link'

interface Invitation {
  id: string
  email: string
  role: string
  organization: {
    name: string
  }
  expires_at: string
}

export default function InvitePage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string
  const supabase = createClient()

  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    checkAuth()
    fetchInvitation()
  }, [token])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const fetchInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          id,
          email,
          role,
          expires_at,
          status,
          organization:organizations (name)
        `)
        .eq('token', token)
        .single()

      if (error || !data) {
        setError('Invitation not found or has been revoked')
        return
      }

      if (data.status !== 'pending') {
        setError('This invitation has already been used')
        return
      }

      if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired')
        return
      }

      setInvitation(data as unknown as Invitation)
    } catch (err) {
      setError('Failed to load invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!user || !invitation) return

    // Check if user email matches invitation
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      setError(`This invitation was sent to ${invitation.email}. Please log in with that email address.`)
      return
    }

    setAccepting(true)
    try {
      // Accept the invitation
      const { error: updateError } = await supabase
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id)

      if (updateError) throw updateError

      // Get the organization_id from invitation
      const { data: inviteData } = await supabase
        .from('invitations')
        .select('organization_id')
        .eq('id', invitation.id)
        .single()

      if (!inviteData) throw new Error('Failed to get organization')

      // Add user to organization
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: inviteData.organization_id,
          user_id: user.id,
          role: invitation.role,
        })

      if (memberError) throw memberError

      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err) {
      setError('Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Skeleton className="h-12 w-12 rounded-full mx-auto" />
            <Skeleton className="h-6 w-48 mx-auto mt-4" />
            <Skeleton className="h-4 w-64 mx-auto mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="mt-4">Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login" className="block">
              <Button className="w-full">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <CardTitle className="mt-4">Welcome to the team!</CardTitle>
            <CardDescription>
              You've joined {invitation?.organization.name}. Redirecting to dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="mt-4">Team Invitation</CardTitle>
          <CardDescription>
            You've been invited to join <strong>{invitation?.organization.name}</strong> as a{' '}
            <strong>{invitation?.role}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user ? (
            <>
              <p className="text-sm text-muted-foreground text-center">
                Logged in as {user.email}
              </p>
              <Button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full"
              >
                {accepting ? 'Accepting...' : 'Accept Invitation'}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground text-center">
                Please log in or sign up to accept this invitation.
              </p>
              <div className="flex gap-2">
                <Link href={`/login?redirect=/invite/${token}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    Log In
                  </Button>
                </Link>
                <Link href={`/signup?redirect=/invite/${token}&email=${invitation?.email}`} className="flex-1">
                  <Button className="w-full">Sign Up</Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
