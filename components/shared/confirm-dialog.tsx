'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  typeToConfirm?: string
  variant?: 'default' | 'destructive'
  onConfirm: () => void | Promise<void>
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  typeToConfirm,
  variant = 'default',
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  const [confirmValue, setConfirmValue] = useState('')
  const isValid = !typeToConfirm || confirmValue === typeToConfirm

  const handleConfirm = async () => {
    if (!isValid) return
    await onConfirm()
    setConfirmValue('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {typeToConfirm && (
          <div className="space-y-2">
            <Label htmlFor="confirm">
              Type <span className="font-mono font-semibold">{typeToConfirm}</span> to confirm
            </Label>
            <Input
              id="confirm"
              value={confirmValue}
              onChange={(e) => setConfirmValue(e.target.value)}
              placeholder={typeToConfirm}
            />
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={!isValid || loading}
          >
            {loading ? 'Loading...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
