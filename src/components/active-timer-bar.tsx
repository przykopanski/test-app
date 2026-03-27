"use client"

import * as React from "react"
import Link from "next/link"
import { Square, Timer, AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { useTimer } from "@/components/timer-context"
import { StopTimerDialog } from "@/components/stop-timer-dialog"
import {
  formatElapsedTime,
  WORK_TYPE_LABELS,
  WORK_TYPE_COLORS,
} from "@/lib/time-entries"

export function ActiveTimerBar() {
  const { activeTimer, elapsedSeconds, isLoadingTimer } = useTimer()
  const [stopDialogOpen, setStopDialogOpen] = React.useState(false)

  if (isLoadingTimer || !activeTimer) return null

  const isTicketClosed = activeTimer.ticket.status === "closed"

  return (
    <>
      <div
        className={`flex items-center gap-3 border-b px-4 py-2 ${isTicketClosed ? "bg-orange-50 dark:bg-orange-950/30" : "bg-primary/5"}`}
        role="status"
        aria-label="Aktiver Timer"
      >
        <Timer className="h-4 w-4 flex-shrink-0 text-primary animate-pulse" />

        <div className="flex flex-1 flex-wrap items-center gap-2 text-sm">
          <Link
            href={`/tickets/${activeTimer.ticket.id}`}
            className="font-medium hover:underline truncate max-w-[200px] sm:max-w-none"
          >
            #{activeTimer.ticket.ticketNumber} {activeTimer.ticket.subject}
          </Link>

          <Badge
            variant="outline"
            className={`text-xs ${WORK_TYPE_COLORS[activeTimer.workType]}`}
          >
            {WORK_TYPE_LABELS[activeTimer.workType]}
          </Badge>

          <span className="font-mono text-sm font-semibold tabular-nums text-primary">
            {formatElapsedTime(elapsedSeconds)}
          </span>

          {isTicketClosed && (
            <span className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
              <AlertTriangle className="h-3 w-3" />
              <span className="hidden sm:inline">Ticket geschlossen</span>
            </span>
          )}
        </div>

        <Button
          variant="destructive"
          size="sm"
          onClick={() => setStopDialogOpen(true)}
          aria-label="Timer stoppen"
        >
          <Square className="mr-2 h-3 w-3" />
          <span className="hidden sm:inline">Stoppen</span>
        </Button>
      </div>

      <StopTimerDialog
        open={stopDialogOpen}
        onOpenChange={setStopDialogOpen}
      />
    </>
  )
}
