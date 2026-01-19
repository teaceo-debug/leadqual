'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react'
import type { ICPGenerationResult, CustomerRecord } from '@/lib/icp-generator'

interface CSVUploaderProps {
  onGenerated: (result: ICPGenerationResult & { generation_id?: string }) => void
  loading: boolean
  setLoading: (loading: boolean) => void
}

interface ParsedCSV {
  headers: string[]
  rows: string[][]
  records: CustomerRecord[]
}

const REQUIRED_FIELDS = ['company_size', 'industry', 'job_title', 'budget_range', 'timeline']

const FIELD_LABELS: Record<string, string> = {
  email: 'Email',
  company_name: 'Company',
  company_size: 'Company Size',
  industry: 'Industry',
  job_title: 'Job Title',
  budget_range: 'Budget',
  timeline: 'Timeline',
}

export function CSVUploader({
  onGenerated,
  loading,
  setLoading,
}: CSVUploaderProps) {
  const [error, setError] = useState<string | null>(null)
  const [parsedCSV, setParsedCSV] = useState<ParsedCSV | null>(null)
  const [progress, setProgress] = useState('')

  const normalizeHeader = (header: string): string => {
    const normalized = header.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')

    const mappings: Record<string, string> = {
      email: 'email',
      email_address: 'email',
      company: 'company_name',
      company_name: 'company_name',
      organization: 'company_name',
      size: 'company_size',
      company_size: 'company_size',
      employees: 'company_size',
      employee_count: 'company_size',
      industry: 'industry',
      sector: 'industry',
      vertical: 'industry',
      title: 'job_title',
      job_title: 'job_title',
      role: 'job_title',
      position: 'job_title',
      budget: 'budget_range',
      budget_range: 'budget_range',
      budget_amount: 'budget_range',
      timeline: 'timeline',
      timeframe: 'timeline',
      purchase_timeline: 'timeline',
    }

    return mappings[normalized] || normalized
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null)
    setParsedCSV(null)

    if (acceptedFiles.length === 0) {
      setError('Please upload a CSV file')
      return
    }

    const file = acceptedFiles[0]

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    Papa.parse(file, {
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`CSV parsing error: ${results.errors[0].message}`)
          return
        }

        const data = results.data as string[][]
        if (data.length < 2) {
          setError('CSV must have at least a header row and one data row')
          return
        }

        const headers = data[0].map(normalizeHeader)
        const rows = data.slice(1).filter((row) => row.some((cell) => cell?.trim()))

        if (rows.length < 5) {
          setError('At least 5 customer records are required for pattern analysis')
          return
        }

        // Convert to records
        const records: CustomerRecord[] = rows.map((row) => {
          const record: CustomerRecord = {}
          headers.forEach((header, index) => {
            if (row[index]?.trim()) {
              record[header] = row[index].trim()
            }
          })
          return record
        })

        setParsedCSV({
          headers,
          rows,
          records,
        })
      },
      error: (error) => {
        setError(`Failed to parse CSV: ${error.message}`)
      },
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxFiles: 1,
    disabled: loading,
  })

  const handleAnalyze = async () => {
    if (!parsedCSV) return

    setError(null)
    setLoading(true)
    setProgress('Analyzing customer patterns...')

    try {
      const progressMessages = [
        'Calculating frequency distributions...',
        'Identifying top segments...',
        'Generating ICP recommendations...',
      ]

      let messageIndex = 0
      const progressInterval = setInterval(() => {
        if (messageIndex < progressMessages.length) {
          setProgress(progressMessages[messageIndex])
          messageIndex++
        }
      }, 1500)

      const response = await fetch('/api/icp/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'csv',
          customers: parsedCSV.records,
        }),
      })

      clearInterval(progressInterval)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze CSV')
      }

      onGenerated(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze customer data')
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  const handleClear = () => {
    setParsedCSV(null)
    setError(null)
  }

  const detectedFields = parsedCSV
    ? REQUIRED_FIELDS.filter((f) => parsedCSV.headers.includes(f))
    : []

  const missingFields = parsedCSV
    ? REQUIRED_FIELDS.filter((f) => !parsedCSV.headers.includes(f))
    : []

  return (
    <div className="space-y-6">
      {!parsedCSV && (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
            ${loading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">
                {isDragActive ? 'Drop your CSV file here' : 'Drag & drop your customer CSV'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse (max 10MB)
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {parsedCSV && !loading && (
        <div className="space-y-4">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{parsedCSV.rows.length} records loaded</p>
                    <p className="text-sm text-muted-foreground">
                      {parsedCSV.headers.length} columns detected
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClear}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2">Detected fields:</p>
                  <div className="flex flex-wrap gap-2">
                    {detectedFields.map((field) => (
                      <Badge key={field} variant="default" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {FIELD_LABELS[field] || field}
                      </Badge>
                    ))}
                    {missingFields.map((field) => (
                      <Badge key={field} variant="secondary" className="gap-1 opacity-50">
                        {FIELD_LABELS[field] || field}
                      </Badge>
                    ))}
                  </div>
                </div>

                {missingFields.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Missing fields will be weighted lower in the analysis.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  {parsedCSV.headers.slice(0, 5).map((header, i) => (
                    <TableHead key={i} className="text-xs">
                      {FIELD_LABELS[header] || header}
                    </TableHead>
                  ))}
                  {parsedCSV.headers.length > 5 && (
                    <TableHead className="text-xs text-muted-foreground">
                      +{parsedCSV.headers.length - 5} more
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedCSV.rows.slice(0, 5).map((row, i) => (
                  <TableRow key={i}>
                    {row.slice(0, 5).map((cell, j) => (
                      <TableCell key={j} className="text-xs truncate max-w-[150px]">
                        {cell || '-'}
                      </TableCell>
                    ))}
                    {parsedCSV.headers.length > 5 && (
                      <TableCell className="text-xs text-muted-foreground">...</TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {parsedCSV.rows.length > 5 && (
              <div className="px-4 py-2 bg-muted/50 text-xs text-muted-foreground">
                Showing 5 of {parsedCSV.rows.length} rows
              </div>
            )}
          </div>

          <Button onClick={handleAnalyze} className="w-full" disabled={loading}>
            Analyze Patterns
          </Button>
        </div>
      )}

      {loading && (
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <div className="relative">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
              </div>
              <div>
                <p className="font-medium">{progress}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Analyzing {parsedCSV?.rows.length} customer records...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!parsedCSV && !loading && !error && (
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <h4 className="font-medium text-sm mb-2">Expected CSV format</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Your CSV should include columns like:
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(FIELD_LABELS).map(([key, label]) => (
                <Badge key={key} variant="outline" className="text-xs">
                  {label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
