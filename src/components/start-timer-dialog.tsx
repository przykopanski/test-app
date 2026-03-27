"use client"

import * as React from "react"
import { Loader2, Play, Phone, Monitor, MapPin } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import { useTimer } from "@/components/timer-context"
import type { WorkType } from "@/lib/time-entries"
import { startTimer, WORK_TYPE_LABELS } from "@/lib/time-entries"

interface StartTimerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticketId: string
  ticketSubject: string
}

const WORK_TYPE_ICONS: Record<WorkType, React.ReactNode> = {
  phone: <Phone className="h-4 w-4" />,
  remote: <Monitor className="h-4 w-4" />,
  onsite: <MapPin className="h-4 w-4" />,
}

export function StartTimerDialog({
  open,
  onOpenChange,
  ticketId,
  ticketSubject,
}: StartTimerDialogProps) {
  const { hasActiveTimerForTicket, addActiveTimer } = useTimer()
  const [workType, setWorkType] = React.useState<WorkType | "">("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Reset on open
  React.useEffect(() => {
    if (open) {
      setWorkType("")
    }
  }, [open])

  async function handleStart() {
    if (!workType) return

    setIsSubmitting(true)
    try {
      const entry = await startTimer(ticketId, workType)
      addActiveTimer(entry)
      toast.success("Timer gestartet")
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Timer konnte nicht gestartet werden")
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasTimerOnThisTicket = hasActiveTimerForTicket(ticketId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Timer starten</DialogTitle>
          <DialogDescription>
            Timer fuer Ticket &quot;{ticketSubject}&quot; starten.
          </DialogDescription>
        </DialogHeader>

        {hasTimerOnThisTicket ? (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-800 dark:bg-orange-950">
            <p className="font-medium text-orange-700 dark:text-orange-300">
              Sie haben bereits einen aktiven Timer auf diesem Ticket.
            </p>
            <p className="mt-1 text-orange-600 dark:text-orange-400">
              Bitte stoppen Sie den laufenden Timer fuer dieses Ticket, bevor Sie einen neuen starten.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-3">
              <Label>Arbeitstyp (Pflichtfeld)</Label>
              <RadioGroup
                value={workType}
                onValueChange={(v) => setWorkType(v as WorkType)}
                className="grid grid-cols-3 gap-3"
              >
                {(["phone", "remote", "onsite"] as const).map((type) => (
                  <div key={type}>
                    <RadioGroupItem
                      value={type}
                      id={`work-type-${type}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`work-type-${type}`}
                      className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      {WORK_TYPE_ICONS[type]}
                      <span className="text-xs font-medium">
                        {WORK_TYPE_LABELS[type]}
                      </span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          {!hasTimerOnThisTicket && (
            <Button
              onClick={handleStart}
              disabled={!workType || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Timer starten
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
