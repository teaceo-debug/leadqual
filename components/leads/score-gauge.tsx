'use client'

import { cn } from '@/lib/utils'

interface ScoreGaugeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function ScoreGauge({ score, size = 'md', showLabel = false }: ScoreGaugeProps) {
  const sizeConfig = {
    sm: { dimension: 32, strokeWidth: 3, fontSize: 'text-xs' },
    md: { dimension: 64, strokeWidth: 4, fontSize: 'text-sm' },
    lg: { dimension: 120, strokeWidth: 6, fontSize: 'text-2xl' },
  }

  const config = sizeConfig[size]
  const radius = (config.dimension - config.strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const offset = circumference - progress

  const getColor = () => {
    if (score >= 80) return 'text-success'
    if (score >= 50) return 'text-warning'
    return 'text-destructive'
  }

  const getLabel = () => {
    if (score >= 80) return 'HOT'
    if (score >= 50) return 'WARM'
    return 'COLD'
  }

  return (
    <div className="flex flex-col items-center gap-1" role="img" aria-label={`Lead score: ${score} out of 100, ${getLabel()}`}>
      <div className="relative" style={{ width: config.dimension, height: config.dimension }}>
        <svg
          className="transform -rotate-90"
          width={config.dimension}
          height={config.dimension}
          aria-hidden="true"
        >
          {/* Background circle */}
          <circle
            cx={config.dimension / 2}
            cy={config.dimension / 2}
            r={radius}
            strokeWidth={config.strokeWidth}
            className="fill-none stroke-muted"
          />
          {/* Progress circle */}
          <circle
            cx={config.dimension / 2}
            cy={config.dimension / 2}
            r={radius}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            className={cn('fill-none stroke-current transition-all duration-500', getColor())}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        {/* Score number */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('font-bold', config.fontSize, getColor())}>
            {score}
          </span>
        </div>
      </div>
      {showLabel && (
        <span className={cn('text-xs font-semibold', getColor())}>
          {getLabel()}
        </span>
      )}
    </div>
  )
}
