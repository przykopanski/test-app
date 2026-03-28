"use client"

import * as React from "react"
import { Loader2, Plus, Phone, Monitor, MapPin } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { apiFetch } from "@/lib/auth"
import type { WorkType } from "@/lib/time-entries"
import { WORK_TYPE_LABELS } from "@/lib/time-entries"
import type { OpenTicketItem } from "@/lib/dashboard"

interface AddTimeEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prefillStart?: string
  prefillEnd?: string
  openTickets: OpenTicketItem[]
  onCreated?: () => void
}

const WORK_TYPE_ICONS: Record<WorkType, React.ReactNode> = {
  phone: <Phone className="h-4 w-4" />,
  remote: <Monitor className="h-4 w-4" />,
  onsite: <MapPin className="h-4 w-4" />,
}

function toTimeInputValue(dateStr: string): string {
  const d = new Date(dateStr)
  const h = String(d.getHours()).padStart(2, "0")
  const m = String(d.getMinutes()).padStart(2, "0")
  return `${h}:${m}`
}

export function AddTimeEntryDialog({
  open,
  onOpenChange,
  prefillStart,
  prefillEnd,
  openTickets,
  onCreated,
}: AddTimeEntryDialogProps) {
  const [ticketId, setTicketId] = React.useState("")
  const [workType, setWorkType] = React.useState<WorkType | "">("")
  const [startTime, setStartTime] = React.useState("")
  const [endTime, setEndTime] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setTicketId("")
      setWorkType("")
      setStartTime(prefillStart ? toTimeInputValue(prefillStart) : "")
      setEndTime(prefillEnd ? toTimeInputValue(prefillEnd) : "")
      setDescription("")
    }
  }, [open, prefillStart, prefillEnd])

  const isDescriptionValid = description.trim().length >= 10
  const isFormValid = ticketId && workType && startTime && endTime && isDescriptionValid

  async function handleCreate() {
    if (!isFormValid) return

    // Build ISO date strings for today with the selected times
    const today = new Date()
    const [startH, startM] = startTime.split(":").map(Number)
    const [endH, endM] = endTime.split(":").map(Number)

    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startH, startM, 0)
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endH, endM, 0)

    if (endDate <= startDate) {
      toast.error("Endzeit muss nach der Startzeit liegen")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await apiFetch("/time-entries/manual", {
        method: "POST",
        body: JSON.stringify({
          ticketId,
          workType,
          startedAt: startDate.toISOString(),
          stoppedAt: endDate.toISOString(),
          description: description.trim(),
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message ?? "Zeiteintrag konnte nicht erstellt werden")
      }

      toast.success("Zeiteintrag nachgetragen")
      onOpenChange(false)
      onCreated?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Erstellen")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Zeiteintrag nachtragen</DialogTitle>
          <DialogDescription>
            {prefillStart && prefillEnd
              ? "Luecke mit einem manuellen Zeiteintrag fuellen."
              : "Einen manuellen Zeiteintrag erstellen."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Ticket selection */}
          <div className="space-y-2">
            <Label htmlFor="entry-ticket">Ticket</Label>
            <Select value={ticketId} onValueChange={setTicketId}>
              <SelectTrigger id="entry-ticket">
                <SelectValue placeholder="Ticket auswaehlen..." />
              </SelectTrigger>
              <SelectContent>
                {openTickets.map((ticket) => (
                  <SelectItem key={ticket.ticketId} value={ticket.ticketId}>
                    #{ticket.ticketNumber} {ticket.title}
                  </SelectItem>
                ))}
                {openTickets.length === 0 && (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Keine offenen Tickets vorhanden
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Work type */}
          <div className="space-y-3">
            <Label>Arbeitstyp</Label>
            <RadioGroup
              value={workType}
              onValueChange={(v) => setWorkType(v as WorkType)}
              className="grid grid-cols-3 gap-3"
            >
              {(["phone", "remote", "onsite"] as const).map((type) => (
                <div key={type}>
                  <RadioGroupItem
                    value={type}
                    id={`add-entry-work-type-${type}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`add-entry-work-type-${type}`}
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

          {/* Time range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry-start">Von</Label>
              <Input
                id="entry-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entry-end">Bis</Label>
              <Input
                id="entry-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="entry-description">
              Beschreibung (min. 10 Zeichen)
            </Label>
            <Textarea
              id="entry-description"
              placeholder="Was wurde in dieser Zeit gearbeitet?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px]"
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
            onClick={handleCreate}
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Eintrag erstellen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
