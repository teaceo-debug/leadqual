'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DomainAnalyzer } from './domain-analyzer'
import { CSVUploader } from './csv-uploader'
import { GeneratedPreview } from './generated-preview'
import { Globe, FileSpreadsheet, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ICPGenerationResult } from '@/lib/icp-generator'

interface ICPGeneratorProps {
  onComplete: () => void
}

type GenerationMode = 'domain' | 'csv'

export function ICPGenerator({ onComplete }: ICPGeneratorProps) {
  const [activeTab, setActiveTab] = useState<GenerationMode>('domain')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<(ICPGenerationResult & { generation_id?: string }) | null>(
    null
  )

  const handleGenerated = (generationResult: ICPGenerationResult & { generation_id?: string }) => {
    setResult(generationResult)
  }

  const handleApply = () => {
    // Called when GeneratedPreview successfully applies the criteria
    onComplete()
  }

  const handleRegenerate = () => {
    setResult(null)
  }

  const handleBack = () => {
    setResult(null)
  }

  if (result) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={handleBack} className="-ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Generator
        </Button>
        <GeneratedPreview
          result={result}
          onApply={handleApply}
          onRegenerate={handleRegenerate}
          applying={false}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Auto-Generate ICP</h2>
        <p className="text-sm text-muted-foreground">
          Let AI analyze your company or customer data to generate optimal ICP criteria.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as GenerationMode)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="domain" disabled={loading}>
            <Globe className="mr-2 h-4 w-4" />
            Analyze Domain
          </TabsTrigger>
          <TabsTrigger value="csv" disabled={loading}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Upload Customers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="domain" className="mt-6">
          <DomainAnalyzer
            onGenerated={handleGenerated}
            loading={loading}
            setLoading={setLoading}
          />
        </TabsContent>

        <TabsContent value="csv" className="mt-6">
          <CSVUploader
            onGenerated={handleGenerated}
            loading={loading}
            setLoading={setLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
