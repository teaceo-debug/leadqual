'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Globe, Loader2, AlertCircle, Building } from 'lucide-react'
import type { ICPGenerationResult } from '@/lib/icp-generator'

interface DomainAnalyzerProps {
  onGenerated: (result: ICPGenerationResult & { generation_id?: string }) => void
  loading: boolean
  setLoading: (loading: boolean) => void
}

export function DomainAnalyzer({
  onGenerated,
  loading,
  setLoading,
}: DomainAnalyzerProps) {
  const [domain, setDomain] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState('')

  const cleanDomain = (input: string): string => {
    return input
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '')
  }

  const isValidDomain = (d: string): boolean => {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/
    return domainRegex.test(cleanDomain(d))
  }

  const handleAnalyze = async () => {
    const cleanedDomain = cleanDomain(domain)

    if (!cleanedDomain) {
      setError('Please enter a domain')
      return
    }

    if (!isValidDomain(cleanedDomain)) {
      setError('Please enter a valid domain (e.g., example.com)')
      return
    }

    setError(null)
    setLoading(true)
    setProgress('Researching your company...')

    try {
      // Simulate progress updates
      const progressMessages = [
        'Analyzing company profile...',
        'Identifying target market...',
        'Generating ICP criteria...',
      ]

      let messageIndex = 0
      const progressInterval = setInterval(() => {
        if (messageIndex < progressMessages.length) {
          setProgress(progressMessages[messageIndex])
          messageIndex++
        }
      }, 2000)

      const response = await fetch('/api/icp/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'domain',
          domain: cleanedDomain,
        }),
      })

      clearInterval(progressInterval)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate ICP')
      }

      onGenerated(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze domain')
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading && domain.trim()) {
      handleAnalyze()
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="domain">Company Domain</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="domain"
              value={domain}
              onChange={(e) => {
                setDomain(e.target.value)
                setError(null)
              }}
              onKeyDown={handleKeyDown}
              placeholder="example.com"
              className="pl-9"
              disabled={loading}
            />
          </div>
          <Button onClick={handleAnalyze} disabled={loading || !domain.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing
              </>
            ) : (
              'Analyze'
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Enter your company domain and we&apos;ll research your business to suggest optimal ICP criteria.
        </p>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <div className="relative">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building className="h-6 w-6 text-primary animate-pulse" />
                </div>
              </div>
              <div>
                <p className="font-medium">{progress}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This may take a few moments...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <h4 className="font-medium text-sm mb-2">How it works</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>1. Enter your company&apos;s domain name</li>
              <li>2. Our AI researches your company and market</li>
              <li>3. Optimal ICP criteria are generated based on your business</li>
              <li>4. Review and apply the suggested criteria</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
