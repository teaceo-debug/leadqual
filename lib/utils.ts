import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export function formatAbsoluteDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'MMM d, yyyy \'at\' h:mm a')
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-success'
  if (score >= 50) return 'text-warning'
  return 'text-destructive'
}

export function getLabelColor(label: 'hot' | 'warm' | 'cold'): string {
  switch (label) {
    case 'hot':
      return 'bg-success/10 text-success border-success/20'
    case 'warm':
      return 'bg-warning/10 text-warning border-warning/20'
    case 'cold':
      return 'bg-destructive/10 text-destructive border-destructive/20'
  }
}

export function getLabelBgColor(label: 'hot' | 'warm' | 'cold'): string {
  switch (label) {
    case 'hot':
      return 'bg-success'
    case 'warm':
      return 'bg-warning'
    case 'cold':
      return 'bg-destructive'
  }
}

export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = 'pk_'
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
