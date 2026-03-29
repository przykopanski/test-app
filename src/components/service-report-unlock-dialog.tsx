"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { unlockServiceReport } from "@/lib/service-reports"

interface ServiceReportUnlockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticketId: string
  onUnlocked: () => void
}

export function ServiceReportUnlockDialog({
  open,
  onOpenChange,
  ticketId,
  onUnlocked,
}: ServiceReportUnlockDialogProps) {
  const [reason, setReason] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setReason("")
    }
  }, [open])

  async function handleUnlock() {
    setIsSubmitting(true)
    try {
      await unlockServiceReport(ticketId, reason.trim() || undefined)
      toast.success("Einsatzbericht entsperrt")
      onOpenChange(false)
      onUnlocked()
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Bericht konnte nicht entsperrt werden"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Bericht entsperren</DialogTitle>
          <DialogDescription>
            Der finalisierte Einsatzbericht wird wieder in den Entwurfs-Status
            zurueckgesetzt. Diese Aktion wird im Audit-Log protokolliert.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="unlock-reason">Begruendung (optional)</Label>
          <Textarea
            id="unlock-reason"
            placeholder="Warum wird der Bericht entsperrt?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[80px]"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleUnlock} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Entsperren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
