'use client'

import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export function Logo({ className, size = 'md', showText = true }: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: 'text-lg' },
    md: { icon: 32, text: 'text-xl' },
    lg: { icon: 48, text: 'text-3xl' },
  }

  const { icon, text } = sizes[size]

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Background rounded square with gradient */}
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          <linearGradient id="logoGradientHover" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
        </defs>

        {/* Main background */}
        <rect
          x="2"
          y="2"
          width="44"
          height="44"
          rx="12"
          fill="url(#logoGradient)"
        />

        {/* Subtle inner glow */}
        <rect
          x="4"
          y="4"
          width="40"
          height="40"
          rx="10"
          fill="none"
          stroke="white"
          strokeOpacity="0.2"
          strokeWidth="1"
        />

        {/* L letter */}
        <path
          d="M14 12V32H22V28H18V12H14Z"
          fill="white"
        />

        {/* S letter stylized as a signal/score indicator */}
        <path
          d="M26 12C26 12 24 12 24 14V16C24 18 26 18 28 18H30C32 18 34 18 34 20V22C34 24 32 24 30 24H26"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Score indicator dots - representing lead scoring */}
        <circle cx="15" cy="38" r="2.5" fill="white" fillOpacity="0.5" />
        <circle cx="24" cy="38" r="2.5" fill="white" fillOpacity="0.7" />
        <circle cx="33" cy="38" r="2.5" fill="white" />

        {/* Small upward arrow indicating growth/priority */}
        <path
          d="M36 14L38 11L40 14"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M38 11V17"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      {showText && (
        <span className={cn('font-bold tracking-tight', text)}>
          LeadScores
        </span>
      )}
    </div>
  )
}

// Icon-only version for favicons, small spaces
export function LogoIcon({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logoIconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
      </defs>

      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        rx="12"
        fill="url(#logoIconGradient)"
      />

      <rect
        x="4"
        y="4"
        width="40"
        height="40"
        rx="10"
        fill="none"
        stroke="white"
        strokeOpacity="0.2"
        strokeWidth="1"
      />

      <path
        d="M14 12V32H22V28H18V12H14Z"
        fill="white"
      />

      <path
        d="M26 12C26 12 24 12 24 14V16C24 18 26 18 28 18H30C32 18 34 18 34 20V22C34 24 32 24 30 24H26"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      <circle cx="15" cy="38" r="2.5" fill="white" fillOpacity="0.5" />
      <circle cx="24" cy="38" r="2.5" fill="white" fillOpacity="0.7" />
      <circle cx="33" cy="38" r="2.5" fill="white" />

      <path
        d="M36 14L38 11L40 14"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M38 11V17"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

// Alternative minimalist version
export function LogoMinimal({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logoMinimalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
      </defs>

      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        rx="12"
        fill="url(#logoMinimalGradient)"
      />

      {/* Stylized LS as connected letters */}
      <path
        d="M12 10V34H20V30H16V10H12Z"
        fill="white"
      />

      {/* S with score bar underneath */}
      <path
        d="M36 14H28C26 14 24 16 24 18C24 20 26 22 28 22H32C34 22 36 24 36 26C36 28 34 30 32 30H24"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Score bar at bottom */}
      <rect x="12" y="38" width="24" height="3" rx="1.5" fill="white" fillOpacity="0.3" />
      <rect x="12" y="38" width="18" height="3" rx="1.5" fill="white" fillOpacity="0.6" />
      <rect x="12" y="38" width="10" height="3" rx="1.5" fill="white" />
    </svg>
  )
}
