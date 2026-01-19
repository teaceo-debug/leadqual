'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  LayoutDashboard,
  Users,
  Target,
  FileText,
  Webhook,
  UserCog,
  Settings,
  Download,
  Moon,
  Sun,
  Plus,
} from 'lucide-react'
import { useTheme } from 'next-themes'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { setTheme, theme } = useTheme()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const runCommand = useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => runCommand(() => router.push('/dashboard'))}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Go to Dashboard
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push('/dashboard/leads'))}
          >
            <Users className="mr-2 h-4 w-4" />
            Go to Leads
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push('/dashboard/icp'))}
          >
            <Target className="mr-2 h-4 w-4" />
            Go to ICP Settings
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push('/dashboard/form-settings'))}
          >
            <FileText className="mr-2 h-4 w-4" />
            Go to Form Settings
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push('/dashboard/webhooks'))}
          >
            <Webhook className="mr-2 h-4 w-4" />
            Go to Webhooks
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push('/dashboard/team'))}
          >
            <UserCog className="mr-2 h-4 w-4" />
            Go to Team
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push('/dashboard/settings'))}
          >
            <Settings className="mr-2 h-4 w-4" />
            Go to Settings
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => runCommand(() => {
              // Trigger CSV export
              window.location.href = '/api/leads/export'
            })}
          >
            <Download className="mr-2 h-4 w-4" />
            Export leads to CSV
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => {
              // Open test lead submission
              window.open('/form/test', '_blank')
            })}
          >
            <Plus className="mr-2 h-4 w-4" />
            Submit test lead
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Theme">
          <CommandItem
            onSelect={() => runCommand(() => setTheme('light'))}
          >
            <Sun className="mr-2 h-4 w-4" />
            Switch to light mode
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => setTheme('dark'))}
          >
            <Moon className="mr-2 h-4 w-4" />
            Switch to dark mode
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
