"use client"

import * as React from "react"
import Link from "next/link"
import { Square, Timer, AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { useTimer } from "@/components/timer-context"
import { StopTimerDialog } from "@/components/stop-timer-dialog"
import type { TimeEntry } from "@/lib/time-entries"
import {
  formatElapsedTime,
  WORK_TYPE_LABELS,
  WORK_TYPE_COLORS,
} from "@/lib/time-entries"

function TimerRow({
  timer,
  elapsedSeconds,
  onStop,
}: {
  timer: TimeEntry
  elapsedSeconds: number
  onStop: (timer: TimeEntry) => void
}) {
  const isTicketClosed = timer.ticket.status === "closed"

  return (
    <div
      className={`flex items-center gap-3 border-b px-4 py-2 ${isTicketClosed ? "bg-orange-50 dark:bg-orange-950/30" : "bg-primary/5"}`}
      role="status"
      aria-label={`Aktiver Timer fuer Ticket ${timer.ticket.ticketNumber}`}
    >
      <Timer className="h-4 w-4 flex-shrink-0 text-primary animate-pulse" />

      <div className="flex flex-1 flex-wrap items-center gap-2 text-sm">
        <Link
          href={`/tickets/${timer.ticket.id}`}
          className="font-medium hover:underline truncate max-w-[200px] sm:max-w-[400px]"
        >
          #{timer.ticket.ticketNumber} {timer.ticket.subject}
        </Link>

        <Badge
          variant="outline"
          className={`text-xs ${WORK_TYPE_COLORS[timer.workType]}`}
        >
          {WORK_TYPE_LABELS[timer.workType]}
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
        onClick={() => onStop(timer)}
        aria-label="Timer stoppen"
      >
        <Square className="mr-2 h-3 w-3" />
        <span className="hidden sm:inline">Stoppen</span>
      </Button>
    </div>
  )
}

export function ActiveTimerBar() {
  const { activeTimers, elapsedSecondsMap, isLoadingTimer } = useTimer()
  const [stoppingTimer, setStoppingTimer] = React.useState<TimeEntry | null>(null)

  if (isLoadingTimer || activeTimers.length === 0) return null

  return (
    <>
      {activeTimers.map((timer) => (
        <TimerRow
          key={timer.id}
          timer={timer}
          elapsedSeconds={elapsedSecondsMap[timer.id] ?? 0}
          onStop={setStoppingTimer}
        />
      ))}

      <StopTimerDialog
        timer={stoppingTimer}
        open={!!stoppingTimer}
        onOpenChange={(open) => {
          if (!open) setStoppingTimer(null)
        }}
      />
    </>
  )
}
