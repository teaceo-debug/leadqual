'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
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
import { toast } from '@/hooks/use-toast'

interface LeadImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface ParsedCSV {
  headers: string[]
  rows: string[][]
  records: Record<string, string>[]
}

interface ImportResult {
  total: number
  imported: number
  skipped: number
  errors: { email: string; error: string }[]
}

const FIELD_MAPPINGS: Record<string, string> = {
  email: 'email',
  email_address: 'email',
  first_name: 'first_name',
  firstname: 'first_name',
  first: 'first_name',
  last_name: 'last_name',
  lastname: 'last_name',
  last: 'last_name',
  phone: 'phone',
  phone_number: 'phone',
  title: 'job_title',
  job_title: 'job_title',
  role: 'job_title',
  position: 'job_title',
  company: 'company_name',
  company_name: 'company_name',
  organization: 'company_name',
  website: 'company_website',
  company_website: 'company_website',
  size: 'company_size',
  company_size: 'company_size',
  employees: 'company_size',
  industry: 'industry',
  sector: 'industry',
  budget: 'budget_range',
  budget_range: 'budget_range',
  timeline: 'timeline',
  timeframe: 'timeline',
  challenge: 'challenge',
  pain_point: 'challenge',
}

const REQUIRED_FIELDS = ['email']
const OPTIONAL_FIELDS = [
  'first_name',
  'last_name',
  'phone',
  'job_title',
  'company_name',
  'company_website',
  'company_size',
  'industry',
  'budget_range',
  'timeline',
]

export function LeadImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: LeadImportDialogProps) {
  const [parsedCSV, setParsedCSV] = useState<ParsedCSV | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [autoQualify, setAutoQualify] = useState(true)

  const normalizeHeader = (header: string): string => {
    const normalized = header.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')
    return FIELD_MAPPINGS[normalized] || normalized
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null)
    setParsedCSV(null)
    setResult(null)

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

        // Check for required email field
        if (!headers.includes('email')) {
          setError('CSV must include an "email" column')
          return
        }

        if (rows.length === 0) {
          setError('No valid data rows found')
          return
        }

        if (rows.length > 1000) {
          setError('Maximum 1000 leads can be imported at once')
          return
        }

        // Convert to records
        const records = rows.map((row) => {
          const record: Record<string, string> = {}
          headers.forEach((header, index) => {
            if (row[index]?.trim()) {
              record[header] = row[index].trim()
            }
          })
          return record
        })

        setParsedCSV({ headers, rows, records })
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
    disabled: importing,
  })

  const handleImport = async () => {
    if (!parsedCSV) return

    setImporting(true)
    setProgress(10)
    setError(null)

    try {
      setProgress(30)

      const response = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leads: parsedCSV.records,
          skip_duplicates: skipDuplicates,
          auto_qualify: autoQualify,
        }),
      })

      setProgress(80)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Import failed')
      }

      setProgress(100)
      setResult(data.results)

      toast({
        title: 'Import Complete',
        description: data.message,
      })

      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
      toast({
        title: 'Import Failed',
        description: err instanceof Error ? err.message : 'Failed to import leads',
        variant: 'destructive',
      })
    } finally {
      setImporting(false)
    }
  }

  const handleReset = () => {
    setParsedCSV(null)
    setError(null)
    setResult(null)
    setProgress(0)
  }

  const detectedFields = parsedCSV
    ? [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].filter((f) =>
        parsedCSV.headers.includes(f)
      )
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Leads</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import leads into your database.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Result View */}
          {result && (
            <Card>
              <CardContent className="py-6">
                <div className="flex flex-col items-center gap-4 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                  <div>
                    <h3 className="font-semibold text-lg">Import Complete</h3>
                    <p className="text-muted-foreground">
                      {result.imported} of {result.total} leads imported
                    </p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="font-medium text-green-600">
                        {result.imported}
                      </span>{' '}
                      imported
                    </div>
                    <div>
                      <span className="font-medium text-yellow-600">
                        {result.skipped}
                      </span>{' '}
                      skipped
                    </div>
                    {result.errors.length > 0 && (
                      <div>
                        <span className="font-medium text-red-600">
                          {result.errors.length}
                        </span>{' '}
                        errors
                      </div>
                    )}
                  </div>
                  <Button onClick={() => onOpenChange(false)}>Done</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload Zone */}
          {!parsedCSV && !result && (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
                ${importing ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">
                    {isDragActive ? 'Drop your CSV file here' : 'Drag & drop your leads CSV'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    or click to browse (max 1000 leads, 10MB)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <Card className="border-destructive">
              <CardContent className="flex items-center gap-3 py-4">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Preview */}
          {parsedCSV && !result && (
            <div className="space-y-4">
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">{parsedCSV.rows.length} leads ready</p>
                        <p className="text-sm text-muted-foreground">
                          {detectedFields.length} fields detected
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleReset}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {detectedFields.map((field) => (
                      <Badge key={field} variant="default" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {field.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Skip duplicates</Label>
                        <p className="text-xs text-muted-foreground">
                          Skip leads with emails already in your database
                        </p>
                      </div>
                      <Switch
                        checked={skipDuplicates}
                        onCheckedChange={setSkipDuplicates}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto-qualify leads</Label>
                        <p className="text-xs text-muted-foreground">
                          Automatically score and qualify imported leads
                        </p>
                      </div>
                      <Switch checked={autoQualify} onCheckedChange={setAutoQualify} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preview Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {parsedCSV.headers.slice(0, 4).map((header, i) => (
                        <TableHead key={i} className="text-xs">
                          {header.replace(/_/g, ' ')}
                        </TableHead>
                      ))}
                      {parsedCSV.headers.length > 4 && (
                        <TableHead className="text-xs text-muted-foreground">
                          +{parsedCSV.headers.length - 4} more
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedCSV.rows.slice(0, 3).map((row, i) => (
                      <TableRow key={i}>
                        {row.slice(0, 4).map((cell, j) => (
                          <TableCell key={j} className="text-xs truncate max-w-[150px]">
                            {cell || '-'}
                          </TableCell>
                        ))}
                        {parsedCSV.headers.length > 4 && (
                          <TableCell className="text-xs text-muted-foreground">
                            ...
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedCSV.rows.length > 3 && (
                  <div className="px-4 py-2 bg-muted/50 text-xs text-muted-foreground">
                    Showing 3 of {parsedCSV.rows.length} rows
                  </div>
                )}
              </div>

              {/* Import Button */}
              {importing ? (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-center text-muted-foreground">
                    Importing leads...
                  </p>
                </div>
              ) : (
                <Button onClick={handleImport} className="w-full">
                  Import {parsedCSV.rows.length} Leads
                </Button>
              )}
            </div>
          )}

          {/* Help Text */}
          {!parsedCSV && !result && (
            <Card className="bg-muted/50">
              <CardContent className="py-4">
                <h4 className="font-medium text-sm mb-2">CSV Format</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Your CSV should include an email column and optionally:
                </p>
                <div className="flex flex-wrap gap-2">
                  {['email *', ...OPTIONAL_FIELDS].map((field) => (
                    <Badge key={field} variant="outline" className="text-xs">
                      {field.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
