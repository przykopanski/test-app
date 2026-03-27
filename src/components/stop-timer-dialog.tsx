"use client"

import * as React from "react"
import { Loader2, Square, AlertTriangle } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

import { useTimer } from "@/components/timer-context"
import type { TimeEntry } from "@/lib/time-entries"
import {
  stopTimer,
  formatElapsedTime,
  formatMinutes,
  roundToBillableMinutes,
  WORK_TYPE_LABELS,
  WORK_TYPE_COLORS,
} from "@/lib/time-entries"

interface StopTimerDialogProps {
  timer: TimeEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onStopped?: () => void
}

const EIGHT_HOURS_SECONDS = 8 * 60 * 60
const THIRTY_SECONDS = 30

export function StopTimerDialog({
  timer,
  open,
  onOpenChange,
  onStopped,
}: StopTimerDialogProps) {
  const { elapsedSecondsMap, removeActiveTimer, notifyTimerStopped } = useTimer()
  const [description, setDescription] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Reset on open
  React.useEffect(() => {
    if (open) {
      setDescription("")
    }
  }, [open])

  if (!timer) return null

  const elapsedSeconds = elapsedSecondsMap[timer.id] ?? 0
  const billableMinutes = roundToBillableMinutes(elapsedSeconds)
  const isLongSession = elapsedSeconds > EIGHT_HOURS_SECONDS
  const isShortSession = elapsedSeconds < THIRTY_SECONDS
  const isDescriptionValid = description.trim().length >= 10

  async function handleStop() {
    if (!timer || !isDescriptionValid) return

    setIsSubmitting(true)
    try {
      await stopTimer(timer.id, description.trim())
      removeActiveTimer(timer.id)
      notifyTimerStopped()
      toast.success("Timer gestoppt und Zeiteintrag gespeichert")
      onOpenChange(false)
      onStopped?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Timer konnte nicht gestoppt werden")
    } finally {
      setIsSubmitting(false)
    }
  }

  const startDate = new Date(timer.startedAt)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Timer stoppen</DialogTitle>
          <DialogDescription>
            Timer fuer &quot;{timer.ticket.subject}&quot; stoppen und Zeiteintrag speichern.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Summary */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Arbeitstyp</span>
              <Badge variant="outline" className={WORK_TYPE_COLORS[timer.workType]}>
                {WORK_TYPE_LABELS[timer.workType]}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Gestartet</span>
              <span>
                {startDate.toLocaleString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Laufzeit</span>
              <span className="font-mono font-medium">
                {formatElapsedTime(elapsedSeconds)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Abrechenbar</span>
              <span className="font-medium text-primary">
                {formatMinutes(billableMinutes)}
              </span>
            </div>
          </div>

          {/* Warnings */}
          {isLongSession && (
            <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-600 dark:text-orange-400" />
              <p className="text-sm text-orange-700 dark:text-orange-300">
                Ungewoehnlich lange Sitzung (ueber 8 Stunden). Ist das korrekt?
              </p>
            </div>
          )}

          {isShortSession && (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Sehr kurze Sitzung (unter 30 Sekunden). Minimale Abrechnung: 15 Minuten.
              </p>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="timer-description">
              Beschreibung (Pflichtfeld, min. 10 Zeichen)
            </Label>
            <Textarea
              id="timer-description"
              placeholder="Was haben Sie gemacht?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px]"
              aria-label="Taetigkeitsbeschreibung"
            />
            {description.length > 0 && description.trim().length < 10 && (
              <p className="text-xs text-destructive">
                Noch {10 - description.trim().length} Zeichen erforderlich.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            variant="destructive"
            onClick={handleStop}
            disabled={!isDescriptionValid || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Square className="mr-2 h-4 w-4" />
            )}
            Timer stoppen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
